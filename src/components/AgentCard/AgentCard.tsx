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
} from 'lucide-react';
import { AgentId, AgentStatus, AgentEvent } from '../../types';
import './AgentCard.css';

interface AgentCardProps {
  status: AgentStatus;
  recentLogs: AgentEvent[];
  isSelected: boolean;
  onSelect: (agentId: AgentId) => void;
}

const AGENT_META: Record<
  AgentId,
  { icon: any; colorVar: string; pulseClass: string }
> = {
  orchestrator: { icon: Brain, colorVar: 'var(--telemetry-cyan)', pulseClass: 'pulse-cyan' },
  design: { icon: Palette, colorVar: 'var(--telemetry-violet)', pulseClass: 'pulse-violet' },
  coder: { icon: Code, colorVar: 'var(--telemetry-blue)', pulseClass: 'pulse-blue' },
  research: { icon: FlaskConical, colorVar: 'var(--telemetry-emerald)', pulseClass: 'pulse-emerald' },
  tester: { icon: FileCheck, colorVar: 'var(--telemetry-amber)', pulseClass: 'pulse-amber' },
};

const STATE_COLORS: Record<string, { label: string; color: string; dot: string }> = {
  IDLE: { label: 'IDLE', color: 'var(--text-muted)', dot: '⚪' },
  QUEUED: { label: 'QUEUED', color: 'var(--telemetry-amber)', dot: '🟡' },
  STARTING: { label: 'STARTING', color: 'var(--telemetry-cyan)', dot: '🟢' },
  WORKING: { label: 'WORKING', color: 'var(--telemetry-emerald)', dot: '🟢' },
  WAITING: { label: 'WAITING', color: 'var(--telemetry-amber)', dot: '🟡' },
  BLOCKED: { label: 'BLOCKED', color: 'var(--telemetry-amber)', dot: '🟠' },
  REVIEWING: { label: 'REVIEWING', color: 'var(--telemetry-blue)', dot: '🔵' },
  COMPLETED: { label: 'COMPLETED', color: 'var(--telemetry-emerald)', dot: '✓' },
  FAILED: { label: 'FAILED', color: 'var(--telemetry-rose)', dot: '🔴' },
  STOPPED: { label: 'STOPPED', color: 'var(--text-dim)', dot: '⏹' },
};

export const AgentCard: React.FC<AgentCardProps> = ({ status, recentLogs, isSelected, onSelect }) => {
  const meta = AGENT_META[status.agentId] || AGENT_META.coder;
  const Icon = meta.icon;
  const stateMeta = STATE_COLORS[status.state] || STATE_COLORS.IDLE;
  const isActive = status.state === 'WORKING' || status.state === 'STARTING' || status.state === 'REVIEWING';

  return (
    <div
      className={`agent-node-card ${isSelected ? 'card-selected' : ''} ${isActive ? meta.pulseClass : ''}`}
      onClick={() => onSelect(status.agentId)}
      style={{ '--agent-color': meta.colorVar } as React.CSSProperties}
    >
      {/* Header */}
      <div className="card-top-row">
        <div className="agent-identity">
          <div className="agent-avatar-icon">
            <Icon size={16} />
          </div>
          <div className="agent-names">
            <span className="agent-role-title">{status.role}</span>
            <span className="agent-sub-id">@{status.agentId}</span>
          </div>
        </div>

        <div className="card-state-pill" style={{ color: stateMeta.color }}>
          <span className="state-dot">{stateMeta.dot}</span>
          <span className="state-text">{stateMeta.label}</span>
        </div>
      </div>

      {/* Current Task Description */}
      <div className="card-task-section">
        <div className="task-title-text">
          {status.currentTaskTitle || 'Awaiting task assignment from Orchestrator...'}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card-progress-bar-wrapper">
        <div className="progress-track">
          <div
            className={`progress-fill ${isActive ? 'shimmer-active' : ''}`}
            style={{
              width: `${status.progress}%`,
              backgroundColor: meta.colorVar,
            }}
          ></div>
        </div>
        <span className="progress-percent-label">{status.progress}%</span>
      </div>

      {/* Current Activity Ticker */}
      <div className="card-current-action">
        <span className="action-tag">CURRENT</span>
        <span className="action-text">
          {status.currentAction || (isActive ? 'Processing swarm directives' : 'Ready on standby')}
        </span>
      </div>

      {/* Mini Activity Log Stream */}
      <div className="card-mini-logs">
        <span className="mini-log-tag">RECENT ACTIVITY</span>
        <div className="mini-log-list">
          {recentLogs.length > 0 ? (
            recentLogs.slice(-3).map((log, idx) => (
              <div key={idx} className="mini-log-item">
                <span className="log-time">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="log-msg">
                  {(log.payload as any).message || (log.payload as any).currentAction || log.type}
                </span>
              </div>
            ))
          ) : (
            <div className="mini-log-empty">No telemetry events logged yet.</div>
          )}
        </div>
      </div>

      {/* Footer Telemetry Counters */}
      <div className="card-footer-telemetry">
        <div className="counter-item" title="Files touched in workspace">
          <FileCheck size={12} className="counter-icon" />
          <span>Files: {status.filesTouchedCount}</span>
        </div>
        <div className="counter-item" title="Messages exchanged">
          <MessageSquare size={12} className="counter-icon" />
          <span>Msgs: {status.messagesCount}</span>
        </div>
        <div className="inspect-arrow">
          <span>Details</span>
          <ChevronRight size={12} />
        </div>
      </div>
    </div>
  );
};
