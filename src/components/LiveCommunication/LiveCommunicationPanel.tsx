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
} from 'lucide-react';
import { AgentMessagePayload, Mission, AgentTask } from '../../types';
import './LiveCommunicationPanel.css';

interface LiveCommunicationPanelProps {
  messages: AgentMessagePayload[];
  mission?: Mission;
  onSendMessage: (to: string, content: string) => void;
  onPauseAll: () => void;
  onStopAll: () => void;
  onNewTask: () => void;
}

export const LiveCommunicationPanel: React.FC<LiveCommunicationPanelProps> = ({
  messages,
  mission,
  onSendMessage,
  onPauseAll,
  onStopAll,
  onNewTask,
}) => {
  const [inputText, setInputText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage('broadcast', inputText.trim());
    setInputText('');
  };

  const tasks = mission?.tasks || [];
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const totalCount = Math.max(tasks.length, 1);
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <aside className="live-communication-sidebar">
      {/* Section 1: Live Communication Messages */}
      <div className="comm-section">
        <div className="comm-header">
          <div className="comm-title-group">
            <span className="comm-title">Live Communication</span>
          </div>
          <span className="comm-count-badge">
            <Sparkles size={11} />
            <span>{messages.length || 12}</span>
          </span>
        </div>

        <div className="comm-message-list">
          {messages.length === 0 ? (
            // Default sample feed matching the reference UI if no new messages yet
            <>
              <div className="comm-msg-item">
                <div className="msg-meta-row">
                  <span className="msg-sender sender-gemini">Gemini → All</span>
                  <span className="msg-time">10:24</span>
                </div>
                <div className="msg-body-text">Mission started. Breaking down objective into dynamic DAG...</div>
              </div>

              <div className="comm-msg-item">
                <div className="msg-meta-row">
                  <span className="msg-sender sender-claude">Claude → Gemini</span>
                  <span className="msg-time">10:25</span>
                </div>
                <div className="msg-body-text">Completed initial UI analysis. Sharing visual specifications.</div>
              </div>

              <div className="comm-msg-item">
                <div className="msg-meta-row">
                  <span className="msg-sender sender-gpt">GPT-4o → Claude</span>
                  <span className="msg-time">10:25</span>
                </div>
                <div className="msg-body-text">Received design specs. Starting clean component implementation.</div>
              </div>

              <div className="comm-msg-item">
                <div className="msg-meta-row">
                  <span className="msg-sender sender-perplexity">Perplexity → All</span>
                  <span className="msg-time">10:26</span>
                </div>
                <div className="msg-body-text">Found 12 relevant resources for modern layout patterns.</div>
              </div>

              <div className="comm-msg-item">
                <div className="msg-meta-row">
                  <span className="msg-sender sender-llama">Llama → GPT-4o</span>
                  <span className="msg-time">10:27</span>
                </div>
                <div className="msg-body-text">Running accessibility test suite on latest component build...</div>
              </div>

              <div className="comm-msg-item">
                <div className="msg-meta-row">
                  <span className="msg-sender sender-gemini">Gemini → All</span>
                  <span className="msg-time">10:27</span>
                </div>
                <div className="msg-body-text">Great progress! Coordinating convergence for testing phase.</div>
              </div>
            </>
          ) : (
            messages.slice(-8).map((msg) => (
              <div key={msg.id} className="comm-msg-item">
                <div className="msg-meta-row">
                  <span className="msg-sender">
                    {msg.from.toUpperCase()} → {msg.to.toUpperCase()}
                  </span>
                  <span className="msg-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="msg-body-text">
                  {msg.subject}: {typeof msg.body === 'object' ? JSON.stringify(msg.body).slice(0, 90) : String(msg.body)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Input Box */}
        <div className="message-input-container">
          <span className="input-label">Message Input</span>
          <form onSubmit={handleSend} className="input-form-row">
            <input
              type="text"
              placeholder="Send a message to agents..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="chat-input-field"
            />
            <button type="submit" className="chat-send-btn" disabled={!inputText.trim()}>
              <Send size={13} />
            </button>
          </form>
        </div>
      </div>

      {/* Section 2: Current Task Checklist */}
      <div className="task-section">
        <div className="current-task-title-row">
          <span className="ct-label">Current Task</span>
          <span className="ct-objective-name">{mission?.objective.slice(0, 30) || 'Modernize portfolio website'}...</span>
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

        {/* Dynamic Checklist */}
        <div className="task-checklist">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div key={task.id} className="checklist-item">
                {task.status === 'COMPLETED' && <CheckCircle2 size={13} className="cl-icon-green" />}
                {task.status === 'RUNNING' && <span className="cl-dot-green"></span>}
                {task.status === 'PENDING' && <span className="cl-dot-empty"></span>}
                {task.status === 'FAILED' && <span className="cl-dot-red"></span>}
                <span className={`cl-text ${task.status === 'COMPLETED' ? 'cl-done' : ''}`}>
                  {task.title}
                </span>
              </div>
            ))
          ) : (
            <>
              <div className="checklist-item">
                <CheckCircle2 size={13} className="cl-icon-green" />
                <span className="cl-text cl-done">Analyze existing codebase</span>
              </div>
              <div className="checklist-item">
                <span className="cl-dot-green"></span>
                <span className="cl-text">Research modern design patterns</span>
              </div>
              <div className="checklist-item">
                <span className="cl-dot-empty"></span>
                <span className="cl-text">Implement new UI components</span>
              </div>
              <div className="checklist-item">
                <span className="cl-dot-empty"></span>
                <span className="cl-text">Optimize performance</span>
              </div>
              <div className="checklist-item">
                <span className="cl-dot-empty"></span>
                <span className="cl-text">Run complete test suite</span>
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="task-action-controls">
          <button className="tac-btn tac-pause" onClick={onPauseAll}>
            <Pause size={12} />
            <span>Pause All</span>
          </button>
          <button className="tac-btn tac-stop" onClick={onStopAll}>
            <Square size={12} />
            <span>Stop All</span>
          </button>
          <button className="tac-btn tac-new" onClick={onNewTask}>
            <Plus size={12} />
            <span>New Task</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
