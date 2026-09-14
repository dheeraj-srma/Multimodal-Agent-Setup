import React, { useState, useEffect, useRef } from 'react';
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
  Coins,
  ChevronDown,
  AlertTriangle,
  Layers,
  Sparkles,
  TrendingDown,
  X,
} from 'lucide-react';
import { Mission, GitStatusInfo, AgentId } from '../../types';
import {
  getSessionCostBreakdown,
  ROLE_COLORS,
  ROLE_GLOWS,
} from '../../config/models';
import './TopBar.css';

interface TopBarProps {
  mission?: Mission;
  gitStatus: GitStatusInfo;
  activeAgentsCount: number;
  sessionTokens?: number;
  sessionCost?: number;
  customAssignments?: Partial<Record<AgentId, string>>;
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
  sessionTokens = 125500,
  sessionCost = 0.18,
  customAssignments = {},
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
  const [showCostPopover, setShowCostPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowCostPopover(false);
      }
    };
    if (showCostPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCostPopover]);

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

  const breakdown = getSessionCostBreakdown(customAssignments, 1400);

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

        {/* Token / Cost Telemetry Pill - Clickable for Cost Breakdown */}
        <div className="token-popover-anchor" ref={popoverRef}>
          <div
            className={`hud-pill token-pill token-pill-interactive ${showCostPopover ? 'token-pill-active' : ''}`}
            onClick={() => setShowCostPopover(!showCostPopover)}
            title="Click to view model & agent cost breakdown"
          >
            <Coins size={12} color="#f59e0b" />
            <span className="pill-mono-text" style={{ color: '#f59e0b' }}>
              {(sessionTokens / 1000).toFixed(1)}k tok • ${sessionCost.toFixed(2)}
            </span>
            <ChevronDown size={10} color="#f59e0b" className={`cost-chevron ${showCostPopover ? 'rotated' : ''}`} />
          </div>

          {/* Interactive Cost Breakdown Popover */}
          {showCostPopover && (
            <div className="cost-breakdown-popover">
              <div className="cbp-header">
                <div className="cbp-title-group">
                  <Coins size={14} color="#f59e0b" />
                  <span className="cbp-title">SWARM TOKEN & SPEND BREAKDOWN</span>
                </div>
                <button className="cbp-close-btn" onClick={() => setShowCostPopover(false)}>
                  <X size={12} />
                </button>
              </div>

              {/* Total Spend Summary Bar */}
              <div className="cbp-summary-hero">
                <div className="cbp-hero-metric">
                  <span className="cbp-hero-label">SESSION SPEND</span>
                  <span className="cbp-hero-value">${sessionCost.toFixed(2)}</span>
                </div>
                <div className="cbp-hero-metric">
                  <span className="cbp-hero-label">TOTAL TOKENS</span>
                  <span className="cbp-hero-value">{(sessionTokens / 1000).toFixed(1)}k</span>
                </div>
                <div className="cbp-hero-metric">
                  <span className="cbp-hero-label">RETRY OVERHEAD</span>
                  <span className="cbp-hero-value" style={{ color: '#f43f5e' }}>
                    +1.4k tok (${breakdown.retryWastedCost.toFixed(3)})
                  </span>
                </div>
              </div>

              {/* Model Heterogeneity Spend Table */}
              <div className="cbp-models-section">
                <span className="cbp-section-title">HETEROGENEOUS MODEL SPEND MATRIX</span>
                <div className="cbp-model-list">
                  {breakdown.items.map((item) => (
                    <div key={item.agentId} className="cbp-model-row">
                      <div className="cbp-row-info">
                        <div className="cbp-name-badge">
                          <span className="cbp-role-dot" style={{ background: ROLE_COLORS[item.agentId] }}></span>
                          <span className="cbp-model-name">{item.modelName}</span>
                          <span className="cbp-role-tag" style={{ color: ROLE_COLORS[item.agentId] }}>
                            @{item.agentId}
                          </span>
                        </div>
                        <div className="cbp-spend-digits">
                          <span className="cbp-tokens-text">{(item.tokens / 1000).toFixed(1)}k tok</span>
                          <span
                            className="cbp-cost-text"
                            style={{ color: item.isSubscriptionNative ? '#34d399' : '#f59e0b' }}
                          >
                            {item.isSubscriptionNative ? '$0.00 (Native)' : `$${item.cost.toFixed(3)}`}
                          </span>
                        </div>
                      </div>

                      {/* Percentage Bar */}
                      <div className="cbp-spend-bar-track">
                        <div
                          className="cbp-spend-bar-fill"
                          style={{
                            width: `${Math.max(item.percentage, 4)}%`,
                            backgroundColor: item.isSubscriptionNative ? '#34d399' : ROLE_COLORS[item.agentId],
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Failure / Retry Waste Accounting */}
              <div className="cbp-retry-waste-notice">
                <AlertTriangle size={12} color="#f43f5e" />
                <div className="cbp-retry-waste-text">
                  <span className="crw-bold">Failure / Retry Spend Consequence:</span>{' '}
                  1 task retried during lint audit. Caused +1,400 extra tokens (+${breakdown.retryWastedCost.toFixed(3)}) spend.
                </div>
              </div>
            </div>
          )}
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
