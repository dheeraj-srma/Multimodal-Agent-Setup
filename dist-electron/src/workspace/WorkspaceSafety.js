"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspaceSafety = exports.WorkspaceSafety = void 0;
const EventBus_1 = require("../events/EventBus");
class WorkspaceSafety {
    static instance;
    modificationHistory = new Map();
    activeConflicts = new Map();
    constructor() { }
    static getInstance() {
        if (!WorkspaceSafety.instance) {
            WorkspaceSafety.instance = new WorkspaceSafety();
        }
        return WorkspaceSafety.instance;
    }
    /**
     * Records an intended or performed file modification and checks for conflicts.
     * Returns a conflict payload if an overlapping or unmerged collision is detected.
     */
    registerModification(file, agentId, startLine, endLine, content) {
        const history = this.modificationHistory.get(file) || [];
        // Check for collision with another agent who modified the same file recently
        const conflictingRecord = history.find((record) => {
            if (record.agentId === agentId)
                return false; // same agent is fine
            // Check for line range overlap or close modifications
            const overlap = Math.max(record.startLine, startLine) <= Math.min(record.endLine, endLine);
            return overlap;
        });
        const newRecord = {
            file,
            agentId,
            startLine,
            endLine,
            content,
            timestamp: Date.now(),
        };
        if (conflictingRecord) {
            const conflictId = `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            const hunk = {
                file,
                startLine: Math.min(conflictingRecord.startLine, startLine),
                endLine: Math.max(conflictingRecord.endLine, endLine),
                agentA: {
                    agentId: conflictingRecord.agentId,
                    lines: conflictingRecord.content,
                    timestamp: conflictingRecord.timestamp,
                },
                agentB: {
                    agentId,
                    lines: content,
                    timestamp: newRecord.timestamp,
                },
            };
            const conflictPayload = {
                conflictId,
                filePath: file,
                hunks: [hunk],
                detectedAt: Date.now(),
                status: 'UNRESOLVED',
            };
            this.activeConflicts.set(conflictId, conflictPayload);
            // Publish conflict event
            EventBus_1.eventBus.publish({
                id: `ev-${Date.now()}`,
                timestamp: Date.now(),
                agentId: 'system',
                type: 'CONFLICT_DETECTED',
                payload: conflictPayload,
            });
            // Still record to history for audit trail
            history.push(newRecord);
            this.modificationHistory.set(file, history);
            return { safe: false, conflict: conflictPayload };
        }
        history.push(newRecord);
        this.modificationHistory.set(file, history);
        return { safe: true };
    }
    resolveConflict(conflictId, choice) {
        const conflict = this.activeConflicts.get(conflictId);
        if (!conflict)
            return undefined;
        conflict.status = 'RESOLVED';
        conflict.resolvedChoice = choice;
        EventBus_1.eventBus.publish({
            id: `ev-${Date.now()}`,
            timestamp: Date.now(),
            agentId: 'system',
            type: 'CONFLICT_RESOLVED',
            payload: conflict,
        });
        this.activeConflicts.delete(conflictId);
        return conflict;
    }
    getActiveConflicts() {
        return Array.from(this.activeConflicts.values());
    }
    getModificationHistory(file) {
        if (file) {
            return this.modificationHistory.get(file) || [];
        }
        const all = [];
        for (const list of this.modificationHistory.values()) {
            all.push(...list);
        }
        return all.sort((a, b) => b.timestamp - a.timestamp);
    }
    clearHistory() {
        this.modificationHistory.clear();
        this.activeConflicts.clear();
    }
}
exports.WorkspaceSafety = WorkspaceSafety;
exports.workspaceSafety = WorkspaceSafety.getInstance();
