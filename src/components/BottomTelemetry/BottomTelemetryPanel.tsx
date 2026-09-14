import React, { useState } from 'react';
import {
  Activity,
  Terminal,
  FileCode,
  GitBranch,
  BarChart3,
  Search,
  Filter,
  Cpu,
  HardDrive,
  Wifi,
  Sparkles,
  Sun,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  Coins,
} from 'lucide-react';
import { AgentEvent, GitStatusInfo, AgentId, EventTypeFilter } from '../../types';
import { ROLE_COLORS } from '../../config/models';
import './BottomTelemetryPanel.css';

interface BottomTelemetryPanelProps {
  events: AgentEvent[];
  activeAgentsCount: number;
  gitStatus?: GitStatusInfo;
  onOpenDiffModal?: () => void;
  sessionTokens?: number;
  sessionCost?: number;
}

const AGENT_RESOURCE_BREAKDOWN = [
  { id: 'orchestrator' as AgentId, name: 'Gemini 1.5 Pro (Orchestrator)', cpu: 34, tokens: '48.2k', cost: '$0.00' },
  { id: 'design' as AgentId, name: 'Claude 3.5 Sonnet (Design)', cpu: 26, tokens: '18.4k', cost: '$0.06' },
  { id: 'coder' as AgentId, name: 'GPT-4o (Backend & Code)', cpu: 58, tokens: '32.1k', cost: '$0.10' },
  { id: 'research' as AgentId, name: 'Perplexity Sonar (Research)', cpu: 19, tokens: '14.8k', cost: '$0.01' },
  { id: 'tester' as AgentId, name: 'Llama 3.1 70B (Testing)', cpu: 22, tokens: '12.0k', cost: '$0.01' },
];

