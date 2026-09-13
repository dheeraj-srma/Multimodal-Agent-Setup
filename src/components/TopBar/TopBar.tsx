import React from 'react';
import {
  Cpu,
  GitBranch,
  FileCode,
  FileText,
  Settings as SettingsIcon,
  Play,
  Pause,
  Square,
  ShieldCheck,
} from 'lucide-react';
import { Mission, GitStatusInfo } from '../../types';
import './TopBar.css';

interface TopBarProps {
  mission?: Mission;
  gitStatus: GitStatusInfo;
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
  onOpenGitModal,
  onOpenDiffModal,
  onOpenReportModal,
  onOpenSettingsModal,
  onPauseAll,
  onResumeAll,
  onStopAll,
}) => {
  const isRunning = mission?.status === 'RUNNING';
  const isPaused = mission?.status === 'PAUSED';

  return (
    <header className="acc-topbar">
      <div className="topbar-left">
        <div className="brand-badge">
          <div className="brand-logo">
            <Cpu size={18} className="brand-icon" />
          </div>
          <div className="brand-text">
            <span className="brand-title">AGENT COMMAND CENTER</span>
            <span className="brand-subtitle">SWARM MISSION CONTROL v1.0</span>
          </div>
        </div>

        <div className="system-status-indicator">
          <span className="radar-dot" style={{ backgroundColor: 'var(--telemetry-emerald)' }}></span>
          <span className="status-label">SYSTEM ONLINE</span>
        </div>

        <div className="project-pill" onClick={onOpenGitModal} title="Click to view Git details">
          <GitBranch size={13} className="pill-icon" />
          <span className="pill-text">{gitStatus.currentBranch}</span>
          <div className="git-changes-tag">
            {gitStatus.modifiedFiles.length > 0 && (
              <span className="git-mod">~{gitStatus.modifiedFiles.length}</span>
            )}
            {gitStatus.addedFiles.length > 0 && (
              <span className="git-add">+{gitStatus.addedFiles.length}</span>
            )}
          </div>
        </div>
      </div>

      <div className="topbar-center">
        {mission && (
          <div className="telemetry-bar">
            <div className="telemetry-item">
              <span className="tel-label">AGENTS</span>
              <span className="tel-value tel-cyan">{mission.activeAgentsCount}</span>
            </div>
            <div className="telemetry-divider"></div>
            <div className="telemetry-item">
              <span className="tel-label">TASKS</span>
              <span className="tel-value">
                {mission.completedTasksCount} / {mission.tasks.length}
              </span>
            </div>
            <div className="telemetry-divider"></div>
            <div className="telemetry-item" title="Wall clock duration vs cumulative agent time">
              <span className="tel-label">PARALLELISM</span>
              <span className="tel-value tel-emerald">{mission.parallelismFactor.toFixed(1)}x</span>
            </div>
            <div className="telemetry-divider"></div>
            <div className="telemetry-item">
              <span className="tel-label">STATUS</span>
              <span
                className={`tel-badge badge-${mission.status.toLowerCase()}`}
              >
                {mission.status}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="topbar-right">
        {isRunning && (
          <button className="top-action-btn btn-pause" onClick={onPauseAll} title="Pause All Agents">
            <Pause size={14} />
            <span>PAUSE</span>
          </button>
        )}
        {isPaused && (
          <button className="top-action-btn btn-resume" onClick={onResumeAll} title="Resume Mission">
            <Play size={14} />
            <span>RESUME</span>
          </button>
        )}
        {(isRunning || isPaused) && (
          <button className="top-action-btn btn-stop" onClick={onStopAll} title="Stop Swarm">
            <Square size={14} />
            <span>ABORT</span>
          </button>
        )}

        <button className="icon-nav-btn" onClick={onOpenDiffModal} title="Inspect Workspace Diffs">
          <FileCode size={16} />
          <span>Diff</span>
        </button>

        <button
          className={`icon-nav-btn ${mission?.finalReport ? 'report-ready-glow' : ''}`}
          onClick={onOpenReportModal}
          title="View Mission Report"
        >
          <FileText size={16} />
          <span>Report</span>
        </button>

        <button className="icon-nav-btn" onClick={onOpenSettingsModal} title="Settings & Providers">
          <SettingsIcon size={16} />
        </button>
      </div>
    </header>
  );
};
