import React, { useState } from 'react';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  Check,
  RotateCw,
  Clock,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  FileCode,
  CheckCircle2,
} from 'lucide-react';
import { GitStatusInfo } from '../../types';
import './GitView.css';

interface GitViewProps {
  gitStatus: GitStatusInfo;
  diffText: string;
  onRefresh: () => void;
  onCommit: (message: string) => Promise<{ success: boolean; hash?: string }>;
}

export const GitView: React.FC<GitViewProps> = ({
  gitStatus,
  diffText,
  onRefresh,
  onCommit,
}) => {
  const [commitMsg, setCommitMsg] = useState('chore(swarm): apply agent swarm verified updates');
  const [committing, setCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(true);

  const handleCommitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMsg.trim() || committing) return;
    setCommitting(true);
    const res = await onCommit(commitMsg.trim());
    setCommitting(false);
    if (res.success) {
      setCommitSuccess(res.hash || 'HEAD');
      setTimeout(() => setCommitSuccess(null), 5000);
    }
  };

  const totalChanges =
    gitStatus.modifiedFiles.length +
    gitStatus.addedFiles.length +
    gitStatus.deletedFiles.length +
    gitStatus.untrackedFiles.length;

  return (
    <div className="git-view-container">
      {/* Top Header */}
      <div className="git-view-header">
        <div className="gvh-title-group">
          <GitBranch size={18} className="gvh-icon" />
          <div>
            <h2 className="gvh-title">GIT VERSION CONTROL & REPO OPERATIONS</h2>
            <span className="gvh-subtitle">
              Synchronize agent codebase modifications, inspection diffs, and commit history
            </span>
          </div>
        </div>

        <button className="gvh-refresh-btn" onClick={onRefresh}>
          <RotateCw size={13} />
          <span>Sync Repo Status</span>
        </button>
      </div>

      {/* Top 4 Metrics Summary Cards */}
      <div className="git-view-cards-grid">
        <div className="gvc-card card-branch">
          <div className="gvc-label">
            <GitBranch size={13} />
            <span>ACTIVE BRANCH</span>
          </div>
          <div className="gvc-value text-cyan">{gitStatus.currentBranch}</div>
          <div className="gvc-sub">
            <ArrowUpRight size={11} /> {gitStatus.aheadCount} Ahead • <ArrowDownLeft size={11} /> {gitStatus.behindCount} Behind
          </div>
        </div>

        <div className="gvc-card">
          <div className="gvc-label">
            <FileCode size={13} />
            <span>MODIFIED FILES</span>
          </div>
          <div className="gvc-value text-amber">~{gitStatus.modifiedFiles.length}</div>
          <div className="gvc-sub">Staged / Unstaged in worktree</div>
        </div>

        <div className="gvc-card">
          <div className="gvc-label">
            <CheckCircle2 size={13} />
            <span>ADDED / CREATED</span>
          </div>
          <div className="gvc-value text-emerald">+{gitStatus.addedFiles.length}</div>
          <div className="gvc-sub">New files by agent directives</div>
        </div>

        <div className="gvc-card">
          <div className="gvc-label">
            <GitCommit size={13} />
            <span>TOTAL UNCOMMITTED</span>
          </div>
          <div className="gvc-value text-rose">{totalChanges}</div>
          <div className="gvc-sub">{totalChanges === 0 ? 'Working tree clean' : 'Pending review commit'}</div>
        </div>
      </div>

      {/* Commit Box */}
      <div className="git-view-commit-box">
        <div className="gcb-title-row">
          <GitCommit size={14} color="#38bdf8" />
          <span>CREATE REPOSITORY COMMIT</span>
        </div>
        <form onSubmit={handleCommitSubmit} className="gcb-form">
          <input
            type="text"
            className="gcb-input"
            placeholder="Commit message (e.g. feat(agent): apply verified multi-agent updates)..."
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            disabled={committing}
          />
          <button
            type="submit"
            className="gcb-submit-btn"
            disabled={committing || !commitMsg.trim() || totalChanges === 0}
          >
            <GitCommit size={14} />
            <span>{committing ? 'COMMITTING...' : 'COMMIT CHANGES'}</span>
          </button>
        </form>

        {commitSuccess && (
          <div className="gcb-success">
            <Check size={14} color="#10b981" />
            <span>Commit successfully created: {commitSuccess}</span>
          </div>
        )}
      </div>

      {/* Two Column Layout: Recent Commits & Diff Preview */}
      <div className="git-view-details-grid">
        {/* Recent Commits Log */}
        <div className="git-history-panel">
          <div className="ghp-header">
            <div className="ghp-title">
              <Clock size={14} color="#c084fc" />
              <span>RECENT COMMITS LOG</span>
            </div>
            <span className="ghp-count">({gitStatus.recentCommits?.length || 0})</span>
          </div>

          <div className="ghp-list">
            {!gitStatus.recentCommits || gitStatus.recentCommits.length === 0 ? (
              <div className="ghp-empty">No recent commits recorded.</div>
            ) : (
              gitStatus.recentCommits.map((c) => (
                <div key={c.hash} className="ghp-commit-item">
                  <div className="gci-top">
                    <span className="gci-hash">{c.hash.slice(0, 7)}</span>
                    <span className="gci-author">
                      <User size={10} /> {c.author}
                    </span>
                    <span className="gci-date">{c.date}</span>
                  </div>
                  <div className="gci-msg">{c.message}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Diff Preview Panel */}
        <div className="git-diff-panel">
          <div className="gdp-header">
            <div className="gdp-title">
              <FileCode size={14} color="#38bdf8" />
              <span>CURRENT WORKSPACE DIFF</span>
            </div>
            <button className="gdp-toggle-btn" onClick={() => setShowDiff(!showDiff)}>
              {showDiff ? 'Collapse Diff' : 'Expand Diff'}
            </button>
          </div>

          {showDiff && (
            <div className="gdp-body">
              <pre className="gdp-pre">
                {diffText || '# No unstaged changes in working tree.'}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
