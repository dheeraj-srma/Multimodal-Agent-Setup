import { AgentId } from '../types';

export class ParallelismTracker {
  private missionStartTime?: number;
  private agentIntervals: Map<AgentId, Array<{ start: number; end?: number }>> = new Map();

  public startMission(timestamp = Date.now()): void {
    this.missionStartTime = timestamp;
    this.agentIntervals.clear();
  }

  public recordAgentStart(agentId: AgentId, timestamp = Date.now()): void {
    const list = this.agentIntervals.get(agentId) || [];
    list.push({ start: timestamp });
    this.agentIntervals.set(agentId, list);
  }

  public recordAgentEnd(agentId: AgentId, timestamp = Date.now()): void {
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
  public getParallelismFactor(): number {
    if (!this.missionStartTime) return 1.0;
    const now = Date.now();
    const totalWallTime = Math.max(1, now - this.missionStartTime);

    let cumulativeAgentTime = 0;
    for (const intervals of this.agentIntervals.values()) {
      for (const interval of intervals) {
        const endTime = interval.end || now;
        cumulativeAgentTime += Math.max(0, endTime - interval.start);
      }
    }

    if (totalWallTime <= 0 || cumulativeAgentTime <= 0) return 1.0;
    const factor = cumulativeAgentTime / totalWallTime;
    return Math.max(1.0, Math.min(4.0, Number(factor.toFixed(2))));
  }

  public reset(): void {
    this.missionStartTime = undefined;
    this.agentIntervals.clear();
  }
}

export const parallelismTracker = new ParallelismTracker();
