"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageManager = exports.StorageManager = void 0;
const DEFAULT_SETTINGS = {
    workspacePath: '.',
    theme: 'dark',
    autoSave: true,
};
class StorageManager {
    static instance;
    memoryCache;
    STORAGE_KEY = 'acc_data_store_v1';
    constructor() {
        this.memoryCache = this.loadInitial();
    }
    static getInstance() {
        if (!StorageManager.instance) {
            StorageManager.instance = new StorageManager();
        }
        return StorageManager.instance;
    }
    loadInitial() {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const raw = window.localStorage.getItem(this.STORAGE_KEY);
                if (raw) {
                    return JSON.parse(raw);
                }
            }
        }
        catch (err) {
            console.warn('[StorageManager] Error reading from localStorage, using memory defaults', err);
        }
        return {
            missions: {},
            tasks: {},
            agentStates: {},
            events: [],
            settings: DEFAULT_SETTINGS,
        };
    }
    persist() {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.memoryCache));
            }
            // If Electron IPC is available, sync to disk
            if (typeof window !== 'undefined' && window.commandCenterAPI?.saveStore) {
                window.commandCenterAPI.saveStore(this.memoryCache).catch(() => { });
            }
        }
        catch (err) {
            console.error('[StorageManager] Failed to persist storage:', err);
        }
    }
    saveMission(mission) {
        this.memoryCache.missions[mission.id] = { ...mission };
        this.memoryCache.lastActiveMissionId = mission.id;
        this.persist();
    }
    getMission(id) {
        return this.memoryCache.missions[id];
    }
    getAllMissions() {
        return Object.values(this.memoryCache.missions).sort((a, b) => b.createdAt - a.createdAt);
    }
    saveTask(task) {
        this.memoryCache.tasks[task.id] = { ...task };
        this.persist();
    }
    getTask(id) {
        return this.memoryCache.tasks[id];
    }
    getTasksForMission(missionId) {
        return Object.values(this.memoryCache.tasks).filter((t) => t.missionId === missionId);
    }
    saveAgentState(agentId, status) {
        this.memoryCache.agentStates[agentId] = { ...status };
        this.persist();
    }
    getAgentState(agentId) {
        return this.memoryCache.agentStates[agentId];
    }
    appendEvent(event) {
        this.memoryCache.events.push(event);
        if (this.memoryCache.events.length > 5000) {
            this.memoryCache.events.shift();
        }
        // Throttle / debounce persistence if necessary, or persist on important events
        if (event.type === 'TASK_COMPLETED' || event.type === 'TASK_FAILED' || event.type === 'MISSION_UPDATED' || event.type === 'CONFLICT_DETECTED') {
            this.persist();
        }
    }
    getEvents(limit = 1000) {
        return this.memoryCache.events.slice(-limit);
    }
    getSettings() {
        return { ...this.memoryCache.settings };
    }
    updateSettings(settings) {
        this.memoryCache.settings = { ...this.memoryCache.settings, ...settings };
        this.persist();
    }
    getLastActiveMissionId() {
        return this.memoryCache.lastActiveMissionId;
    }
}
exports.StorageManager = StorageManager;
exports.storageManager = StorageManager.getInstance();
