import React, { useState } from 'react';
import {
  X,
  Play,
  Pause,
  Square,
  RotateCcw,
  Send,
  FileCheck,
  MessageSquare,
  Activity,
  CheckCircle2,
  Clock,
  Terminal,
  Cpu,
  Coins,
  ShieldCheck,
  Lock,
  AlertTriangle,
  Layers,
  Sparkles,
  Sun,
  Radio,
} from 'lucide-react';
import { AgentId, AgentStatus, AgentEvent } from '../../types';
import {
  ALL_SUPPORTED_MODELS,
  ROLE_COLORS,
  calculateTokenCost,
} from '../../config/models';
import './AgentInspector.css';

interface AgentInspectorProps {
  agentId: AgentId;
  status: AgentStatus;
  events: AgentEvent[];
  assignedModelId?: string;
  onClose: () => void;
  onPause: (agentId: AgentId) => void;
  onResume: (agentId: AgentId) => void;
  onStop: (agentId: AgentId) => void;
  onRetry?: (agentId: AgentId) => void;
  onModelChange?: (agentId: AgentId, modelId: string) => void;
  onSendMessage: (to: AgentId, message: string) => void;
  floatingPosition?: {
    left: number;
    top: number;
    placement?: 'left' | 'right';
  };
}

export const AgentInspector: React.FC<AgentInspectorProps> = ({
  agentId,
  status,
  events,
  assignedModelId = 'gemini-1.5-pro',
  onClose,
  onPause,
  onResume,
  onStop,
  onRetry,
  onModelChange,
  onSendMessage,
  floatingPosition,
}) => {
  const [directiveText, setDirectiveText] = useState('');
  const [currentModel, setCurrentModel] = useState(assignedModelId);

  // Sync external model assignment changes
  React.useEffect(() => {
    if (assignedModelId) {
      setCurrentModel(assignedModelId);
    }
  }, [assignedModelId]);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directiveText.trim()) return;
    onSendMessage(agentId, directiveText.trim());
    setDirectiveText('');
  };

  const handleModelSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    setCurrentModel(newModel);
    if (onModelChange) {
      onModelChange(agentId, newModel);
    }
  };

  const agentLogs = events.filter((e) => e.agentId === agentId);
  const isWorking = status.state === 'WORKING' || status.state === 'STARTING';
  const isBlocked = status.isBlocked || status.state === 'BLOCKED' || status.state === 'WAITING';
  const isFailed = status.state === 'FAILED';

  const roleColor = ROLE_COLORS[agentId] || '#38bdf8';
  const promptToks = status.promptTokens || 18400;
  const compToks = status.completionTokens || 4200;
  const totalCost = status.totalCost || calculateTokenCost(currentModel, promptToks, compToks);
  const modelInfo = ALL_SUPPORTED_MODELS.find((m) => m.id === currentModel) || ALL_SUPPORTED_MODELS[0];

  return (
    <div
      className={`agent-inspector-drawer ${floatingPosition ? 'is-floating' : ''}`}
      data-placement={floatingPosition?.placement || 'right'}
      style={
        floatingPosition
          ? ({
              '--insp-left': `${floatingPosition.left}px`,
              '--insp-top': `${floatingPosition.top}px`,
              '--insp-role-color': roleColor,
            } as React.CSSProperties)
          : undefined
      }
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseLeave={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="inspector-header" style={{ borderBottomColor: roleColor }}>
        <div className="insp-identity">
          <div className="insp-role-badge" style={{ color: roleColor }}>
            {status.role}
          </div>
          <span className="insp-agent-tag">@{status.agentId}</span>
        </div>
        <button className="insp-close-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {/* Mid-Run Model Switcher Header */}
      <div className="insp-model-override-bar">
        <div className="imo-label">
          <Layers size={12} color={roleColor} />
          <span>ASSIGNED MODEL:</span>
        </div>
        <select
          value={currentModel}
          onChange={handleModelSelect}
          className="imo-dropdown"
        >
          {ALL_SUPPORTED_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.providerLabel})
            </option>
          ))}
        </select>
      </div>

      {/* Control Actions Bar */}
      <div className="insp-controls-bar">
        {isWorking ? (
          <button className="insp-btn btn-amber" onClick={() => onPause(agentId)}>
            <Pause size={13} />
            <span>PAUSE</span>
          </button>
        ) : (
          <button className="insp-btn btn-cyan" onClick={() => onResume(agentId)}>
            <Play size={13} />
            <span>RESUME</span>
          </button>
        )}

        {onRetry && (
          <button
            className={`insp-btn ${isFailed ? 'btn-red-pulse' : 'btn-slate'}`}
            onClick={() => onRetry(agentId)}
            title="Retry current task stage"
          >
            <RotateCcw size={13} />
            <span>RETRY</span>
          </button>
        )}

        <button className="insp-btn btn-rose" onClick={() => onStop(agentId)}>
          <Square size={13} />
          <span>KILL</span>
        </button>
      </div>

      {/* Body Content */}
      <div className="inspector-scroll-body">
        {/* Live Blocking Banner */}
        {isBlocked && (
          <div className="insp-blocked-banner">
            <Lock size={14} color="#f59e0b" />
            <div className="ibb-text">
              <strong>Dependency Blocked:</strong> Waiting for upstream Design & UX specifications before executing modifications.
            </div>
          </div>
        )}

        {/* Failed Error Banner */}
        {isFailed && (
          <div className="insp-failed-banner">
            <AlertTriangle size={14} color="#f43f5e" />
            <div className="ifb-text">
              <strong>Task Failed:</strong> {status.lastError || 'AST verification syntax check failed on line 42.'} Click <em>RETRY</em> above to dispatch recovery pass.
            </div>
          </div>
        )}

        {/* Token & Cost Tracking Box */}
        <div className="insp-section-card">
          <div className="insp-section-title">TOKEN & COST TRACKING</div>
          <div className="insp-metrics-grid">
            <div className="metric-box">
              <span className="mb-label">PROMPT TOKENS</span>
              <span className="mb-value">{promptToks.toLocaleString()}</span>
            </div>
            <div className="metric-box">
              <span className="mb-label">COMPLETION</span>
              <span className="mb-value">{compToks.toLocaleString()}</span>
            </div>
            <div className="metric-box">
              <span className="mb-label">TOTAL TOKENS</span>
              <span className="mb-value" style={{ color: roleColor }}>
                {(promptToks + compToks).toLocaleString()}
              </span>
            </div>
            <div className="metric-box">
              <span className="mb-label">ESTIMATED SPEND</span>
              <span className="mb-value" style={{ color: '#f59e0b' }}>
                ${totalCost.toFixed(3)}
              </span>
            </div>
          </div>
        </div>

        {/* Hardware Telemetry Box */}
        <div className="insp-section-card">
          <div className="insp-section-title">RESOURCE ALLOCATION</div>
          <div className="insp-metrics-grid">
            <div className="metric-box">
              <span className="mb-label">CPU USAGE</span>
              <span className="mb-value">{status.cpuPercent || 38}%</span>
            </div>
            <div className="metric-box">
              <span className="mb-label">MEMORY ALLOC</span>
              <span className="mb-value">{status.memMb || 240} MB</span>
            </div>
            <div className="metric-box">
              <span className="mb-label">PROGRESS</span>
              <span className="mb-value">{status.progress}%</span>
            </div>
            <div className="metric-box">
              <span className="mb-label">STATE</span>
              <span className="mb-value" style={{ color: isFailed ? '#f43f5e' : isBlocked ? '#f59e0b' : roleColor }}>
                {status.state}
              </span>
            </div>
          </div>
        </div>

        {/* Active Task Details */}
        <div className="insp-section-card">
          <div className="insp-section-title">ACTIVE ASSIGNMENT</div>
          <div className="active-task-box">
            <div className="at-title">{status.currentTaskTitle || 'Executing concurrent DAG stage...'}</div>
            <div className="at-action">
              <span className="at-action-tag">ACTION:</span>
              <span>{status.currentAction || modelInfo.actionText}</span>
            </div>
          </div>
        </div>

        {/* Direct Directive Sender */}
        <div className="insp-section-card">
          <div className="insp-section-title">DIRECT OPERATOR DIRECTIVE</div>
          <form onSubmit={handleSend} className="directive-form">
            <input
              type="text"
              className="directive-input"
              placeholder={`Send custom prompt to ${status.role}...`}
              value={directiveText}
              onChange={(e) => setDirectiveText(e.target.value)}
            />
            <button type="submit" className="directive-send-btn" disabled={!directiveText.trim()}>
              <Send size={13} />
            </button>
          </form>
        </div>

        {/* Agent Activity History */}
        <div className="insp-section-card">
          <div className="insp-section-title">ACTIVITY STREAM ({agentLogs.length})</div>
          <div className="insp-logs-list">
            {agentLogs.length === 0 ? (
              <div className="no-logs">No activity recorded for this agent yet.</div>
            ) : (
              agentLogs.slice(-15).map((log) => (
                <div key={log.id} className="insp-log-line">
                  <span className="il-time">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span className="il-type">[{log.type}]</span>
                  <span className="il-msg">
                    {(log.payload as any).message ||
                      (log.payload as any).currentAction ||
                      (log.payload as any).title ||
                      JSON.stringify(log.payload).slice(0, 80)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
