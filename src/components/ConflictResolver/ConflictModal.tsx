import React from 'react';
import { AlertTriangle, Check, ShieldAlert, GitMerge } from 'lucide-react';
import { FileConflictPayload } from '../../types';
import './ConflictModal.css';

interface ConflictModalProps {
  conflict: FileConflictPayload;
  onResolve: (choice: 'KEEP_A' | 'KEEP_B' | 'MERGE' | 'ORCHESTRATOR') => void;
  onClose: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({ conflict, onResolve, onClose }) => {
  const hunk = conflict.hunks[0];

  return (
    <div className="modal-backdrop">
      <div className="conflict-modal-card">
        <div className="conflict-modal-header">
          <div className="cm-title-group">
            <AlertTriangle size={18} className="cm-alert-icon" />
            <span className="cm-title">FILE CONFLICT DETECTED</span>
          </div>
          <span className="cm-file-badge">{conflict.filePath}</span>
        </div>

        <div className="conflict-modal-body">
          <p className="cm-description">
            Two agents attempted concurrent modifications on overlapping lines. Automatic lock engaged to
            prevent silent overwriting.
          </p>

          <div className="conflict-sides-comparison">
            {/* Agent A */}
            <div className="conflict-hunk-card">
              <div className="ch-header">
                <span className="ch-agent-name">[{hunk?.agentA.agentId.toUpperCase()} AGENT]</span>
                <span className="ch-timestamp">
                  {new Date(hunk?.agentA.timestamp || Date.now()).toLocaleTimeString()}
                </span>
              </div>
              <pre className="ch-code-preview">
                {hunk?.agentA.lines || '// No content recorded'}
              </pre>
            </div>

            {/* Agent B */}
            <div className="conflict-hunk-card">
              <div className="ch-header">
                <span className="ch-agent-name">[{hunk?.agentB.agentId.toUpperCase()} AGENT]</span>
                <span className="ch-timestamp">
                  {new Date(hunk?.agentB.timestamp || Date.now()).toLocaleTimeString()}
                </span>
              </div>
              <pre className="ch-code-preview">
                {hunk?.agentB.lines || '// No content recorded'}
              </pre>
            </div>
          </div>
        </div>

        {/* Resolution Options */}
        <div className="conflict-modal-footer">
          <button className="cm-btn btn-keep-a" onClick={() => onResolve('KEEP_A')}>
            KEEP {hunk?.agentA.agentId.toUpperCase()}
          </button>
          <button className="cm-btn btn-keep-b" onClick={() => onResolve('KEEP_B')}>
            KEEP {hunk?.agentB.agentId.toUpperCase()}
          </button>
          <button className="cm-btn btn-merge" onClick={() => onResolve('MERGE')}>
            <GitMerge size={14} />
            <span>3-WAY MERGE</span>
          </button>
          <button className="cm-btn btn-orchestrator" onClick={() => onResolve('ORCHESTRATOR')}>
            ASK ORCHESTRATOR
          </button>
        </div>
      </div>
    </div>
  );
};
