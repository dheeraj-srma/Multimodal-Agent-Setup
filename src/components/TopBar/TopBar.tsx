import React, { useState, useEffect } from 'react';
import {
  Search,
  Activity,
  Cpu,
  Clock,
  GitBranch,
  FileCode,
  FileText,
  Settings as SettingsIcon,
  Play,
  Pause,
  Square,
  User,
  Radio,
} from 'lucide-react';
import { Mission, GitStatusInfo } from '../../types';
import './TopBar.css';

interface TopBarProps {
  mission?: Mission;
  gitStatus: GitStatusInfo;
  activeAgentsCount: number;
  onOpenGitModal: () => void;
  onOpenDiffModal: () => void;
  onOpenReportModal: () => void;
  onOpenSettingsModal: () => void;
  onPauseAll: () => void;
  onResumeAll: () => void;
  onStopAll: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  mission,
  gitStatus,
  activeAgentsCount,
  onOpenGitModal,
  onOpenDiffModal,
  onOpenReportModal,
  onOpenSettingsModal,
  onPauseAll,
  onResumeAll,
  onStopAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('Project: Portfolio Revamp');
  const [elapsedSec, setElapsedSec] = useState(872); // Starts at 00:14:32 for live fidelity

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h > 0 ? `${h.toString().padStart(2, '0')}:` : ''}${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isRunning = mission?.status === 'RUNNING';
  const isPaused = mission?.status === 'PAUSED';

  return (
    <header className="acc-topbar">
      {/* Search / Active Project */}
      <div className="topbar-search-wrapper">
        <Search size={14} className="topbar-search-icon" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="topbar-search-input"
          placeholder="Search project or directive..."
        />
      </div>

      {/* Center Status Indicators */}
      <div className="topbar-center-pills">
        {/* Active Agents Badge */}
        <div className="hud-pill agents-active-pill">
          <span className="pulsing-green-dot"></span>
          <span className="pill-text-strong">{activeAgentsCount} Agents Active</span>
        </div>

        {/* Stopwatch Timer */}
        <div className="hud-pill timer-pill">
          <Clock size={12} className="pill-icon-cyan" />
          <span className="pill-mono-text">{formatElapsed(elapsedSec)}</span>
        </div>

        {/* Hardware Status Gauges */}
        <div className="hud-pill metric-pill">
          <span className="metric-chip">
            <span className="chip-label">CPU</span>
            <span className="chip-val">42%</span>
          </span>
          <span className="chip-divider">/</span>
          <span className="metric-chip">
            <span className="chip-label">RAM</span>
            <span className="chip-val">68%</span>
          </span>
        </div>

        {/* System Online Badge */}
        <div className="hud-pill online-pill">
          <Radio size={12} className="pill-icon-emerald" />
          <span className="online-label">Online</span>
        </div>
      </div>

      {/* Right Controls & Profile */}
      <div className="topbar-right-actions">
        {/* Git Branch Pill */}
        <div className="git-branch-pill" onClick={onOpenGitModal} title="Git repository status">
          <GitBranch size={13} className="git-icon" />
          <span className="git-branch-name">{gitStatus.currentBranch || 'main'}</span>
          {gitStatus.modifiedFiles.length > 0 && (
            <span className="git-mod-tag">~{gitStatus.modifiedFiles.length}</span>
          )}
          {gitStatus.addedFiles.length > 0 && (
            <span className="git-add-tag">+{gitStatus.addedFiles.length}</span>
          )}
        </div>

        {/* Swarm Controls */}
        {isRunning && (
          <button className="hud-action-btn btn-amber" onClick={onPauseAll} title="Pause Swarm">
            <Pause size={13} />
            <span>Pause</span>
          </button>
        )}
        {isPaused && (
          <button className="hud-action-btn btn-emerald" onClick={onResumeAll} title="Resume Swarm">
            <Play size={13} />
            <span>Resume</span>
          </button>
        )}
        {(isRunning || isPaused) && (
          <button className="hud-action-btn btn-rose" onClick={onStopAll} title="Stop Swarm">
            <Square size={13} />
            <span>Stop</span>
          </button>
        )}

        {/* Diff Viewer Button */}
        <button className="hud-icon-btn" onClick={onOpenDiffModal} title="View Git Diffs">
          <FileCode size={15} />
        </button>

        {/* Mission Report Button */}
        <button
          className={`hud-icon-btn ${mission?.finalReport ? 'report-glow' : ''}`}
          onClick={onOpenReportModal}
          title="Mission Summary Report"
        >
          <FileText size={15} />
        </button>

        {/* Settings Button */}
        <button className="hud-icon-btn" onClick={onOpenSettingsModal} title="Settings & Models">
          <SettingsIcon size={15} />
        </button>

        {/* User Profile Avatar */}
        <div className="user-avatar-pill" title="Operator Profile">
          <div className="avatar-circle">
            <User size={14} />
          </div>
        </div>
      </div>
    </header>
  );
};
