"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dagScheduler = exports.DAGScheduler = void 0;
const AgentRuntime_1 = require("../agents/runtime/AgentRuntime");
const EventBus_1 = require("../events/EventBus");
const StorageManager_1 = require("../storage/StorageManager");
const ParallelismTracker_1 = require("./ParallelismTracker");
class DAGScheduler {
    static instance;
    currentMission;
    isPaused = false;
    isStopped = false;
    runningTasks = new Set();
    constructor() {
        // Listen for task completion/failure to advance DAG
        EventBus_1.eventBus.subscribe((event) => {
            if (event.type === 'TASK_COMPLETED') {
                const { task } = event.payload;
                this.runningTasks.delete(task.id);
                ParallelismTracker_1.parallelismTracker.recordAgentEnd(task.agentId);
                this.checkAndDispatchNext();
            }
            else if (event.type === 'TASK_FAILED') {
                const { task } = event.payload;
                this.runningTasks.delete(task.id);
                ParallelismTracker_1.parallelismTracker.recordAgentEnd(task.agentId);
                this.handleTaskFailure(task);
            }
        });
    }
    static getInstance() {
        if (!DAGScheduler.instance) {
            DAGScheduler.instance = new DAGScheduler();
        }
        return DAGScheduler.instance;
    }
    async runMission(mission) {
        this.currentMission = mission;
        this.isPaused = false;
        this.isStopped = false;
        this.runningTasks.clear();
        mission.status = 'RUNNING';
        mission.startedAt = Date.now();
        ParallelismTracker_1.parallelismTracker.startMission(mission.startedAt);
        StorageManager_1.storageManager.saveMission(mission);
        EventBus_1.eventBus.publish({
            id: `ev-${Date.now()}`,
            timestamp: Date.now(),
            agentId: 'orchestrator',
            type: 'MISSION_UPDATED',
            payload: mission,
        });
        EventBus_1.eventBus.publish({
            id: `ev-${Date.now()}`,
            timestamp: Date.now(),
            agentId: 'orchestrator',
            type: 'AGENT_LOG',
            payload: {
                level: 'info',
                message: `🚀 Mission started: "${mission.objective}". Decomposing DAG and launching parallel workers.`,
            },
        });
        // Initial dispatch of unblocked tasks
        await this.checkAndDispatchNext();
    }
    async checkAndDispatchNext() {
        if (!this.currentMission || this.isPaused || this.isStopped)
            return;
        const mission = this.currentMission;
        const completedTaskIds = new Set(mission.tasks.filter((t) => t.status === 'COMPLETED').map((t) => t.id));
        // Update mission metrics
        mission.completedTasksCount = completedTaskIds.size;
        mission.failedTasksCount = mission.tasks.filter((t) => t.status === 'FAILED').map((t) => t.id).length;
        mission.parallelismFactor = ParallelismTracker_1.parallelismTracker.getParallelismFactor();
        mission.activeAgentsCount = this.runningTasks.size;
        // Check if entire mission is complete
        if (completedTaskIds.size === mission.tasks.length) {
            await this.finishMission();
            return;
        }
        // Find all tasks that are PENDING and whose prerequisites are all COMPLETED
        const readyTasks = mission.tasks.filter((t) => {
            if (t.status !== 'PENDING')
                return false;
            const depsSatisfied = t.dependsOn.every((depId) => completedTaskIds.has(depId));
            return depsSatisfied;
        });
        if (readyTasks.length === 0 && this.runningTasks.size === 0) {
            // If no tasks are running and none can be scheduled, check for deadlock or completion
            const pending = mission.tasks.filter((t) => t.status === 'PENDING');
            if (pending.length > 0) {
                mission.status = 'FAILED';
                EventBus_1.eventBus.publish({
                    id: `ev-${Date.now()}`,
                    timestamp: Date.now(),
                    agentId: 'orchestrator',
                    type: 'AGENT_LOG',
                    payload: {
                        level: 'error',
                        message: 'Orchestrator detected blocked DAG dependency deadlock.',
                    },
                });
                StorageManager_1.storageManager.saveMission(mission);
            }
            return;
        }
        // Dispatch all ready tasks simultaneously! (Parallel execution)
        for (const task of readyTasks) {
            task.status = 'RUNNING';
            task.startedAt = Date.now();
            this.runningTasks.add(task.id);
            ParallelismTracker_1.parallelismTracker.recordAgentStart(task.agentId, task.startedAt);
            StorageManager_1.storageManager.saveTask(task);
            mission.activeAgentsCount = this.runningTasks.size;
            StorageManager_1.storageManager.saveMission(mission);
            EventBus_1.eventBus.publish({
                id: `ev-${Date.now()}`,
                timestamp: Date.now(),
                agentId: 'orchestrator',
                type: 'AGENT_LOG',
                payload: {
                    level: 'info',
                    message: `Dispatching [${task.agentId.toUpperCase()}] task: "${task.title}" (Parallel batch)`,
                },
            });
            // Launch async without awaiting sequentially so other ready tasks run concurrently
            AgentRuntime_1.agentRuntime.start(task).catch((err) => {
                console.error(`[DAGScheduler] Task ${task.id} crashed:`, err);
            });
        }
        mission.parallelismFactor = ParallelismTracker_1.parallelismTracker.getParallelismFactor();
        StorageManager_1.storageManager.saveMission(mission);
        EventBus_1.eventBus.publish({
            id: `ev-${Date.now()}`,
            timestamp: Date.now(),
            agentId: 'orchestrator',
            type: 'MISSION_UPDATED',
            payload: mission,
        });
    }
    async finishMission() {
        if (!this.currentMission)
            return;
        const mission = this.currentMission;
        mission.status = 'COMPLETED';
        mission.completedAt = Date.now();
        mission.activeAgentsCount = 0;
        mission.parallelismFactor = ParallelismTracker_1.parallelismTracker.getParallelismFactor();
        // Orchestrator generates the final synthesized report
        const orch = AgentRuntime_1.agentRuntime.getAgent('orchestrator');
        if (orch) {
            orch.generateFinalReport(mission);
        }
        StorageManager_1.storageManager.saveMission(mission);
        EventBus_1.eventBus.publish({
            id: `ev-${Date.now()}`,
            timestamp: Date.now(),
            agentId: 'orchestrator',
            type: 'MISSION_UPDATED',
            payload: mission,
        });
        EventBus_1.eventBus.publish({
            id: `ev-${Date.now()}`,
            timestamp: Date.now(),
            agentId: 'orchestrator',
            type: 'AGENT_LOG',
            payload: {
                level: 'success',
                message: `🏁 MISSION #${mission.id} COMPLETED SUCCESSFULLY! Final report generated. Parallelism: ${mission.parallelismFactor.toFixed(2)}x`,
            },
        });
    }
    handleTaskFailure(task) {
        if (!this.currentMission)
            return;
        EventBus_1.eventBus.publish({
            id: `ev-${Date.now()}`,
            timestamp: Date.now(),
            agentId: 'orchestrator',
            type: 'AGENT_LOG',
            payload: {
                level: 'error',
                message: `Agent [${task.agentId.toUpperCase()}] reported failure on task "${task.title}". Deciding recovery strategy...`,
            },
        });
    }
    async pauseAll() {
        this.isPaused = true;
        if (this.currentMission) {
            this.currentMission.status = 'PAUSED';
            StorageManager_1.storageManager.saveMission(this.currentMission);
        }
        await AgentRuntime_1.agentRuntime.pause('all');
        EventBus_1.eventBus.publish({
            id: `ev-${Date.now()}`,
            timestamp: Date.now(),
            agentId: 'orchestrator',
            type: 'AGENT_LOG',
            payload: { level: 'warn', message: 'All agents paused by operator.' },
        });
    }
    async resumeAll() {
        this.isPaused = false;
        if (this.currentMission) {
            this.currentMission.status = 'RUNNING';
            StorageManager_1.storageManager.saveMission(this.currentMission);
        }
        await AgentRuntime_1.agentRuntime.resume('all');
        EventBus_1.eventBus.publish({
            id: `ev-${Date.now()}`,
            timestamp: Date.now(),
            agentId: 'orchestrator',
            type: 'AGENT_LOG',
            payload: { level: 'info', message: 'Mission and agents resumed.' },
        });
        await this.checkAndDispatchNext();
    }
    async stopAll() {
        this.isStopped = true;
        this.runningTasks.clear();
        if (this.currentMission) {
            this.currentMission.status = 'STOPPED';
            StorageManager_1.storageManager.saveMission(this.currentMission);
        }
        await AgentRuntime_1.agentRuntime.stop('all');
        EventBus_1.eventBus.publish({
            id: `ev-${Date.now()}`,
            timestamp: Date.now(),
            agentId: 'orchestrator',
            type: 'AGENT_LOG',
            payload: { level: 'error', message: 'Mission and all agent processes stopped.' },
        });
    }
    getCurrentMission() {
        return this.currentMission;
    }
}
exports.DAGScheduler = DAGScheduler;
exports.dagScheduler = DAGScheduler.getInstance();
