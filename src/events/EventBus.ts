import { AgentEvent, AgentEventListener, AgentId, AgentEventType } from '../types';

export class EventBus {
  private static instance: EventBus;
  private listeners: Set<AgentEventListener> = new Set();
  private eventHistory: AgentEvent[] = [];
  private maxHistorySize: number = 2000;

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public publish(event: AgentEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Dispatch to registered listeners
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[EventBus] Error in event listener:', err);
      }
    }
  }

  public subscribe(listener: AgentEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getHistory(filter?: {
    agentId?: AgentId | 'all';
    type?: AgentEventType | 'all';
    search?: string;
    limit?: number;
  }): AgentEvent[] {
    let result = [...this.eventHistory];

    if (filter?.agentId && filter.agentId !== 'all') {
      result = result.filter((e) => e.agentId === filter.agentId);
    }

    if (filter?.type && filter.type !== 'all') {
      result = result.filter((e) => e.type === filter.type);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter((e) => {
        const payloadStr = JSON.stringify(e.payload).toLowerCase();
        return payloadStr.includes(q) || e.type.toLowerCase().includes(q) || e.agentId.toLowerCase().includes(q);
      });
    }

    if (filter?.limit && filter.limit > 0) {
      result = result.slice(-filter.limit);
    }

    return result;
  }

  public clearHistory(): void {
    this.eventHistory = [];
  }
}

export const eventBus = EventBus.getInstance();
