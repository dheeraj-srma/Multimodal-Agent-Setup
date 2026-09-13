import {
  AgentId,
  AgentRuntime as IAgentRuntime,
  AgentStatus,
  AgentTask,
  AgentMessagePayload,
  AgentEventListener,
} from '../../types';
import { BaseAgent } from '../base/BaseAgent';
import { OrchestratorAgent } from '../orchestrator/OrchestratorAgent';
import { DesignAgent } from '../design/DesignAgent';
import { CoderAgent } from '../coder/CoderAgent';
import { ResearchAgent } from '../research/ResearchAgent';
import { TestAgent } from '../tester/TestAgent';
import { eventBus } from '../../events/EventBus';

export class AgentRuntime implements IAgentRuntime {
  private static instance: AgentRuntime;
  private agents: Map<AgentId, BaseAgent> = new Map();

  private constructor() {
    // Instantiate all 5 swarm agents
    const orchestrator = new OrchestratorAgent();
    const design = new DesignAgent();
    const coder = new CoderAgent();
    const research = new ResearchAgent();
    const tester = new TestAgent();

    this.agents.set('orchestrator', orchestrator);
    this.agents.set('design', design);
    this.agents.set('coder', coder);
    this.agents.set('research', research);
    this.agents.set('tester', tester);

    // Route inter-agent messages through the runtime
    eventBus.subscribe((event) => {
      if (event.type === 'AGENT_MESSAGE') {
        const msg = event.payload as AgentMessagePayload;
        if (msg.to === 'broadcast') {
          for (const [id, agent] of this.agents.entries()) {
            if (id !== msg.from) {
              agent.receiveMessage(msg).catch(console.error);
            }
          }
        } else {
          const recipient = this.agents.get(msg.to);
          if (recipient) {
            recipient.receiveMessage(msg).catch(console.error);
          }
        }
      }
    });
  }

  public static getInstance(): AgentRuntime {
    if (!AgentRuntime.instance) {
      AgentRuntime.instance = new AgentRuntime();
    }
    return AgentRuntime.instance;
  }

  public getAgent(agentId: AgentId): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  public getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  public async start(task: AgentTask): Promise<void> {
    const agent = this.agents.get(task.agentId);
    if (!agent) {
      throw new Error(`[AgentRuntime] Unknown agentId: ${task.agentId}`);
    }
    await agent.startTask(task);
  }

  public async stop(agentId: string): Promise<void> {
    if (agentId === 'all') {
      for (const agent of this.agents.values()) {
        await agent.stop();
      }
      return;
    }
    const agent = this.agents.get(agentId as AgentId);
    if (agent) {
      await agent.stop();
    }
  }

  public async pause(agentId: string): Promise<void> {
    if (agentId === 'all') {
      for (const agent of this.agents.values()) {
        await agent.pause();
      }
      return;
    }
    const agent = this.agents.get(agentId as AgentId);
    if (agent) {
      await agent.pause();
    }
  }

  public async resume(agentId: string): Promise<void> {
    if (agentId === 'all') {
      for (const agent of this.agents.values()) {
        await agent.resume();
      }
      return;
    }
    const agent = this.agents.get(agentId as AgentId);
    if (agent) {
      await agent.resume();
    }
  }

  public async sendMessage(message: AgentMessagePayload): Promise<void> {
    eventBus.publish({
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      agentId: message.from,
      type: 'AGENT_MESSAGE',
      payload: message,
    });
  }

  public getStatus(agentId: string): AgentStatus {
    const agent = this.agents.get(agentId as AgentId);
    if (!agent) {
      return {
        agentId: agentId as AgentId,
        role: 'Coder Agent',
        state: 'IDLE',
        progress: 0,
        filesTouchedCount: 0,
        messagesCount: 0,
        executionDurationMs: 0,
      };
    }
    return agent.getStatus();
  }

  public getAllStatuses(): Record<AgentId, AgentStatus> {
    const map: Record<string, AgentStatus> = {};
    for (const [id, agent] of this.agents.entries()) {
      map[id] = agent.getStatus();
    }
    return map as Record<AgentId, AgentStatus>;
  }

  public subscribe(listener: AgentEventListener): () => void {
    return eventBus.subscribe(listener);
  }
}

export const agentRuntime = AgentRuntime.getInstance();
