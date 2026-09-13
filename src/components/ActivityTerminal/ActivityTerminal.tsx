import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal, Filter, Search, Download, Trash2, ArrowDownCircle, Maximize2, Minimize2 } from 'lucide-react';
import { AgentEvent, AgentId, AgentEventType } from '../../types';
import './ActivityTerminal.css';

interface ActivityTerminalProps {
  events: AgentEvent[];
  onClear: () => void;
}

export const ActivityTerminal: React.FC<ActivityTerminalProps> = ({ events, onClear }) => {
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<AgentId | 'all'>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<AgentEventType | 'all' | 'errors'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Agent filter
      if (selectedAgentFilter !== 'all' && ev.agentId !== selectedAgentFilter) {
        return false;
      }
      // Type filter
      if (selectedTypeFilter === 'errors') {
        const isErr =
          ev.type === 'TASK_FAILED' ||
          (ev.type === 'AGENT_LOG' && (ev.payload as any).level === 'error') ||
          (ev.type === 'TEST_RESULT' && (ev.payload as any).status === 'FAILED');
        if (!isErr) return false;
      } else if (selectedTypeFilter !== 'all' && ev.type !== selectedTypeFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const payloadStr = JSON.stringify(ev.payload).toLowerCase();
        const matches = payloadStr.includes(q) || ev.type.toLowerCase().includes(q) || ev.agentId.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [events, selectedAgentFilter, selectedTypeFilter, searchQuery]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredEvents, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 40;
    setAutoScroll(isNearBottom);
  };

  const exportLogs = () => {
    const text = filteredEvents
      .map((e) => {
        const time = new Date(e.timestamp).toLocaleTimeString();
        const p = JSON.stringify(e.payload);
        return `[${time}] [${e.agentId.toUpperCase()}] [${e.type}] ${p}`;
      })
      .join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acc-telemetry-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`activity-terminal-container ${isExpanded ? 'terminal-expanded' : ''}`}>
      {/* Terminal Top Control Bar */}
      <div className="terminal-header">
        <div className="term-left">
          <div className="term-title-group">
            <Terminal size={14} className="term-icon" />
            <span className="term-title">GLOBAL ACTIVITY STREAM</span>
            <span className="term-counter">{filteredEvents.length} events</span>
          </div>

          {/* Agent Filter Tabs */}
          <div className="agent-tabs">
            {(['all', 'orchestrator', 'research', 'design', 'coder', 'tester'] as const).map((agent) => (
              <button
                key={agent}
                className={`agent-tab ${selectedAgentFilter === agent ? 'tab-active' : ''}`}
                onClick={() => setSelectedAgentFilter(agent)}
              >
                {agent === 'all' ? 'ALL' : agent.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="term-right">
          {/* Event Type Filter */}
          <div className="filter-select-wrapper">
            <Filter size={12} className="select-icon" />
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
              className="term-select"
            >
              <option value="all">All Events</option>
              <option value="AGENT_LOG">Logs</option>
              <option value="AGENT_MESSAGE">Messages</option>
              <option value="FILE_CHANGED">File Changes</option>
              <option value="TEST_RESULT">Test Results</option>
              <option value="errors">Errors Only</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="term-search-box">
            <Search size={12} className="search-icon" />
            <input
              type="text"
              placeholder="Filter logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="term-search-input"
            />
          </div>

          {/* Action Buttons */}
          <button
            className={`term-action-btn ${autoScroll ? 'btn-active' : ''}`}
            onClick={() => setAutoScroll(!autoScroll)}
            title="Auto scroll to bottom"
          >
            <ArrowDownCircle size={13} />
          </button>

          <button className="term-action-btn" onClick={exportLogs} title="Export Logs">
            <Download size={13} />
          </button>

          <button className="term-action-btn" onClick={onClear} title="Clear Terminal">
            <Trash2 size={13} />
          </button>

          <button
            className="term-action-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Minimize Terminal' : 'Maximize Terminal'}
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Terminal Monospace Stream */}
      <div className="terminal-body" ref={scrollRef} onScroll={handleScroll}>
        {filteredEvents.length === 0 ? (
          <div className="terminal-empty">No telemetry matching current filter parameters.</div>
        ) : (
          filteredEvents.map((event) => (
            <TerminalEventLine key={event.id} event={event} />
          ))
        )}
      </div>
    </div>
  );
};

const TerminalEventLine: React.FC<{ event: AgentEvent }> = ({ event }) => {
  const time = new Date(event.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const agentClass = `tag-agent-${event.agentId}`;

  const renderContent = () => {
    switch (event.type) {
      case 'AGENT_LOG': {
        const payload = event.payload as any;
        const levelClass = `log-${payload.level || 'info'}`;
        return <span className={`event-msg ${levelClass}`}>{payload.message}</span>;
      }
      case 'AGENT_MESSAGE': {
        const msg = event.payload as any;
        return (
          <span className="event-msg msg-exchange">
            <span className="msg-route">[{msg.from} → {msg.to}]</span> {msg.subject}:{' '}
            {typeof msg.body === 'object' ? JSON.stringify(msg.body).slice(0, 90) : String(msg.body)}
          </span>
        );
      }
      case 'FILE_CHANGED': {
        const fc = event.payload as any;
        return (
          <span className="event-msg file-mod">
            <span className="file-path">{fc.filePath}</span>: {fc.summary} (+{fc.linesAdded}, -{fc.linesRemoved})
          </span>
        );
      }
      case 'AGENT_STARTED': {
        const p = event.payload as any;
        return <span className="event-msg action-start">Started task: {p.taskTitle}</span>;
      }
      case 'AGENT_PROGRESS': {
        const p = event.payload as any;
        return <span className="event-msg action-progress">{p.currentAction} ({p.progress}%)</span>;
      }
      case 'AGENT_STATUS': {
        const p = event.payload as any;
        return <span className="event-msg action-status">Transitioned to {p.newState} {p.reason ? `(${p.reason})` : ''}</span>;
      }
      case 'TEST_RESULT': {
        const p = event.payload as any;
        return <span className="event-msg test-res">Quality Check [{p.category}]: {p.status} (Score: {p.score || 'N/A'}) - {p.summary}</span>;
      }
      case 'CONFLICT_DETECTED': {
        const p = event.payload as any;
        return <span className="event-msg log-error">⚠ FILE CONFLICT DETECTED on {p.filePath}! Safe lock engaged.</span>;
      }
      default:
        return <span className="event-msg">{JSON.stringify(event.payload).slice(0, 100)}</span>;
    }
  };

  return (
    <div className="terminal-line">
      <span className="term-time">{time}</span>
      <span className={`term-agent-tag ${agentClass}`}>[{event.agentId.toUpperCase()}]</span>
      <span className="term-type-tag">[{event.type}]</span>
      {renderContent()}
    </div>
  );
};
