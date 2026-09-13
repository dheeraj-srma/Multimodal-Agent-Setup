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

  const defaultCpu = status.agentId === 'coder' ? 58 : status.agentId === 'orchestrator' ? 34 : status.agentId === 'design' ? 26 : status.agentId === 'tester' ? 22 : 19;
  const defaultTokens = status.agentId === 'orchestrator' ? '48.2k' : status.agentId === 'coder' ? '32.1k' : status.agentId === 'design' ? '18.4k' : status.agentId === 'research' ? '14.8k' : '12.0k';

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

      {/* Mini Resource & Token Gauge Bar */}
      <div className="card-resource-row">
        <div className="cr-item">
          <Cpu size={10} color={roleColor} />
          <span>CPU {status.cpuPercent || defaultCpu}%</span>
        </div>
        <div className="cr-divider">•</div>
        <div className="cr-item">
          <Coins size={10} color="#f59e0b" />
          <span>{status.promptTokens ? `${Math.round((status.promptTokens + (status.completionTokens || 0)) / 1000)}k` : defaultTokens} tokens</span>
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
