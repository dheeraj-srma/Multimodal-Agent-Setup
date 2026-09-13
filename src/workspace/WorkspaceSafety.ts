import { AgentId, ConflictHunk, FileConflictPayload } from '../types';
import { eventBus } from '../events/EventBus';

export interface FileModificationRecord {
  file: string;
  agentId: AgentId;
  startLine: number;
  endLine: number;
  content: string;
  timestamp: number;
}

export class WorkspaceSafety {
  private static instance: WorkspaceSafety;
  private modificationHistory: Map<string, FileModificationRecord[]> = new Map();
  private activeConflicts: Map<string, FileConflictPayload> = new Map();

  private constructor() {}

  public static getInstance(): WorkspaceSafety {
    if (!WorkspaceSafety.instance) {
      WorkspaceSafety.instance = new WorkspaceSafety();
    }
    return WorkspaceSafety.instance;
  }

  /**
   * Records an intended or performed file modification and checks for conflicts.
   * Returns a conflict payload if an overlapping or unmerged collision is detected.
   */
  public registerModification(
    file: string,
    agentId: AgentId,
    startLine: number,
    endLine: number,
    content: string
  ): { safe: boolean; conflict?: FileConflictPayload } {
    const history = this.modificationHistory.get(file) || [];

    // Check for collision with another agent who modified the same file recently
    const conflictingRecord = history.find((record) => {
      if (record.agentId === agentId) return false; // same agent is fine
      // Check for line range overlap or close modifications
      const overlap = Math.max(record.startLine, startLine) <= Math.min(record.endLine, endLine);
      return overlap;
    });

    const newRecord: FileModificationRecord = {
      file,
      agentId,
      startLine,
      endLine,
      content,
      timestamp: Date.now(),
    };

    if (conflictingRecord) {
      const conflictId = `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const hunk: ConflictHunk = {
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

      const conflictPayload: FileConflictPayload = {
        conflictId,
        filePath: file,
        hunks: [hunk],
        detectedAt: Date.now(),
        status: 'UNRESOLVED',
      };

      this.activeConflicts.set(conflictId, conflictPayload);

      // Publish conflict event
      eventBus.publish({
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

  public resolveConflict(
    conflictId: string,
    choice: 'KEEP_A' | 'KEEP_B' | 'MERGE' | 'ORCHESTRATOR'
  ): FileConflictPayload | undefined {
    const conflict = this.activeConflicts.get(conflictId);
    if (!conflict) return undefined;

    conflict.status = 'RESOLVED';
    conflict.resolvedChoice = choice;

    eventBus.publish({
      id: `ev-${Date.now()}`,
      timestamp: Date.now(),
      agentId: 'system',
      type: 'CONFLICT_RESOLVED',
      payload: conflict,
    });

    this.activeConflicts.delete(conflictId);
    return conflict;
  }

  public getActiveConflicts(): FileConflictPayload[] {
    return Array.from(this.activeConflicts.values());
  }

  public getModificationHistory(file?: string): FileModificationRecord[] {
    if (file) {
      return this.modificationHistory.get(file) || [];
    }
    const all: FileModificationRecord[] = [];
    for (const list of this.modificationHistory.values()) {
      all.push(...list);
    }
    return all.sort((a, b) => b.timestamp - a.timestamp);
  }

  public clearHistory(): void {
    this.modificationHistory.clear();
    this.activeConflicts.clear();
  }
}

export const workspaceSafety = WorkspaceSafety.getInstance();