export const BottomTelemetryPanel: React.FC<BottomTelemetryPanelProps> = ({
  events,
  activeAgentsCount,
  gitStatus,
  onOpenDiffModal,
  sessionTokens = 125500,
  sessionCost = 0.18,
}) => {
  const [activeTab, setActiveTab] = useState<'log' | 'files' | 'terminal' | 'git' | 'metrics'>('log');
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterType, setFilterType] = useState<EventTypeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredAgentId, setHoveredAgentId] = useState<AgentId | null>(null);

  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    'Antigravity Language Server v1.12.0 active on token authentication (zero cloud API key)',
    'Dynamic DAG scheduler parallel execution pipeline initialized',
    'Local Workspace Safety lock active: 0 file collisions',
    'Type `help`, `status`, `tokens`, `agents` for diagnostics.',
  ]);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    const cmd = terminalInput.trim().toLowerCase();
    let reply = `Executed: ${cmd}`;
    if (cmd === 'status') {
      reply = `[ONLINE] 4 Agents active • Antigravity PID 20264 • CPU 42% • RAM 68% • Safety Clean`;
    } else if (cmd === 'tokens') {
      reply = `[TOKENS] Session Cumulative: ${sessionTokens.toLocaleString()} tokens | Estimated Spend: $${sessionCost.toFixed(2)}`;
    } else if (cmd === 'agents') {
      reply = `[AGENTS] Orchestrator (Gemini 1.5 Pro), Design (Claude 3.5), Coder (GPT-4o), Research (Perplexity), Tester (Llama 3.1)`;
    } else if (cmd === 'help') {
      reply = `Commands: status, tokens, agents, ping, clear`;
    } else if (cmd === 'ping') {
      reply = `pong • Antigravity local daemon latency 12ms`;
    } else if (cmd === 'clear') {
      setTerminalHistory([]);
      setTerminalInput('');
      return;
    }
    setTerminalHistory((prev) => [...prev, `$ ${terminalInput.trim()}`, reply]);
    setTerminalInput('');
  };

  const filteredEvents = events.filter((ev) => {
    // Filter by agent
    if (filterAgent !== 'all' && ev.agentId !== filterAgent) return false;

    // Filter by event type
    if (filterType !== 'ALL') {
      if (filterType === 'STATUS' && ev.type !== 'AGENT_STATUS' && ev.type !== 'AGENT_PROGRESS') return false;
      if (filterType === 'MESSAGE' && ev.type !== 'AGENT_MESSAGE') return false;
      if (filterType === 'TASK' && !ev.type.startsWith('TASK_')) return false;
      if (filterType === 'FILE' && ev.type !== 'FILE_CHANGED' && ev.type !== 'CONFLICT_DETECTED') return false;
      if (filterType === 'ERROR' && ev.type !== 'TASK_FAILED' && !ev.type.includes('ERROR')) return false;
    }

    // Filter by search query
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ev.agentId.toLowerCase().includes(q) ||
      ev.type.toLowerCase().includes(q) ||
      JSON.stringify(ev.payload).toLowerCase().includes(q)
    );
  });

  return (
    <div className="bottom-telemetry-dock">
      {/* Tabs & Filter Bar */}
      <div className="btd-header">
        <div className="btd-tabs-row">
          <button
            className={`btd-tab ${activeTab === 'log' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('log')}
          >
            <Activity size={12} />
            <span>Event Log</span>
          </button>

          <button
            className={`btd-tab ${activeTab === 'files' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <FileCode size={12} />
            <span>Files {gitStatus?.modifiedFiles.length ? `(${gitStatus.modifiedFiles.length})` : ''}</span>
          </button>

          <button
            className={`btd-tab ${activeTab === 'terminal' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            <Terminal size={12} />
            <span>Terminal</span>
          </button>

          <button
            className={`btd-tab ${activeTab === 'git' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('git')}
          >
            <GitBranch size={12} />
            <span>Git ({gitStatus?.currentBranch || 'main'})</span>
          </button>

          <button
            className={`btd-tab ${activeTab === 'metrics' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('metrics')}
          >
            <BarChart3 size={12} />
            <span>System Metrics</span>
          </button>
        </div>

        <div className="btd-filters-row">
          {activeTab === 'log' && (
            <>
              {/* Event Type Filter */}
              <div className="filter-dropdown-box">
                <Filter size={11} className="dim-icon" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as EventTypeFilter)}
                  className="dock-select"
                >
                  <option value="ALL">All Event Types</option>
                  <option value="STATUS">State Transitions</option>
                  <option value="MESSAGE">Inter-Agent Messages</option>
                  <option value="TASK">Task Stages</option>
                  <option value="FILE">File Modifications</option>
                  <option value="ERROR">Errors & Retries</option>
                </select>
              </div>

              {/* Agent Filter */}
              <div className="filter-dropdown-box">
                <select
                  value={filterAgent}
                  onChange={(e) => setFilterAgent(e.target.value)}
                  className="dock-select"
                >
                  <option value="all">All Agents</option>
                  <option value="orchestrator">Gemini (Orchestrator)</option>
                  <option value="design">Claude (Design & UX)</option>
                  <option value="coder">GPT-4o (Backend & Code)</option>
                  <option value="research">Perplexity (Research)</option>
                  <option value="tester">Llama (Testing & Review)</option>
                </select>
              </div>

              {/* Search Box */}
              <div className="filter-search-box">
                <Search size={11} className="dim-icon" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="dock-search-input"
                />
              </div>
            </>
          )}

          {activeTab === 'metrics' && (
            <div className="metric-token-summary">
              <Coins size={12} color="#f59e0b" />
              <span>Session: <strong>{(sessionTokens / 1000).toFixed(1)}k tokens</strong> (${sessionCost.toFixed(2)})</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Dock Content Split */}
      <div className="btd-body">
        {/* Left Dynamic Tab Content */}
        <div className="btd-tab-content-area">
          {activeTab === 'log' && (
            <div className="btd-log-stream">
              {filteredEvents.length === 0 ? (
                // Sample feed matching reference UI
                <div className="sample-log-feed">
                  <div className="log-row">
                    <span className="lr-time">10:27:14</span>
                    <span className="lr-model" style={{ color: ROLE_COLORS.orchestrator }}>[Gemini]</span>
                    <span className="lr-arrow">→</span>
                    <span className="lr-model" style={{ color: ROLE_COLORS.coder }}>[GPT-4o]</span>
                    <span className="lr-text">Dispatched task: Implement portfolio auth flow</span>
                  </div>

                  <div className="log-row">
                    <span className="lr-time">10:27:12</span>
                    <span className="lr-model" style={{ color: ROLE_COLORS.design }}>[Claude]</span>
                    <span className="lr-text">
                      Modified <span className="lr-file">src/components/Navbar.tsx</span>{' '}
                      <span className="lr-diff">(+28 -4)</span>
                    </span>
                  </div>

                  <div className="log-row">
                    <span className="lr-time">10:27:10</span>
                    <span className="lr-model" style={{ color: ROLE_COLORS.research }}>[Perplexity]</span>
                    <span className="lr-text">Synthesized 12 benchmark sources for "modern portfolio design 2024"</span>
                  </div>

                  <div className="log-row">
                    <span className="lr-time">10:27:08</span>
                    <span className="lr-model" style={{ color: ROLE_COLORS.tester }}>[Llama 3.1]</span>
                    <span className="lr-text">Test suite pass: 14/37 completed (2 pending, 0 regression)</span>
                  </div>

                  <div className="log-row">
                    <span className="lr-time">10:27:05</span>
                    <span className="lr-model" style={{ color: ROLE_COLORS.coder }}>[GPT-4o]</span>
                    <span className="lr-text">Running safe TypeScript AST validation...</span>
                  </div>

                  <div className="log-row">
                    <span className="lr-time">10:27:02</span>
                    <span className="lr-model" style={{ color: ROLE_COLORS.orchestrator }}>[Gemini]</span>
                    <span className="lr-text">Dynamic DAG resolved. 4 agents executing concurrently (2.95x multiplier).</span>
                  </div>
                </div>
              ) : (
                filteredEvents.slice(-25).map((ev) => {
                  const roleCol = ROLE_COLORS[ev.agentId as AgentId] || '#38bdf8';
                  return (
                    <div key={ev.id} className="log-row">
                      <span className="lr-time">
                        {new Date(ev.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                      <span className="lr-model" style={{ color: roleCol }}>
                        [{ev.agentId.toUpperCase()}]
                      </span>
                      <span className="lr-type-tag">{ev.type}</span>
                      <span className="lr-text">
                        {(ev.payload as any).message ||
                          (ev.payload as any).currentAction ||
                          (ev.payload as any).summary ||
                          (ev.payload as any).title ||
                          JSON.stringify(ev.payload).slice(0, 110)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div className="btd-files-view">
              <div className="files-list-header">
                <span>FILE PATH</span>
                <span>STATUS</span>
                <span>ACTION</span>
              </div>
              <div className="files-list-items">
                {gitStatus && gitStatus.modifiedFiles.length > 0 ? (
                  gitStatus.modifiedFiles.map((f, i) => (
                    <div key={i} className="file-item-row">
                      <span className="file-path-text">{f}</span>
                      <span className="file-tag-mod">MODIFIED</span>
                      <button className="file-diff-btn" onClick={onOpenDiffModal}>
                        Inspect Diff
                      </button>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="file-item-row">
                      <span className="file-path-text">src/components/AgentGraph/AgentGraph.tsx</span>
                      <span className="file-tag-mod">+142 -12</span>
                      <button className="file-diff-btn" onClick={onOpenDiffModal}>
                        Inspect Diff
                      </button>
                    </div>
                    <div className="file-item-row">
                      <span className="file-path-text">src/components/LiveCommunication/LiveCommunicationPanel.tsx</span>
                      <span className="file-tag-mod">+84 -6</span>
                      <button className="file-diff-btn" onClick={onOpenDiffModal}>
                        Inspect Diff
                      </button>
                    </div>
                    <div className="file-item-row">
                      <span className="file-path-text">src/config/models.ts</span>
                      <span className="file-tag-add">+62</span>
                      <button className="file-diff-btn" onClick={onOpenDiffModal}>
                        Inspect Diff
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'terminal' && (
            <div className="btd-terminal-view">
              <div className="terminal-lines-stream">
                {terminalHistory.map((line, idx) => (
                  <div key={idx} className="terminal-history-line">
                    {line}
                  </div>
                ))}
              </div>
              <form onSubmit={handleTerminalSubmit} className="terminal-prompt-row">
                <span className="terminal-prompt-symbol">$</span>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  className="terminal-input-prompt"
                  placeholder="Enter diagnostic command (e.g. status, tokens, agents, ping)..."
                />
              </form>
            </div>
          )}

          {activeTab === 'git' && (
            <div className="btd-git-view">
              <div className="git-view-header">
                <div className="git-branch-info">
                  <GitBranch size={14} color="#38bdf8" />
                  <span>Branch: <strong>{gitStatus?.currentBranch || 'main'}</strong></span>
                </div>
                <div className="git-sync-status">
                  <span>Ahead: {gitStatus?.aheadCount || 0}</span>
                  <span>Behind: {gitStatus?.behindCount || 0}</span>
                </div>
              </div>
              <div className="git-commits-stream">
                {(gitStatus?.recentCommits || [
                  { hash: '76e12bc', message: 'feat: add multi-model agent command center UI with cross-provider swarm', author: 'operator' },
                  { hash: 'c38d784', message: 'feat: initial agent runtime and DAG execution engine', author: 'operator' },
                ]).map((c, i) => (
                  <div key={i} className="git-commit-row">
                    <span className="commit-hash">{c.hash.slice(0, 7)}</span>
                    <span className="commit-msg">{c.message}</span>
                    <span className="commit-author">by {c.author}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="btd-full-metrics-view">
              {/* Per-Agent Resource Attribution Table */}
              <div className="metrics-agent-attribution-box">
                <div className="ma-header">AGENT RESOURCE ATTRIBUTION</div>
                <div className="ma-list">
                  {AGENT_RESOURCE_BREAKDOWN.map((agent) => (
                    <div
                      key={agent.id}
                      className="ma-item-row"
                      style={{
                        borderLeftColor: ROLE_COLORS[agent.id],
                      }}
                      onMouseEnter={() => setHoveredAgentId(agent.id)}
                      onMouseLeave={() => setHoveredAgentId(null)}
                    >
                      <div className="ma-left">
                        <span className="ma-name">{agent.name}</span>
                      </div>
                      <div className="ma-right">
                        <span className="ma-cpu-chip">CPU {agent.cpu}%</span>
                        <span className="ma-tok-chip">{agent.tokens} tok</span>
                        <span className="ma-cost-chip">{agent.cost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* High Level Cards */}
              <div className="metrics-high-level-cards">
                <div className="metric-card-box">
                  <span className="mc-title">Concurrency Multiplier</span>
                  <span className="mc-value mc-cyan">2.95x</span>
                  <span className="mc-sub">True parallel execution</span>
                </div>
                <div className="metric-card-box">
                  <span className="mc-title">Throughput Speed</span>
                  <span className="mc-value mc-emerald">164 t/s</span>
                  <span className="mc-sub">4 active workers</span>
                </div>
                <div className="metric-card-box">
                  <span className="mc-title">Collision Rate</span>
                  <span className="mc-value mc-amber">0.0%</span>
                  <span className="mc-sub">Workspace safety clean</span>
                </div>
                <div className="metric-card-box">
                  <span className="mc-title">Local Daemon</span>
                  <span className="mc-value mc-purple">PID 20264</span>
                  <span className="mc-sub">Zero-API-key mode</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Live System Metrics Gauges & Waveform */}
        <div className="btd-metrics-panel">
          <div className="bmp-header-row">
            <div className="bmp-title-group">
              <span className="telemetry-live-dot"></span>
              <span className="bmp-title">SYSTEM HARDWARE METRICS</span>
            </div>
            <span className="bmp-rate-tag">164 t/s</span>
          </div>

          <div className="bmp-gauges-row">
            {/* CPU Gauge */}
            <div className="gauge-item">
              <div className="gauge-circle gc-cyan">
                <span className="gc-val">42%</span>
              </div>
              <span className="gauge-label">CPU</span>
            </div>

            {/* RAM Gauge */}
            <div className="gauge-item">
              <div className="gauge-circle gc-purple">
                <span className="gc-val">68%</span>
              </div>
              <span className="gauge-label">RAM</span>
            </div>

            {/* Disk Gauge */}
            <div className="gauge-metric-item">
              <span className="gm-val">1.2 GB</span>
              <span className="gauge-label">NVMe Disk</span>
            </div>

            {/* Network Gauge */}
            <div className="gauge-metric-item">
              <span className="gm-val gm-cyan">↑ 12.4 MB/s</span>
              <span className="gauge-label">I/O Network</span>
            </div>
          </div>

          {/* Real-time telemetry waveform - Cleanly Framed Oscilloscope (No Clipping) */}
          <div className="telemetry-waveform-card">
            <div className="waveform-card-meta">
              <span className="wcm-label">LIVE BANDWIDTH HARMONIC</span>
              <span className="wcm-val">0.0% COLLISION</span>
            </div>
            <div className="telemetry-waveform-svg-box">
              <svg viewBox="0 0 300 36" className="waveform-svg" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cyanWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Gradient area fill under curve */}
                <path
                  d="M 0,22 C 25,8 50,30 75,18 C 100,6 125,28 150,16 C 175,8 200,26 225,14 C 250,6 275,24 300,16 L 300,36 L 0,36 Z"
                  fill="url(#cyanWaveGrad)"
                />
                {/* Primary Cyan Stroke Line */}
                <path
                  d="M 0,22 C 25,8 50,30 75,18 C 100,6 125,28 150,16 C 175,8 200,26 225,14 C 250,6 275,24 300,16"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Secondary Purple Phase Line */}
                <path
                  d="M 0,26 C 30,14 60,32 90,20 C 120,10 150,28 180,18 C 210,12 240,26 270,16 C 285,12 295,20 300,18"
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.65"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <footer className="btd-footer">
        <div className="btd-footer-left">
          <span className="online-indicator-dot"></span>
          <span className="footer-status-text">System Online</span>
          <span className="footer-divider">•</span>
          <span className="footer-agents-count">{activeAgentsCount}/4 Agents Active</span>
        </div>
        <div className="btd-footer-right">
          <span>Built with Antigravity • Powered by Gemini</span>
        </div>
      </footer>
    </div>
  );
};
