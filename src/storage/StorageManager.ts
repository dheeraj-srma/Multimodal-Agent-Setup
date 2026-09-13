import { Mission, AgentTask, AgentEvent, AgentStatus, AgentId } from '../types';

export interface StorageSchema {
  missions: Record<string, Mission>;
  tasks: Record<string, AgentTask>;
  agentStates: Record<AgentId, AgentStatus>;
  events: AgentEvent[];
  lastActiveMissionId?: string;
  settings: {
    workspacePath: string;
    apiKeyGemini?: string;
    apiKeyOpenAI?: string;
    apiKeyAnthropic?: string;
    ollamaEndpoint?: string;
    theme: 'dark' | 'jarvis';
    autoSave: boolean;
  };
}

const DEFAULT_SETTINGS: StorageSchema['settings'] = {
  workspacePath: '.',
  theme: 'dark',
  autoSave: true,
};

export class StorageManager {
  private static instance: StorageManager;
  private memoryCache: StorageSchema;
  private readonly STORAGE_KEY = 'acc_data_store_v1';

  private constructor() {
    this.memoryCache = this.loadInitial();
  }

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  private loadInitial(): StorageSchema {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          return JSON.parse(raw);
        }
      }
    } catch (err) {
      console.warn('[StorageManager] Error reading from localStorage, using memory defaults', err);
    }

    return {
      missions: {},
      tasks: {},
      agentStates: {} as Record<AgentId, AgentStatus>,
      events: [],
      settings: DEFAULT_SETTINGS,
    };
  }

  private persist(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.memoryCache));
      }
      // If Electron IPC is available, sync to disk
      if (typeof window !== 'undefined' && (window as unknown as { commandCenterAPI?: { saveStore?: (data: unknown) => Promise<void> } }).commandCenterAPI?.saveStore) {
        (window as unknown as { commandCenterAPI: { saveStore: (data: unknown) => Promise<void> } }).commandCenterAPI.saveStore(this.memoryCache).catch(() => {});
      }
    } catch (err) {
      console.error('[StorageManager] Failed to persist storage:', err);
    }
  }

  public saveMission(mission: Mission): void {
    this.memoryCache.missions[mission.id] = { ...mission };
    this.memoryCache.lastActiveMissionId = mission.id;
    this.persist();
  }

  public getMission(id: string): Mission | undefined {
    return this.memoryCache.missions[id];
  }

  public getAllMissions(): Mission[] {
    return Object.values(this.memoryCache.missions).sort((a, b) => b.createdAt - a.createdAt);
  }

  public saveTask(task: AgentTask): void {
    this.memoryCache.tasks[task.id] = { ...task };
    this.persist();
  }

  public getTask(id: string): AgentTask | undefined {
    return this.memoryCache.tasks[id];
  }

  public getTasksForMission(missionId: string): AgentTask[] {
    return Object.values(this.memoryCache.tasks).filter((t) => t.missionId === missionId);
  }

  public saveAgentState(agentId: AgentId, status: AgentStatus): void {
    this.memoryCache.agentStates[agentId] = { ...status };
    this.persist();
  }

  public getAgentState(agentId: AgentId): AgentStatus | undefined {
    return this.memoryCache.agentStates[agentId];
  }

  public appendEvent(event: AgentEvent): void {
    this.memoryCache.events.push(event);
    if (this.memoryCache.events.length > 5000) {
      this.memoryCache.events.shift();
    }
    // Throttle / debounce persistence if necessary, or persist on important events
    if (event.type === 'TASK_COMPLETED' || event.type === 'TASK_FAILED' || event.type === 'MISSION_UPDATED' || event.type === 'CONFLICT_DETECTED') {
      this.persist();
    }
  }

  public getEvents(limit = 1000): AgentEvent[] {
    return this.memoryCache.events.slice(-limit);
  }

  public getSettings(): StorageSchema['settings'] {
    return { ...this.memoryCache.settings };
  }

  public updateSettings(settings: Partial<StorageSchema['settings']>): void {
    this.memoryCache.settings = { ...this.memoryCache.settings, ...settings };
    this.persist();
  }

  public getLastActiveMissionId(): string | undefined {
    return this.memoryCache.lastActiveMissionId;
  }
}

export const storageManager = StorageManager.getInstance();
