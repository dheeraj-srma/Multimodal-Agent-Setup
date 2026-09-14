import React from 'react';
import {
  Brain,
  Palette,
  Code,
  FlaskConical,
  CheckCircle2,
  FileCheck,
  MessageSquare,
  Clock,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Lock,
  AlertCircle,
  Coins,
  Cpu,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { AgentId, AgentStatus, AgentEvent } from '../../types';
import { ROLE_COLORS, ROLE_GLOWS } from '../../config/models';
import './AgentCard.css';

interface AgentCardProps {
  status: AgentStatus;
  recentLogs: AgentEvent[];
  isSelected: boolean;
  onSelect: (agentId: AgentId) => void;
  onPause?: (agentId: AgentId) => void;
  onResume?: (agentId: AgentId) => void;
  onRetry?: (agentId: AgentId) => void;
}

const AGENT_ICONS: Record<AgentId, any> = {
  orchestrator: Brain,
  design: Palette,
  coder: Code,
  research: FlaskConical,
  tester: FileCheck,
};

// Burn rate sparkline profiles per agent
const BURN_SPARKLINES: Record<AgentId, number[]> = {
  orchestrator: [20, 26, 32, 45, 38, 52, 42, 34],
  design: [14, 18, 22, 28, 30, 24, 20, 26],
  coder: [32, 48, 62, 78, 85, 70, 64, 58], // Active coder spike
  research: [10, 16, 22, 24, 18, 15, 20, 19],
  tester: [12, 18, 25, 36, 42, 30, 28, 22],
};

export const AgentCard: React.FC<AgentCardProps> = ({
  status,
  recentLogs,
  isSelected,
  onSelect,
  onPause,
  onResume,
  onRetry,
}) => {
  const Icon = AGENT_ICONS[status.agentId] || Code;
  const roleColor = ROLE_COLORS[status.agentId] || '#38bdf8';
  const roleGlow = ROLE_GLOWS[status.agentId] || 'rgba(56, 189, 248, 0.4)';

  const isWorking = status.state === 'WORKING' || status.state === 'STARTING' || status.state === 'REVIEWING';
  const isBlocked = status.isBlocked || status.state === 'BLOCKED' || status.state === 'WAITING';
  const isFailed = status.state === 'FAILED';
  const isCompleted = status.state === 'COMPLETED';
  const retryCount = status.retryCount || (isFailed ? 1 : 0);
  const wastedTokens = retryCount * 1400;
  const wastedCost = (wastedTokens / 1_000_000) * 2.5;

  const defaultCpu = status.agentId === 'coder' ? 58 : status.agentId === 'orchestrator' ? 34 : status.agentId === 'design' ? 26 : status.agentId === 'tester' ? 22 : 19;
  const defaultTokens = status.agentId === 'orchestrator' ? '48.2k' : status.agentId === 'coder' ? '32.1k' : status.agentId === 'design' ? '18.4k' : status.agentId === 'research' ? '14.8k' : '12.0k';
  const sparklineData = BURN_SPARKLINES[status.agentId] || [20, 30, 25, 35, 40, 30, 28, 32];

  const handleCardClick = (e: React.MouseEvent) => {
    onSelect(status.agentId);
  };

  const handleTogglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWorking) {
      if (onPause) onPause(status.agentId);
    } else {
      if (onResume) onResume(status.agentId);
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRetry) onRetry(status.agentId);
  };

  return (
    <div
      className={`agent-node-card ${isSelected ? 'card-selected' : ''} ${isBlocked ? 'card-blocked' : ''} ${
        isFailed ? 'card-failed' : ''
      }`}
      onClick={handleCardClick}
      style={{
        '--agent-color': roleColor,
        '--agent-glow': roleGlow,
        borderColor: isSelected ? roleColor : isFailed ? '#f43f5e' : isBlocked ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)',
      } as React.CSSProperties}
    >
      {/* Header */}
      <div className="card-top-row">
        <div className="agent-identity">
          <div className="agent-avatar-icon" style={{ borderColor: roleColor, color: roleColor }}>
            <Icon size={16} />
          </div>
          <div className="agent-names">
            <span className="agent-role-title">{status.role}</span>
            <span className="agent-sub-id">@{status.agentId}</span>
          </div>
        </div>

        {/* State Pill */}
        <div
          className="card-state-pill"
          style={{
            borderColor: isFailed ? '#f43f5e' : isBlocked ? '#f59e0b' : isCompleted ? '#34d399' : roleColor,
            color: isFailed ? '#f43f5e' : isBlocked ? '#f59e0b' : isCompleted ? '#34d399' : roleColor,
          }}
        >
          {isBlocked && <Lock size={10} className="mr-1" />}
          {isFailed && <AlertCircle size={10} className="mr-1" />}
          {isCompleted && <CheckCircle2 size={10} className="mr-1" />}
          <span className="state-text">
            {isBlocked ? 'BLOCKED' : isFailed ? 'FAILED' : status.state}
          </span>
        </div>
      </div>

      {/* Current Task Description */}
      <div className="card-task-section">
        <div className="task-title-text">
          {status.currentTaskTitle || 'Awaiting task assignment from Orchestrator...'}
        </div>
      </div>

      {/* Progress Bar with Role Color */}
      <div className="card-progress-bar-wrapper">
        <div className="progress-track">
          <div
            className={`progress-fill ${isWorking ? 'shimmer-active' : ''}`}
            style={{
              width: `${status.progress}%`,
              backgroundColor: isFailed ? '#f43f5e' : isBlocked ? '#f59e0b' : roleColor,
            }}
          ></div>
        </div>
        <span className="progress-percent-label">{status.progress}%</span>
      </div>

      {/* Failure & Retry Spend Consequence Notice */}
      {(isFailed || retryCount > 0) && (
        <div className="card-retry-consequence-badge">
          <div className="crcb-left">
            <AlertTriangle size={11} color="#f43f5e" />
            <span className="crcb-text">
              Retry #{retryCount}: +{(wastedTokens / 1000).toFixed(1)}k tok (${wastedCost.toFixed(3)} waste)
            </span>
          </div>
          {isFailed && (
            <button className="crcb-retry-btn" onClick={handleRetry}>
              <RotateCcw size={10} />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {/* Inline Sparkline & Resource Burn Telemetry Meter */}
      <div className="card-burn-telemetry-box">
        {/* Left: CPU Meter */}
        <div className="burn-metric-group">
          <div className="burn-label-row">
            <Cpu size={10} color={roleColor} />
            <span className="burn-label">CPU {status.cpuPercent || defaultCpu}%</span>
          </div>
          <div className="cpu-segmented-bar">
            <span className={`cpu-seg ${(status.cpuPercent || defaultCpu) > 10 ? 'seg-active' : ''}`}></span>
            <span className={`cpu-seg ${(status.cpuPercent || defaultCpu) > 30 ? 'seg-active' : ''}`}></span>
            <span className={`cpu-seg ${(status.cpuPercent || defaultCpu) > 55 ? 'seg-spike' : ''}`}></span>
            <span className={`cpu-seg ${(status.cpuPercent || defaultCpu) > 75 ? 'seg-danger' : ''}`}></span>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="burn-box-divider"></div>

        {/* Right: Token Burn Rate Inline Sparkline */}
        <div className="burn-metric-group">
          <div className="burn-label-row">
            <Coins size={10} color="#f59e0b" />
            <span className="burn-label">
              {status.promptTokens ? `${Math.round((status.promptTokens + (status.completionTokens || 0)) / 1000)}k` : defaultTokens} tok
            </span>
          </div>
          {/* Mini 8-Bar Burn Sparkline */}
          <div className="mini-burn-sparkline">
            {sparklineData.map((val, idx) => {
              const h = Math.max(3, Math.round((val / 90) * 14));
              const isSpike = val > 65;
              return (
                <span
                  key={idx}
                  className={`spark-bar ${isSpike ? 'spark-spike' : ''}`}
                  style={{
                    height: `${h}px`,
                    backgroundColor: isSpike ? '#f59e0b' : roleColor,
                  }}
                  title={`Burn interval ${idx + 1}: ${val} tok/sec`}
                ></span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current Activity Ticker */}
      <div className="card-current-action">
        <span className="action-tag" style={{ color: roleColor }}>ACTION</span>
        <span className="action-text">
          {status.currentAction || (isWorking ? 'Processing swarm directives' : 'Ready on standby')}
        </span>
      </div>

      {/* Footer Telemetry & Per-Agent Controls */}
      <div className="card-footer-telemetry">
        <div className="footer-left-meta">
          <span title="Files modified">Files: {status.filesTouchedCount}</span>
          <span>•</span>
          <span title="Messages exchanged">Msgs: {status.messagesCount}</span>
        </div>

        <div className="footer-right-controls">
          {onPause && onResume && (
            <button
              className="card-quick-btn"
              onClick={handleTogglePause}
              title={isWorking ? 'Pause agent' : 'Resume agent'}
            >
              {isWorking ? <Pause size={11} color="#f59e0b" /> : <Play size={11} color="#34d399" />}
            </button>
          )}

          {isFailed && onRetry && (
            <button className="card-quick-btn btn-retry" onClick={handleRetry} title="Retry failed task">
              <RotateCcw size={11} color="#f43f5e" />
            </button>
          )}

          <div className="inspect-arrow">
            <span>Inspect</span>
            <ChevronRight size={11} />
          </div>
        </div>
      </div>
    </div>
  );
};
