import React, { useState } from 'react';
import { X, GitBranch, GitCommit, FileCode, Check } from 'lucide-react';
import { GitStatusInfo } from '../../types';
import './GitDiffModal.css';

interface GitDiffModalProps {
  gitStatus: GitStatusInfo;
  diffText: string;
  onCommit: (message: string) => Promise<{ success: boolean; hash?: string }>;
  onClose: () => void;
}

export const GitDiffModal: React.FC<GitDiffModalProps> = ({
  gitStatus,
  diffText,
  onCommit,
  onClose,
}) => {
  const [commitMsg, setCommitMsg] = useState('chore(mission): apply verified agent swarm modifications');
  const [committing, setCommitting] = useState(false);
  const [commitHash, setCommitHash] = useState<string | null>(null);

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMsg.trim() || committing) return;
    setCommitting(true);
    const res = await onCommit(commitMsg.trim());
    setCommitting(false);
    if (res.success) {
      setCommitHash(res.hash || 'HEAD');
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="git-modal-card">
        <div className="git-modal-header">
          <div className="gm-title-group">
            <GitBranch size={16} className="gm-icon" />
            <span className="gm-title">WORKSPACE GIT INTEGRATION & DIFF INSPECTOR</span>
          </div>
          <button className="gm-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="git-modal-body">
          {/* Status Bar */}
          <div className="git-stats-banner">
            <div className="gs-item">
              <span className="gs-label">BRANCH:</span>
              <span className="gs-value">{gitStatus.currentBranch}</span>
            </div>
            <div className="gs-item">
              <span className="gs-label">MODIFIED:</span>
              <span className="gs-value text-amber">~{gitStatus.modifiedFiles.length}</span>
            </div>
            <div className="gs-item">
              <span className="gs-label">ADDED:</span>
              <span className="gs-value text-emerald">+{gitStatus.addedFiles.length}</span>
            </div>
            <div className="gs-item">
              <span className="gs-label">UNTRACKED:</span>
              <span className="gs-value text-muted">?{gitStatus.untrackedFiles.length}</span>
            </div>
          </div>

          {/* Unified Diff Box */}
          <div className="git-diff-container">
            <div className="diff-header-row">
              <FileCode size={13} />
              <span>UNIFIED WORKSPACE DIFF</span>
            </div>
            <pre className="git-diff-content">
              {diffText || '# No unstaged changes detected.'}
            </pre>
          </div>

          {/* Commit Form */}
          <form onSubmit={handleCommit} className="git-commit-form">
            <input
              type="text"
              className="commit-input"
              placeholder="Enter commit message..."
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              disabled={committing}
            />
            <button type="submit" className="commit-submit-btn" disabled={committing || !commitMsg.trim()}>
              <GitCommit size={14} />
              <span>{committing ? 'COMMITTING...' : 'CREATE COMMIT'}</span>
            </button>
          </form>

          {commitHash && (
            <div className="commit-success-badge">
              <Check size={14} />
              <span>Commit recorded successfully: {commitHash}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
