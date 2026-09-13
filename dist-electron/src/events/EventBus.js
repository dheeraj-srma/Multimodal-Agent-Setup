"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = exports.EventBus = void 0;
class EventBus {
    static instance;
    listeners = new Set();
    eventHistory = [];
    maxHistorySize = 2000;
    constructor() { }
    static getInstance() {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }
    publish(event) {
        this.eventHistory.push(event);
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
        // Dispatch to registered listeners
        for (const listener of this.listeners) {
            try {
                listener(event);
            }
            catch (err) {
                console.error('[EventBus] Error in event listener:', err);
            }
        }
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    getHistory(filter) {
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
    clearHistory() {
        this.eventHistory = [];
    }
}
exports.EventBus = EventBus;
exports.eventBus = EventBus.getInstance();
