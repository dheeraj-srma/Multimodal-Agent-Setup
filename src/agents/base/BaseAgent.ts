import {
  AgentId,
  AgentRole,
  AgentState,
  AgentStatus,
  AgentTask,
  AgentMessagePayload,
  LogLevel,
  FileChangedPayload,
} from '../../types';
import { eventBus } from '../../events/EventBus';
import { storageManager } from '../../storage/StorageManager';

export abstract class BaseAgent {
  public readonly agentId: AgentId;
  public readonly role: AgentRole;
  protected status: AgentStatus;
  protected isPaused: boolean = false;
  protected isStopped: boolean = false;
  protected currentTask?: AgentTask;

  constructor(agentId: AgentId, role: AgentRole) {
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
    storageManager.saveAgentState(this.agentId, this.status);
  }

  public getStatus(): AgentStatus {
    return { ...this.status };
  }

  public async startTask(task: AgentTask): Promise<void> {
    this.currentTask = task;
    this.isPaused = false;
    this.isStopped = false;
    const now = Date.now();

    this.status.currentTaskId = task.id;
    this.status.currentTaskTitle = task.title;
    this.status.startedAt = now;
    this.status.progress = 0;
    this.emitStatus('STARTING', `Assigned task: ${task.title}`);

    eventBus.publish({
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
      storageManager.saveTask(task);

      eventBus.publish({
        id: `ev-${Date.now()}`,
        timestamp: Date.now(),
        agentId: this.agentId,
        type: 'TASK_COMPLETED',
        payload: {
          task,
          output: result,
        },
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.status.error = errorMsg;
      this.emitStatus('FAILED', errorMsg);

      task.status = 'FAILED';
      task.error = errorMsg;
      storageManager.saveTask(task);

      eventBus.publish({
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

  protected abstract execute(task: AgentTask): Promise<unknown>;

  public async pause(): Promise<void> {
    this.isPaused = true;
    this.emitStatus('WAITING', 'Agent paused by user');
  }

  public async resume(): Promise<void> {
    this.isPaused = false;
    this.emitStatus('WORKING', 'Agent resumed execution');
  }

  public async stop(reason = 'Manual stop requested'): Promise<void> {
    this.isStopped = true;
    this.emitStatus('STOPPED', reason);
    eventBus.publish({
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      agentId: this.agentId,
      type: 'AGENT_STOPPED',
      payload: { reason },
    });
  }

  public async receiveMessage(msg: AgentMessagePayload): Promise<void> {
    this.status.messagesCount += 1;
    storageManager.saveAgentState(this.agentId, this.status);
    this.emitLog('info', `Received message from [${msg.from}]: ${msg.subject}`);
  }

  public sendMessage(to: AgentId | 'broadcast', subject: string, body: unknown): void {
    const payload: AgentMessagePayload = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      from: this.agentId,
      to,
      subject,
      body,
    };

    this.status.messagesCount += 1;
    storageManager.saveAgentState(this.agentId, this.status);

    eventBus.publish({
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      agentId: this.agentId,
      type: 'AGENT_MESSAGE',
      payload,
    });
  }

  protected emitProgress(progress: number, currentAction: string): void {
    this.status.progress = Math.min(100, Math.max(0, Math.round(progress)));
    this.status.currentAction = currentAction;
    storageManager.saveAgentState(this.agentId, this.status);

    eventBus.publish({
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      agentId: this.agentId,
      type: 'AGENT_PROGRESS',
      payload: { progress: this.status.progress, currentAction },
    });
  }

  protected emitStatus(newState: AgentState, reason?: string): void {
    const previousState = this.status.state;
    this.status.state = newState;
    storageManager.saveAgentState(this.agentId, this.status);

    eventBus.publish({
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      agentId: this.agentId,
      type: 'AGENT_STATUS',
      payload: { previousState, newState, reason },
    });
  }

  public emitLog(level: LogLevel, message: string, details?: unknown): void {
    eventBus.publish({
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      agentId: this.agentId,
      type: 'AGENT_LOG',
      payload: { level, message, details },
    });
  }

  protected recordFileChange(payload: FileChangedPayload): void {
    this.status.filesTouchedCount += 1;
    storageManager.saveAgentState(this.agentId, this.status);

    eventBus.publish({
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      agentId: this.agentId,
      type: 'FILE_CHANGED',
      payload,
    });
  }

  protected async checkPause(): Promise<void> {
    while (this.isPaused && !this.isStopped) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    if (this.isStopped) {
      throw new Error('Agent was stopped during execution');
    }
  }
}
