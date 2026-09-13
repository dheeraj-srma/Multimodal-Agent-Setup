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
} from 'lucide-react';
import { AgentId, AgentStatus, AgentEvent } from '../../types';
import './AgentInspector.css';

interface AgentInspectorProps {
  agentId: AgentId;
  status: AgentStatus;
  events: AgentEvent[];
  onClose: () => void;
  onPause: (agentId: AgentId) => void;
  onResume: (agentId: AgentId) => void;
  onStop: (agentId: AgentId) => void;
  onSendMessage: (to: AgentId, message: string) => void;
}

export const AgentInspector: React.FC<AgentInspectorProps> = ({
  agentId,
  status,
  events,
  onClose,
  onPause,
  onResume,
  onStop,
  onSendMessage,
}) => {
  const [directiveText, setDirectiveText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directiveText.trim()) return;
    onSendMessage(agentId, directiveText.trim());
    setDirectiveText('');
  };

  const agentLogs = events.filter((e) => e.agentId === agentId);
  const isWorking = status.state === 'WORKING' || status.state === 'STARTING';
  const isWaiting = status.state === 'WAITING';

  return (
    <div className="agent-inspector-drawer">
      {/* Header */}
      <div className="inspector-header">
        <div className="insp-identity">
          <span className="insp-role">{status.role}</span>
          <span className="insp-agent-tag">@{status.agentId}</span>
        </div>
        <button className="insp-close-btn" onClick={onClose}>
          <X size={16} />
        </button>
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
        <button className="insp-btn btn-rose" onClick={() => onStop(agentId)}>
          <Square size={13} />
          <span>STOP</span>
        </button>
      </div>

      {/* Body Content */}
      <div className="inspector-scroll-body">
        {/* Status Metrics Box */}
        <div className="insp-section-card">
          <div className="insp-section-title">TELEMETRY STATUS</div>
          <div className="insp-metrics-grid">
            <div className="metric-box">
              <span className="mb-label">STATE</span>
              <span className="mb-value">{status.state}</span>
            </div>
            <div className="metric-box">
              <span className="mb-label">PROGRESS</span>
              <span className="mb-value">{status.progress}%</span>
            </div>
            <div className="metric-box">
              <span className="mb-label">FILES MODIFIED</span>
              <span className="mb-value">{status.filesTouchedCount}</span>
            </div>
            <div className="metric-box">
              <span className="mb-label">MESSAGES</span>
              <span className="mb-value">{status.messagesCount}</span>
            </div>
          </div>
        </div>

        {/* Current Task Details */}
        <div className="insp-section-card">
          <div className="insp-section-title">ACTIVE ASSIGNMENT</div>
          <div className="active-task-box">
            <div className="at-title">{status.currentTaskTitle || 'No active task assigned.'}</div>
            <div className="at-action">
              <span className="at-action-tag">ACTION:</span>
              <span>{status.currentAction || 'Standby'}</span>
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
              placeholder={`Send instruction to ${status.role}...`}
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
                      JSON.stringify(log.payload).slice(0, 70)}
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
