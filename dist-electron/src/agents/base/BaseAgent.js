"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgent = void 0;
const EventBus_1 = require("../../events/EventBus");
const StorageManager_1 = require("../../storage/StorageManager");
class BaseAgent {
    agentId;
    role;
    status;
    isPaused = false;
    isStopped = false;
    currentTask;
    constructor(agentId, role) {
        this.agentId = agentId;
        this.role = role;
        this.status = {
            agentId,
            role,
            state: 'IDLE',
            progress: 0,
            filesTouchedCount: 0,
            messagesCount: 0,
            executionDurationMs: 0,
        };
        StorageManager_1.storageManager.saveAgentState(this.agentId, this.status);
    }
    getStatus() {
        return { ...this.status };
    }
    async startTask(task) {
        this.currentTask = task;
        this.isPaused = false;
        this.isStopped = false;
        const now = Date.now();
        this.status.currentTaskId = task.id;
        this.status.currentTaskTitle = task.title;
        this.status.startedAt = now;
        this.status.progress = 0;
        this.emitStatus('STARTING', `Assigned task: ${task.title}`);
        EventBus_1.eventBus.publish({
            id: `ev-${Date.now()}`,
            timestamp: Date.now(),
            agentId: this.agentId,
            type: 'AGENT_STARTED',
            payload: {
                taskId: task.id,
                taskTitle: task.title,
            },
        });
        try {
            this.emitStatus('WORKING', `Executing ${task.title}`);
            const result = await this.execute(task);
            if (this.isStopped) {
                this.emitStatus('STOPPED', 'Execution was stopped');
                return;
            }
            this.status.progress = 100;
            this.status.completedAt = Date.now();
            this.status.executionDurationMs = (this.status.executionDurationMs || 0) + (this.status.completedAt - now);
            this.emitStatus('COMPLETED', 'Task finished successfully');
            task.status = 'COMPLETED';
            task.progress = 100;
            task.outputPayload = result;
            task.completedAt = Date.now();
            StorageManager_1.storageManager.saveTask(task);
            EventBus_1.eventBus.publish({
                id: `ev-${Date.now()}`,
                timestamp: Date.now(),
                agentId: this.agentId,
                type: 'TASK_COMPLETED',
                payload: {
                    task,
                    output: result,
                },
            });
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            this.status.error = errorMsg;
            this.emitStatus('FAILED', errorMsg);
            task.status = 'FAILED';
            task.error = errorMsg;
            StorageManager_1.storageManager.saveTask(task);
            EventBus_1.eventBus.publish({
                id: `ev-${Date.now()}`,
                timestamp: Date.now(),
                agentId: this.agentId,
                type: 'TASK_FAILED',
                payload: {
                    task,
                    error: errorMsg,
                },
            });
        }
    }
    async pause() {
        this.isPaused = true;
        this.emitStatus('WAITING', 'Agent paused by user');
    }
    async resume() {
        this.isPaused = false;
        this.emitStatus('WORKING', 'Agent resumed execution');
    }
    async stop(reason = 'Manual stop requested') {
        this.isStopped = true;
        this.emitStatus('STOPPED', reason);
        EventBus_1.eventBus.publish({
            id: `ev-${Date.now()}`,
            timestamp: Date.now(),
            agentId: this.agentId,
            type: 'AGENT_STOPPED',
            payload: { reason },
        });
    }
    async receiveMessage(msg) {
        this.status.messagesCount += 1;
        StorageManager_1.storageManager.saveAgentState(this.agentId, this.status);
        this.emitLog('info', `Received message from [${msg.from}]: ${msg.subject}`);
    }
    sendMessage(to, subject, body) {
        const payload = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            from: this.agentId,
            to,
            subject,
            body,
        };
        this.status.messagesCount += 1;
        StorageManager_1.storageManager.saveAgentState(this.agentId, this.status);
        EventBus_1.eventBus.publish({
            id: `ev-${Date.now()}`,
            timestamp: Date.now(),
            agentId: this.agentId,
            type: 'AGENT_MESSAGE',
            payload,
        });
    }
    emitProgress(progress, currentAction) {
        this.status.progress = Math.min(100, Math.max(0, Math.round(progress)));
        this.status.currentAction = currentAction;
        StorageManager_1.storageManager.saveAgentState(this.agentId, this.status);
        EventBus_1.eventBus.publish({
            id: `ev-${Date.now()}`,
            timestamp: Date.now(),
            agentId: this.agentId,
            type: 'AGENT_PROGRESS',
            payload: { progress: this.status.progress, currentAction },
        });
    }
    emitStatus(newState, reason) {
        const previousState = this.status.state;
        this.status.state = newState;
        StorageManager_1.storageManager.saveAgentState(this.agentId, this.status);
        EventBus_1.eventBus.publish({
            id: `ev-${Date.now()}`,
            timestamp: Date.now(),
            agentId: this.agentId,
            type: 'AGENT_STATUS',
            payload: { previousState, newState, reason },
        });
    }
    emitLog(level, message, details) {
        EventBus_1.eventBus.publish({
            id: `ev-${Date.now()}`,
            timestamp: Date.now(),
            agentId: this.agentId,
            type: 'AGENT_LOG',
            payload: { level, message, details },
        });
    }
    recordFileChange(payload) {
        this.status.filesTouchedCount += 1;
        StorageManager_1.storageManager.saveAgentState(this.agentId, this.status);
        EventBus_1.eventBus.publish({
            id: `ev-${Date.now()}`,
            timestamp: Date.now(),
            agentId: this.agentId,
            type: 'FILE_CHANGED',
            payload,
        });
    }
    async checkPause() {
        while (this.isPaused && !this.isStopped) {
            await new Promise((resolve) => setTimeout(resolve, 300));
        }
        if (this.isStopped) {
            throw new Error('Agent was stopped during execution');
        }
    }
}
exports.BaseAgent = BaseAgent;
