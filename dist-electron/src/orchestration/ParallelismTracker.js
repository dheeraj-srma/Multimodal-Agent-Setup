"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parallelismTracker = exports.ParallelismTracker = void 0;
class ParallelismTracker {
    missionStartTime;
    agentIntervals = new Map();
    startMission(timestamp = Date.now()) {
        this.missionStartTime = timestamp;
        this.agentIntervals.clear();
    }
    recordAgentStart(agentId, timestamp = Date.now()) {
        const list = this.agentIntervals.get(agentId) || [];
        list.push({ start: timestamp });
        this.agentIntervals.set(agentId, list);
    }
    recordAgentEnd(agentId, timestamp = Date.now()) {
        const list = this.agentIntervals.get(agentId);
        if (list && list.length > 0) {
            const last = list[list.length - 1];
            if (!last.end) {
                last.end = timestamp;
            }
        }
    }
    /**
     * Calculates actual parallelism multiplier: (sum of agent working durations) / (total mission wall time)
     */
    getParallelismFactor() {
        if (!this.missionStartTime)
            return 1.0;
        const now = Date.now();
        const totalWallTime = Math.max(1, now - this.missionStartTime);
        let cumulativeAgentTime = 0;
        for (const intervals of this.agentIntervals.values()) {
            for (const interval of intervals) {
                const endTime = interval.end || now;
                cumulativeAgentTime += Math.max(0, endTime - interval.start);
            }
        }
        if (totalWallTime <= 0 || cumulativeAgentTime <= 0)
            return 1.0;
        const factor = cumulativeAgentTime / totalWallTime;
        return Math.max(1.0, Math.min(4.0, Number(factor.toFixed(2))));
    }
    reset() {
        this.missionStartTime = undefined;
        this.agentIntervals.clear();
    }
}
exports.ParallelismTracker = ParallelismTracker;
exports.parallelismTracker = new ParallelismTracker();
