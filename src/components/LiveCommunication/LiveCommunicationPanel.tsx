import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  Square,
  Plus,
  Radio,
  ChevronDown,
  ChevronUp,
  Code,
  Loader2,
  Lock,
  AlertCircle,
  Coins,
} from 'lucide-react';
import { AgentMessagePayload, Mission, AgentTask, AgentId } from '../../types';
import { ROLE_COLORS } from '../../config/models';
import './LiveCommunicationPanel.css';

interface LiveCommunicationPanelProps {
  messages: AgentMessagePayload[];
  mission?: Mission;
  onSendMessage: (to: string, content: string) => void;
  onPauseAll: () => void;
  onStopAll: () => void;
  onNewTask: () => void;
  sessionTokens?: number;
  sessionCost?: number;
}

interface ParsedMessage {
  summary: string;
  rawText: string;
  isObject: boolean;
}

export const LiveCommunicationPanel: React.FC<LiveCommunicationPanelProps> = ({
  messages,
  mission,
  onSendMessage,
  onPauseAll,
  onStopAll,
  onNewTask,
  sessionTokens = 42800,
  sessionCost = 0.08,
}) => {
  const [inputText, setInputText] = useState('');
  const [targetAgent, setTargetAgent] = useState<string>('broadcast');
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(targetAgent, inputText.trim());
    setInputText('');
  };

  const parseMessagePayload = (msg: AgentMessagePayload): ParsedMessage => {
    if (typeof msg.body === 'string') {
      const trimmed = msg.body.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          return formatObject(msg.subject, parsed);
        } catch {
          return { summary: msg.body, rawText: msg.body, isObject: false };
        }
      }
      return { summary: msg.body, rawText: msg.body, isObject: false };
    } else if (typeof msg.body === 'object' && msg.body !== null) {
      return formatObject(msg.subject, msg.body);
    }
    return { summary: String(msg.body), rawText: String(msg.body), isObject: false };
  };

  const formatObject = (subject: string, obj: any): ParsedMessage => {
    const raw = JSON.stringify(obj, null, 2);
    if (obj.taskTitle) return { summary: `${subject}: ${obj.taskTitle}`, rawText: raw, isObject: true };
    if (obj.title) return { summary: `${subject}: ${obj.title}`, rawText: raw, isObject: true };
    if (obj.summary) return { summary: `${subject}: ${obj.summary}`, rawText: raw, isObject: true };
    if (obj.finding) return { summary: `${subject}: ${obj.finding}`, rawText: raw, isObject: true };
    if (obj.action) return { summary: `${subject}: ${obj.action}`, rawText: raw, isObject: true };
    if (obj.files && Array.isArray(obj.files)) {
      return { summary: `${subject}: Updated ${obj.files.length} files (${obj.files.slice(0, 2).join(', ')})`, rawText: raw, isObject: true };
    }
    if (obj.results && Array.isArray(obj.results)) {
      return { summary: `${subject}: Generated ${obj.results.length} outputs`, rawText: raw, isObject: true };
    }
    const keys = Object.keys(obj).slice(0, 3).join(', ');
    return { summary: `${subject}: Payload [${keys}]`, rawText: raw, isObject: true };
  };

  const tasks = mission?.tasks || [];
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const totalCount = Math.max(tasks.length, 1);
  const progressPct = Math.round((completedCount / totalCount) * 100);

  const getAgentColor = (agentId: string) => {
    return ROLE_COLORS[agentId as AgentId] || '#38bdf8';
  };

  return (
    <aside className="live-communication-sidebar">
      {/* Section 1: Live Communication Messages */}
      <div className="comm-section">
        <div className="comm-header">
          <div className="comm-title-group">
            <span className="comm-title">Live Communication</span>
          </div>
          <div className="comm-header-meta">
            <span className="comm-token-badge" title="Estimated session token spend">
              <Coins size={11} color="#f59e0b" />
              <span>${sessionCost.toFixed(2)}</span>
            </span>
            <span className="comm-count-badge">
              <Sparkles size={11} />
              <span>{messages.length || 6}</span>
            </span>
          </div>
        </div>

        <div className="comm-message-list">
          {messages.length === 0 ? (
            // Default sample feed with clean non-truncated summaries and expandable payloads
            <>
              <div className="comm-msg-item">
                <div className="msg-meta-row">
                  <span className="msg-sender" style={{ color: ROLE_COLORS.orchestrator }}>
                    GEMINI (Orchestrator) → ALL
                  </span>
                  <span className="msg-time">10:24</span>
                </div>
                <div className="msg-body-text">
                  Mission initialized. Formulating dynamic DAG with 5 specialized concurrent tasks.
                </div>
              </div>

              <div className="comm-msg-item">
                <div className="msg-meta-row">
                  <span className="msg-sender" style={{ color: ROLE_COLORS.design }}>
                    CLAUDE (Design) → GEMINI
                  </span>
                  <span className="msg-time">10:25</span>
                </div>
                <div className="msg-body-text">
                  Completed UI analysis. Exported modern typography and color token specifications.
                </div>
                <button
                  className="raw-payload-toggle"
                  onClick={() => toggleExpand('sample-1')}
                >
                  <Code size={10} />
                  <span>{expandedMessageIds.has('sample-1') ? 'Hide Payload' : 'View Spec Payload'}</span>
                  {expandedMessageIds.has('sample-1') ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
                {expandedMessageIds.has('sample-1') && (
                  <pre className="raw-payload-box">
{`{
  "theme": "cyber-hud",
  "tokens": {
    "primary": "#00f0ff",
    "surface": "rgba(8, 12, 20, 0.95)"
  },
  "components": ["Navbar", "HeroCanvas", "Dock"]
}`}
                  </pre>
                )}
              </div>

              <div className="comm-msg-item">
                <div className="msg-meta-row">
                  <span className="msg-sender" style={{ color: ROLE_COLORS.coder }}>
                    GPT-4o (Coder) → CLAUDE
                  </span>
                  <span className="msg-time">10:25</span>
                </div>
                <div className="msg-body-text">
                  Spec received. Initializing non-destructive AST modifications across 6 workspace files.
                </div>
              </div>

              <div className="comm-msg-item">
                <div className="msg-meta-row">
                  <span className="msg-sender" style={{ color: ROLE_COLORS.research }}>
                    PERPLEXITY (Research) → ALL
                  </span>
                  <span className="msg-time">10:26</span>
                </div>
                <div className="msg-body-text">
                  Retrieved 12 relevant benchmark citations for responsive multi-agent layouts.
                </div>
              </div>

              <div className="comm-msg-item">
                <div className="msg-meta-row">
                  <span className="msg-sender" style={{ color: ROLE_COLORS.tester }}>
                    LLAMA 3.1 (Tester) → GPT-4o
                  </span>
                  <span className="msg-time">10:27</span>
                </div>
                <div className="msg-body-text">
                  Running automated WCAG AAA accessibility audit and syntax validation pass.
                </div>
              </div>

              <div className="comm-msg-item">
                <div className="msg-meta-row">
                  <span className="msg-sender" style={{ color: ROLE_COLORS.orchestrator }}>
                    GEMINI (Orchestrator) → ALL
                  </span>
                  <span className="msg-time">10:27</span>
                </div>
                <div className="msg-body-text">
                  All prerequisite stages converged. Preparing final synthesized markdown report.
                </div>
              </div>
            </>
          ) : (
            messages.slice(-12).map((msg) => {
              const parsed = parseMessagePayload(msg);
              const isExpanded = expandedMessageIds.has(msg.id);

              return (
                <div key={msg.id} className="comm-msg-item">
                  <div className="msg-meta-row">
                    <span className="msg-sender" style={{ color: getAgentColor(msg.from) }}>
                      {msg.from.toUpperCase()} → {msg.to.toUpperCase()}
                    </span>
                    <span className="msg-time">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="msg-body-text">{parsed.summary}</div>

                  {parsed.isObject && (
                    <>
                      <button className="raw-payload-toggle" onClick={() => toggleExpand(msg.id)}>
                        <Code size={10} />
                        <span>{isExpanded ? 'Hide Payload' : 'View Payload'}</span>
                        {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      </button>
                      {isExpanded && <pre className="raw-payload-box">{parsed.rawText}</pre>}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Message Input Box */}
        <div className="message-input-container">
          <div className="input-target-row">
            <span className="input-label">Directive To:</span>
            <select
              value={targetAgent}
              onChange={(e) => setTargetAgent(e.target.value)}
              className="target-agent-select"
            >
              <option value="broadcast">All Agents (Broadcast)</option>
              <option value="orchestrator">Orchestrator (Gemini)</option>
              <option value="design">Design Agent (Claude)</option>
              <option value="coder">Coder Agent (GPT-4o)</option>
              <option value="research">Research Agent (Perplexity)</option>
              <option value="tester">Test Agent (Llama)</option>
            </select>
          </div>

          <form onSubmit={handleSend} className="input-form-row">
            <input
              type="text"
              placeholder="Send instruction to swarm..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="chat-input-field"
            />
            <button type="submit" className="chat-send-btn" disabled={!inputText.trim()}>
              <Send size={12} />
            </button>
          </form>
        </div>
      </div>

      {/* Section 2: Current Task Checklist with Distinct Partial Progress States */}
      <div className="task-section">
        <div className="current-task-title-row">
          <span className="ct-label">Current Task</span>
          <span className="ct-objective-name">{mission?.objective.slice(0, 32) || 'Modernize portfolio website'}...</span>
        </div>

        <div className="ct-progress-header">
          <span className="ct-count-text">
            {completedCount}/{totalCount} tasks completed
          </span>
          <span className="ct-percent">{progressPct}%</span>
        </div>

        <div className="ct-progress-track">
          <div className="ct-progress-fill" style={{ width: `${progressPct}%` }}></div>
        </div>

        {/* Dynamic Checklist with Distinct States */}
        <div className="task-checklist">
          {tasks.length > 0 ? (
            tasks.map((task) => {
              const isDone = task.status === 'COMPLETED';
              const isRunning = task.status === 'RUNNING';
              const isBlocked = task.status === 'BLOCKED';
              const isFailed = task.status === 'FAILED';

              return (
                <div key={task.id} className="checklist-item">
                  {isDone && <CheckCircle2 size={13} className="cl-icon-done" />}
                  {isRunning && <Loader2 size={13} className="cl-icon-running spin-icon" />}
                  {isBlocked && <Lock size={12} className="cl-icon-blocked" />}
                  {isFailed && <AlertCircle size={13} className="cl-icon-failed" />}
                  {!isDone && !isRunning && !isBlocked && !isFailed && (
                    <Clock size={12} className="cl-icon-queued" />
                  )}

                  <span
                    className={`cl-text ${
                      isDone
                        ? 'cl-text-done'
                        : isRunning
                        ? 'cl-text-running'
                        : isBlocked
                        ? 'cl-text-blocked'
                        : isFailed
                        ? 'cl-text-failed'
                        : 'cl-text-queued'
                    }`}
                  >
                    {task.title}
                  </span>
                </div>
              );
            })
          ) : (
            // Rich multi-state sample checklist if no mission active
            <>
              <div className="checklist-item">
                <CheckCircle2 size={13} className="cl-icon-done" />
                <span className="cl-text cl-text-done">Analyze existing codebase architecture</span>
              </div>
              <div className="checklist-item">
                <CheckCircle2 size={13} className="cl-icon-done" />
                <span className="cl-text cl-text-done">Extract design tokens & style specs</span>
              </div>
              <div className="checklist-item">
                <Loader2 size={13} className="cl-icon-running spin-icon" />
                <span className="cl-text cl-text-running">Implement responsive UI components</span>
              </div>
              <div className="checklist-item">
                <Lock size={12} className="cl-icon-blocked" />
                <span className="cl-text cl-text-blocked">Verify accessibility & regressions</span>
              </div>
              <div className="checklist-item">
                <Clock size={12} className="cl-icon-queued" />
                <span className="cl-text cl-text-queued">Synthesize final performance report</span>
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="task-action-controls">
          <button className="tac-btn tac-pause" onClick={onPauseAll} title="Pause all running agents">
            <Pause size={12} />
            <span>Pause All</span>
          </button>
          <button className="tac-btn tac-stop" onClick={onStopAll} title="Abort current swarm execution">
            <Square size={12} />
            <span>Stop All</span>
          </button>
          <button className="tac-btn tac-new" onClick={onNewTask} title="Start new task prompt">
            <Plus size={12} />
            <span>New Task</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
