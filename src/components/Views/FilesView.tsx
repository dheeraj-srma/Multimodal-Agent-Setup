import React, { useState } from 'react';
import {
  FolderTree,
  FileCode,
  FilePlus,
  FileX,
  FileQuestion,
  RotateCw,
  GitCommit,
  Check,
  ShieldCheck,
  Search,
  Copy,
  Terminal,
} from 'lucide-react';
import { GitStatusInfo } from '../../types';
import './FilesView.css';

interface FilesViewProps {
  gitStatus: GitStatusInfo;
  diffText: string;
  onRefresh: () => void;
  onCommit: (message: string) => Promise<{ success: boolean; hash?: string }>;
}

export const FilesView: React.FC<FilesViewProps> = ({
  gitStatus,
  diffText,
  onRefresh,
  onCommit,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [commitMsg, setCommitMsg] = useState('chore(workspace): sync verified agent file changes');
  const [committing, setCommitting] = useState(false);
  const [commitHash, setCommitHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const allFiles = [
    ...gitStatus.modifiedFiles.map((f) => ({ path: f, type: 'modified' as const })),
    ...gitStatus.addedFiles.map((f) => ({ path: f, type: 'added' as const })),
    ...gitStatus.deletedFiles.map((f) => ({ path: f, type: 'deleted' as const })),
    ...gitStatus.untrackedFiles.map((f) => ({ path: f, type: 'untracked' as const })),
  ];

  const filteredFiles = allFiles.filter((f) =>
    f.path.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const handleCommitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMsg.trim() || committing) return;
    setCommitting(true);
    const res = await onCommit(commitMsg.trim());
    setCommitting(false);
    if (res.success) {
      setCommitHash(res.hash || 'HEAD');
      setTimeout(() => setCommitHash(null), 4000);
    }
  };

  const handleCopyDiff = () => {
    if (!diffText) return;
    navigator.clipboard.writeText(diffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="files-view-container">
      {/* Top Banner */}
      <div className="files-view-header">
        <div className="fvh-title-group">
          <FolderTree size={18} className="fvh-icon" />
          <div>
            <h2 className="fvh-title">WORKSPACE FILES & UNIFIED DIFF EXPLORER</h2>
            <span className="fvh-subtitle">
              Live tracking of files touched, edited, and verified across agent operations
            </span>
          </div>
        </div>

        <div className="fvh-actions">
          <div className="fvh-safety-badge" title="Protected: .git, node_modules, package.json, .env">
            <ShieldCheck size={13} color="#10b981" />
            <span>Safety Guard Active</span>
          </div>
          <button className="fvh-refresh-btn" onClick={onRefresh} title="Scan Workspace for Changes">
            <RotateCw size={13} />
            <span>Refresh Files</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="files-view-grid">
        {/* Left Column: File Explorer Tree */}
        <div className="files-tree-panel">
          <div className="ftp-header">
            <div className="ftp-search-wrapper">
              <Search size={13} color="#64748b" />
              <input
                type="text"
                placeholder="Filter files..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="ftp-search-input"
              />
            </div>
          </div>

          {/* Metric Chips */}
          <div className="ftp-metrics-row">
            <div className="ftp-chip chip-modified" title="Modified files">
              <span>~{gitStatus.modifiedFiles.length} Modified</span>
            </div>
            <div className="ftp-chip chip-added" title="Added files">
              <span>+{gitStatus.addedFiles.length} Added</span>
            </div>
            <div className="ftp-chip chip-untracked" title="Untracked files">
              <span>?{gitStatus.untrackedFiles.length} New</span>
            </div>
          </div>

          {/* Files List */}
          <div className="ftp-files-list">
            {filteredFiles.length === 0 ? (
              <div className="ftp-empty">
                {filterQuery ? 'No files match filter.' : 'Workspace is clean. No changed files.'}
              </div>
            ) : (
              filteredFiles.map((file) => {
                const isSelected = selectedFile === file.path;
                return (
                  <div
                    key={file.path}
                    className={`ftp-file-item ${isSelected ? 'ftp-item-selected' : ''}`}
                    onClick={() => setSelectedFile(file.path)}
                  >
                    <div className="ffi-left">
                      {file.type === 'modified' && <FileCode size={14} className="ffi-icon icon-amber" />}
                      {file.type === 'added' && <FilePlus size={14} className="ffi-icon icon-emerald" />}
                      {file.type === 'deleted' && <FileX size={14} className="ffi-icon icon-rose" />}
                      {file.type === 'untracked' && <FileQuestion size={14} className="ffi-icon icon-slate" />}
                      <span className="ffi-path" title={file.path}>
                        {file.path}
                      </span>
                    </div>
                    <span className={`ffi-badge badge-${file.type}`}>
                      {file.type.toUpperCase()}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Protected Workspace Rules Info */}
          <div className="ftp-footer-rules">
            <span className="ffr-title">IMMUTABLE ARTIFACTS (PROTECTED):</span>
            <span className="ffr-text">.git/ • node_modules/ • package.json • .env</span>
          </div>
        </div>

        {/* Right Column: Unified Diff Viewer & Commit Console */}
        <div className="files-diff-panel">
          <div className="fdp-header">
            <div className="fdp-title-group">
              <Terminal size={14} color="#38bdf8" />
              <span>UNIFIED WORKSPACE DIFF</span>
              {selectedFile && <span className="fdp-file-tag">{selectedFile}</span>}
            </div>
            <button className="fdp-copy-btn" onClick={handleCopyDiff} disabled={!diffText}>
              {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
              <span>{copied ? 'Copied!' : 'Copy Diff'}</span>
            </button>
          </div>

          <div className="fdp-body">
            <pre className="fdp-diff-pre">
              {diffText || '# No unstaged or staged modifications in workspace.'}
            </pre>
          </div>

          {/* Quick Commit Deck */}
          <form onSubmit={handleCommitSubmit} className="fdp-commit-deck">
            <input
              type="text"
              className="fdp-commit-input"
              placeholder="Commit message (e.g. feat(ui): apply agent swarm modifications)..."
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              disabled={committing}
            />
            <button
              type="submit"
              className="fdp-commit-btn"
              disabled={committing || !commitMsg.trim() || allFiles.length === 0}
            >
              <GitCommit size={14} />
              <span>{committing ? 'COMMITTING...' : 'COMMIT CHANGES'}</span>
            </button>
          </form>

          {commitHash && (
            <div className="fdp-commit-success">
              <Check size={14} color="#10b981" />
              <span>Commit applied to branch {gitStatus.currentBranch}: {commitHash}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
