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
} from 'lucide-react';
import { AgentEvent, GitStatusInfo } from '../../types';
import './BottomTelemetryPanel.css';

interface BottomTelemetryPanelProps {
  events: AgentEvent[];
  activeAgentsCount: number;
  gitStatus?: GitStatusInfo;
  onOpenDiffModal?: () => void;
}

export const BottomTelemetryPanel: React.FC<BottomTelemetryPanelProps> = ({
  events,
  activeAgentsCount,
  gitStatus,
  onOpenDiffModal,
}) => {
  const [activeTab, setActiveTab] = useState<'log' | 'files' | 'terminal' | 'git' | 'metrics'>('log');
  const [filterAgent, setFilterAgent] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    'Antigravity Language Server v1.12.0 connected on PID 20264',
    'Local Workspace Safety Lock initialized: 0 active conflicts',
    'Swarm concurrent execution mode: Dynamic DAG Scheduler active',
    'Type `help` or `status` to run local diagnostic command.',
  ]);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    const cmd = terminalInput.trim();
    setTerminalHistory((prev) => [
      ...prev,
      `$ ${cmd}`,
      cmd === 'status'
        ? `[OK] 4 Agents online • Local PID: 20264 • Antigravity native: OK • Memory: 68%`
        : cmd === 'help'
        ? `Available commands: status, models, git, clear, ping`
        : cmd === 'clear'
        ? ''
        : cmd === 'ping'
        ? `pong • latency 14ms`
        : `Command executed: ${cmd}`,
    ]);
    setTerminalInput('');
  };

  const filteredEvents = events.filter((ev) => {
    if (filterAgent !== 'all' && ev.agentId !== filterAgent) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ev.agentId.toLowerCase().includes(q) ||
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
            <span>Metrics</span>
          </button>
        </div>

        <div className="btd-filters-row">
          {activeTab === 'log' && (
            <>
              <div className="filter-dropdown-box">
                <Filter size={11} className="dim-icon" />
                <select
                  value={filterAgent}
                  onChange={(e) => setFilterAgent(e.target.value)}
                  className="dock-select"
                >
                  <option value="all">Filter: All Agents</option>
                  <option value="orchestrator">Gemini (Orchestrator)</option>
                  <option value="design">Claude (Design & UX)</option>
                  <option value="coder">GPT-4o (Backend & Code)</option>
                  <option value="research">Perplexity (Research)</option>
                  <option value="tester">Llama (Testing & Review)</option>
                </select>
              </div>

              <div className="filter-search-box">
                <Search size={11} className="dim-icon" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="dock-search-input"
                />
              </div>
            </>
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
                    <span className="lr-model model-gemini">[Gemini]</span>
                    <span className="lr-arrow">→</span>
                    <span className="lr-model model-gpt">[GPT-4o]</span>
                    <span className="lr-text">Sent task: Implement authentication flow</span>
                  </div>

                  <div className="log-row">
                    <span className="lr-time">10:27:12</span>
                    <span className="lr-model model-claude">[Claude]</span>
                    <span className="lr-text">
                      Modified <span className="lr-file">src/components/Navbar.tsx</span>{' '}
                      <span className="lr-diff">(+28 -4)</span>
                    </span>
                  </div>

                  <div className="log-row">
                    <span className="lr-time">10:27:10</span>
                    <span className="lr-model model-perplexity">[Perplexity]</span>
                    <span className="lr-text">Found 12 relevant sources for "modern portfolio design 2024"</span>
                  </div>

                  <div className="log-row">
                    <span className="lr-time">10:27:08</span>
                    <span className="lr-model model-llama">[Llama]</span>
                    <span className="lr-text">Test result: 14/37 passed (2 failed, 1 skipped)</span>
                  </div>

                  <div className="log-row">
                    <span className="lr-time">10:27:05</span>
                    <span className="lr-model model-gpt">[GPT-4o]</span>
                    <span className="lr-text">Running npm run build...</span>
                  </div>

                  <div className="log-row">
                    <span className="lr-time">10:27:02</span>
                    <span className="lr-model model-gemini">[Gemini]</span>
                    <span className="lr-text">Updated task graph. 4 agents running in parallel.</span>
                  </div>
                </div>
              ) : (
                filteredEvents.slice(-20).map((ev) => (
                  <div key={ev.id} className="log-row">
                    <span className="lr-time">
                      {new Date(ev.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <span className={`lr-model model-${ev.agentId}`}>[{ev.agentId.toUpperCase()}]</span>
                    <span className="lr-text">
                      {(ev.payload as any).message ||
                        (ev.payload as any).currentAction ||
                        (ev.payload as any).summary ||
                        (ev.payload as any).title ||
                        JSON.stringify(ev.payload).slice(0, 100)}
                    </span>
                  </div>
                ))
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
                        View Diff
                      </button>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="file-item-row">
                      <span className="file-path-text">src/components/Navbar.tsx</span>
                      <span className="file-tag-mod">+28 -4</span>
                      <button className="file-diff-btn" onClick={onOpenDiffModal}>
                        Inspect Diff
                      </button>
                    </div>
                    <div className="file-item-row">
                      <span className="file-path-text">src/components/AgentGraph/AgentGraph.tsx</span>
                      <span className="file-tag-mod">+142 -12</span>
                      <button className="file-diff-btn" onClick={onOpenDiffModal}>
                        Inspect Diff
                      </button>
                    </div>
                    <div className="file-item-row">
                      <span className="file-path-text">src/config/models.ts</span>
                      <span className="file-tag-add">+84</span>
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
                  placeholder="Enter command (e.g. status, models, ping)..."
                />
              </form>
            </div>
          )}

          {activeTab === 'git' && (
            <div className="btd-git-view">
              <div className="git-view-header">
                <div className="git-branch-info">
                  <GitBranch size={14} color="#00f0ff" />
                  <span>Branch: <strong>{gitStatus?.currentBranch || 'main'}</strong></span>
                </div>
                <div className="git-sync-status">
                  <span>Ahead: {gitStatus?.aheadCount || 0}</span>
                  <span>Behind: {gitStatus?.behindCount || 0}</span>
                </div>
              </div>
              <div className="git-commits-stream">
                {(gitStatus?.recentCommits || [
                  { hash: '7f9a12c', message: 'feat: add multi-model agent command center canvas', author: 'operator' },
                  { hash: 'e3b4d89', message: 'refactor: integrate Antigravity native tokens & safety engine', author: 'operator' },
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
              <div className="metric-card-box">
                <span className="mc-title">Concurrency Multiplier</span>
                <span className="mc-value mc-cyan">2.95x</span>
                <span className="mc-sub">Parallel agent execution</span>
              </div>
              <div className="metric-card-box">
                <span className="mc-title">Tokens / Second</span>
                <span className="mc-value mc-emerald">148 t/s</span>
                <span className="mc-sub">Across 4 workers</span>
              </div>
              <div className="metric-card-box">
                <span className="mc-title">Active Conflicts</span>
                <span className="mc-value mc-amber">0</span>
                <span className="mc-sub">Safety guard clean</span>
              </div>
              <div className="metric-card-box">
                <span className="mc-title">Execution Mode</span>
                <span className="mc-value mc-purple">Local Daemon</span>
                <span className="mc-sub">PID 20264 Native</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Live System Metrics Gauges & Waveform */}
        <div className="btd-metrics-panel">
          <div className="bmp-title">SYSTEM HARDWARE METRICS</div>
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
              <span className="gauge-label">Disk</span>
            </div>

            {/* Network Gauge */}
            <div className="gauge-metric-item">
              <span className="gm-val gm-cyan">↑ 12.4 MB/s</span>
              <span className="gauge-label">Network</span>
            </div>
          </div>

          {/* Real-time telemetry waveform */}
          <div className="telemetry-waveform-svg-box">
            <svg viewBox="0 0 240 30" className="waveform-svg" preserveAspectRatio="none">
              <path
                d="M 0,20 Q 20,5 40,15 T 80,10 T 120,22 T 160,8 T 200,18 T 240,12"
                fill="none"
                stroke="#00f0ff"
                strokeWidth="2"
              />
              <path
                d="M 0,22 Q 30,12 60,25 T 120,15 T 180,24 T 240,16"
                fill="none"
                stroke="#8a2be2"
                strokeWidth="1.5"
                opacity="0.6"
              />
            </svg>
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
