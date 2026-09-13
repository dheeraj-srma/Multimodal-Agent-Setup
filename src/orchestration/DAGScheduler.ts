import { Mission, AgentTask } from '../types';
import { agentRuntime } from '../agents/runtime/AgentRuntime';
import { eventBus } from '../events/EventBus';
import { storageManager } from '../storage/StorageManager';
import { parallelismTracker } from './ParallelismTracker';
import { OrchestratorAgent } from '../agents/orchestrator/OrchestratorAgent';

export class DAGScheduler {
  private static instance: DAGScheduler;
  private currentMission?: Mission;
  private isPaused: boolean = false;
  private isStopped: boolean = false;
  private runningTasks: Set<string> = new Set();

  private constructor() {
    // Listen for task completion/failure to advance DAG
    eventBus.subscribe((event) => {
      if (event.type === 'TASK_COMPLETED') {
        const { task } = event.payload;
        this.runningTasks.delete(task.id);
        parallelismTracker.recordAgentEnd(task.agentId);
        this.checkAndDispatchNext();
      } else if (event.type === 'TASK_FAILED') {
        const { task } = event.payload;
        this.runningTasks.delete(task.id);
        parallelismTracker.recordAgentEnd(task.agentId);
        this.handleTaskFailure(task);
      }
    });
  }

  public static getInstance(): DAGScheduler {
    if (!DAGScheduler.instance) {
      DAGScheduler.instance = new DAGScheduler();
    }
    return DAGScheduler.instance;
  }

  public async runMission(mission: Mission): Promise<void> {
    this.currentMission = mission;
    this.isPaused = false;
    this.isStopped = false;
    this.runningTasks.clear();

    mission.status = 'RUNNING';
    mission.startedAt = Date.now();
    parallelismTracker.startMission(mission.startedAt);
    storageManager.saveMission(mission);

    eventBus.publish({
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      agentId: 'orchestrator',
      type: 'MISSION_UPDATED',
      payload: mission,
    });

    eventBus.publish({
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

  public async checkAndDispatchNext(): Promise<void> {
    if (!this.currentMission || this.isPaused || this.isStopped) return;

    const mission = this.currentMission;
    const completedTaskIds = new Set(
      mission.tasks.filter((t) => t.status === 'COMPLETED').map((t) => t.id)
    );

    // Update mission metrics
    mission.completedTasksCount = completedTaskIds.size;
    mission.failedTasksCount = mission.tasks.filter((t) => t.status === 'FAILED').map((t) => t.id).length;
    mission.parallelismFactor = parallelismTracker.getParallelismFactor();
    mission.activeAgentsCount = this.runningTasks.size;

    // Check if entire mission is complete
    if (completedTaskIds.size === mission.tasks.length) {
      await this.finishMission();
      return;
    }

    // Find all tasks that are PENDING and whose prerequisites are all COMPLETED
    const readyTasks = mission.tasks.filter((t) => {
      if (t.status !== 'PENDING') return false;
      const depsSatisfied = t.dependsOn.every((depId) => completedTaskIds.has(depId));
      return depsSatisfied;
    });

    if (readyTasks.length === 0 && this.runningTasks.size === 0) {
      // If no tasks are running and none can be scheduled, check for deadlock or completion
      const pending = mission.tasks.filter((t) => t.status === 'PENDING');
      if (pending.length > 0) {
        mission.status = 'FAILED';
        eventBus.publish({
          id: `ev-${Date.now()}`,
          timestamp: Date.now(),
          agentId: 'orchestrator',
          type: 'AGENT_LOG',
          payload: {
            level: 'error',
            message: 'Orchestrator detected blocked DAG dependency deadlock.',
          },
        });
        storageManager.saveMission(mission);
      }
      return;
    }

    // Dispatch all ready tasks simultaneously! (Parallel execution)
    for (const task of readyTasks) {
      task.status = 'RUNNING';
      task.startedAt = Date.now();
      this.runningTasks.add(task.id);
      parallelismTracker.recordAgentStart(task.agentId, task.startedAt);

      storageManager.saveTask(task);
      mission.activeAgentsCount = this.runningTasks.size;
      storageManager.saveMission(mission);

      eventBus.publish({
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
      agentRuntime.start(task).catch((err) => {
        console.error(`[DAGScheduler] Task ${task.id} crashed:`, err);
      });
    }

    mission.parallelismFactor = parallelismTracker.getParallelismFactor();
    storageManager.saveMission(mission);
    eventBus.publish({
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      agentId: 'orchestrator',
      type: 'MISSION_UPDATED',
      payload: mission,
    });
  }

  private async finishMission(): Promise<void> {
    if (!this.currentMission) return;
    const mission = this.currentMission;
    mission.status = 'COMPLETED';
    mission.completedAt = Date.now();
    mission.activeAgentsCount = 0;
    mission.parallelismFactor = parallelismTracker.getParallelismFactor();

    // Orchestrator generates the final synthesized report
    const orch = agentRuntime.getAgent('orchestrator') as OrchestratorAgent;
    if (orch) {
      orch.generateFinalReport(mission);
    }

    storageManager.saveMission(mission);

    eventBus.publish({
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      agentId: 'orchestrator',
      type: 'MISSION_UPDATED',
      payload: mission,
    });

    eventBus.publish({
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

  private handleTaskFailure(task: AgentTask): void {
    if (!this.currentMission) return;
    eventBus.publish({
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

  public async pauseAll(): Promise<void> {
    this.isPaused = true;
    if (this.currentMission) {
      this.currentMission.status = 'PAUSED';
      storageManager.saveMission(this.currentMission);
    }
    await agentRuntime.pause('all');
    eventBus.publish({
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      agentId: 'orchestrator',
      type: 'AGENT_LOG',
      payload: { level: 'warn', message: 'All agents paused by operator.' },
    });
  }

  public async resumeAll(): Promise<void> {
    this.isPaused = false;
    if (this.currentMission) {
      this.currentMission.status = 'RUNNING';
      storageManager.saveMission(this.currentMission);
    }
    await agentRuntime.resume('all');
    eventBus.publish({
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      agentId: 'orchestrator',
      type: 'AGENT_LOG',
      payload: { level: 'info', message: 'Mission and agents resumed.' },
    });
    await this.checkAndDispatchNext();
  }

  public async stopAll(): Promise<void> {
    this.isStopped = true;
    this.runningTasks.clear();
    if (this.currentMission) {
      this.currentMission.status = 'STOPPED';
      storageManager.saveMission(this.currentMission);
    }
    await agentRuntime.stop('all');
    eventBus.publish({
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      agentId: 'orchestrator',
      type: 'AGENT_LOG',
      payload: { level: 'error', message: 'Mission and all agent processes stopped.' },
    });
  }

  public getCurrentMission(): Mission | undefined {
    return this.currentMission;
  }
}

export const dagScheduler = DAGScheduler.getInstance();
