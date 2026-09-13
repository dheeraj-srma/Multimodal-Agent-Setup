import React, { useEffect, useState, useRef } from 'react';
import { AgentId, AgentStatus, AgentEvent, AgentMessagePayload } from '../../types';
import {
  Sparkles,
  Sun,
  Cpu,
  Infinity as InfinityIcon,
  Search,
  Radio,
  Layers,
  Settings2,
  Sliders,
  Check,
  Lock,
  AlertTriangle,
  RotateCcw,
  Pause,
  Play,
  Zap,
} from 'lucide-react';
import {
  ModelTopologyMode,
  TOPOLOGY_PRESETS,
  ALL_SUPPORTED_MODELS,
  DetailedAIModel,
  ROLE_COLORS,
  ROLE_GLOWS,
} from '../../config/models';
import './AgentGraph.css';

interface AgentGraphProps {
  statuses: Record<AgentId, AgentStatus>;
  selectedAgentId?: AgentId;
  onSelectAgent: (agentId: AgentId) => void;
  recentEvents: AgentEvent[];
  topologyMode: ModelTopologyMode;
  customAssignments?: Partial<Record<AgentId, string>>;
  onSelectTopologyMode: (mode: ModelTopologyMode) => void;
  onOpenModelConfig: () => void;
  onModelChange?: (agentId: AgentId, modelId: string) => void;
  onTogglePauseAgent?: (agentId: AgentId) => void;
  onRetryAgent?: (agentId: AgentId) => void;
}

interface DynamicPacket {
  id: string;
  from: AgentId;
  to: AgentId;
  color: string;
  label: string;
}

// Hierarchical tiered node geometry
const NODE_HIERARCHY: Record<
  AgentId,
  {
    x: number;
    y: number;
    w: number;
    h: number;
    tier: 'apex' | 'mid' | 'leaf';
    roleKey: string;
    badges: string[];
    defaultTokens: string;
    defaultCpu: number;
  }
> = {
  orchestrator: {
    x: 500,
    y: 95,
    w: 236,
    h: 104,
    tier: 'apex',
    roleKey: 'Orchestrator',
    badges: ['Task Decomposed: 5 subtasks', 'Coordinating Swarm'],
    defaultTokens: '48.2k',
    defaultCpu: 34,
  },
  design: {
    x: 230,
    y: 275,
    w: 204,
    h: 88,
    tier: 'mid',
    roleKey: 'Design & UX',
    badges: ['UI Specs & Tokens'],
    defaultTokens: '18.4k',
    defaultCpu: 26,
  },
  coder: {
    x: 770,
    y: 275,
    w: 204,
    h: 88,
    tier: 'mid',
    roleKey: 'Backend & Code',
    badges: ['AST Transformations'],
    defaultTokens: '32.1k',
    defaultCpu: 58,
  },
  research: {
    x: 350,
    y: 470,
    w: 192,
    h: 82,
    tier: 'leaf',
    roleKey: 'Research',
    badges: ['12 sources cited'],
    defaultTokens: '14.8k',
    defaultCpu: 19,
  },
  tester: {
    x: 650,
    y: 470,
    w: 192,
    h: 82,
    tier: 'leaf',
    roleKey: 'Testing & Review',
    badges: ['WCAG AAA & Regressions'],
    defaultTokens: '12.0k',
    defaultCpu: 22,
  },
};

// Continuous connection paths
const PIPELINE_PATHS = {
  orchToDesign: 'M 500,147 C 410,180 290,200 230,231',
  orchToCoder: 'M 500,147 C 590,180 710,200 770,231',
  designToResearch: 'M 230,319 C 230,395 285,435 350,449',
  coderToTester: 'M 770,319 C 770,395 715,435 650,449',
  researchToOrch: 'M 350,429 C 410,340 460,220 480,147',
  testerToOrch: 'M 650,429 C 590,340 540,220 520,147',
};

// Data transfer badge markers
const DATA_BADGES = [
  { text: 'Directive Dispatch • 12 KB/s', x: 335, y: 180, color: '#38bdf8' },
  { text: 'Feature Implementation • 28 KB/s', x: 665, y: 180, color: '#34d399' },
  { text: 'Design Specs • 8 KB/s', x: 260, y: 380, color: '#c084fc' },
  { text: 'Verification Suite • 14 KB/s', x: 740, y: 380, color: '#f43f5e' },
  { text: 'Convergence Loop • 6 KB/s', x: 500, y: 320, color: '#38bdf8' },
];

export const AgentGraph: React.FC<AgentGraphProps> = ({
  statuses,
  selectedAgentId,
  onSelectAgent,
  recentEvents,
  topologyMode,
  customAssignments = {},
  onSelectTopologyMode,
  onOpenModelConfig,
  onModelChange,
  onTogglePauseAgent,
  onRetryAgent,
}) => {
  const [dynamicPackets, setDynamicPackets] = useState<DynamicPacket[]>([]);
  const [hoveredAgentId, setHoveredAgentId] = useState<AgentId | null>(null);
  const [modelDropdownAgentId, setModelDropdownAgentId] = useState<AgentId | null>(null);
  const processedEventIds = useRef<Set<string>>(new Set());

  // Listen for real message/task events to trigger transient packets
  useEffect(() => {
    if (recentEvents.length === 0) return;
    const latest = recentEvents[recentEvents.length - 1];
    if (processedEventIds.current.has(latest.id)) return;
    processedEventIds.current.add(latest.id);

    if (latest.type === 'AGENT_MESSAGE') {
      const msg = latest.payload as AgentMessagePayload;
      if (msg.to !== 'broadcast' && NODE_HIERARCHY[msg.from] && NODE_HIERARCHY[msg.to]) {
        addDynamicPacket(msg.from, msg.to, ROLE_COLORS[msg.from] || '#00f0ff', msg.subject);
      }
    } else if (latest.type === 'TASK_CREATED') {
      const task = latest.payload as any;
      const tgt = task.agentId as AgentId;
      if (tgt && NODE_HIERARCHY[tgt]) {
        addDynamicPacket('orchestrator', tgt, '#38bdf8', 'TASK');
      }
    } else if (latest.type === 'TASK_COMPLETED') {
      const task = (latest.payload as any).task;
      const src = task?.agentId as AgentId;
      if (src && NODE_HIERARCHY[src]) {
        addDynamicPacket(src, 'orchestrator', '#34d399', 'DONE');
      }
    }
  }, [recentEvents]);

  const addDynamicPacket = (from: AgentId, to: AgentId, color: string, label: string) => {
    const packetId = `pkt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setDynamicPackets((prev) => [...prev.slice(-8), { id: packetId, from, to, color, label }]);
    setTimeout(() => {
      setDynamicPackets((prev) => prev.filter((p) => p.id !== packetId));
    }, 1600);
  };

  const getModelForAgent = (agentId: AgentId): DetailedAIModel => {
    const assignedId = customAssignments[agentId] || TOPOLOGY_PRESETS[topologyMode]?.assignments[agentId];
    return ALL_SUPPORTED_MODELS.find((m) => m.id === assignedId) || ALL_SUPPORTED_MODELS[0];
  };

  return (
    <div className="agent-graph-wrapper">
      {/* Top Topology Controls Bar */}
      <div className="graph-topology-bar">
        <div className="gtb-left">
          <div className="gtb-title-group">
            <Layers size={13} className="gtb-icon" />
            <span className="gtb-title">TOPOLOGY:</span>
          </div>

          <div className="gtb-presets-pill-group">
            <button
              className={`gtb-preset-btn ${topologyMode === 'multi-provider' ? 'gtb-btn-active' : ''}`}
              onClick={() => onSelectTopologyMode('multi-provider')}
              title="Different models from different providers (Gemini, Claude, GPT, Llama, Perplexity)"
            >
              <Sparkles size={11} className="gtb-btn-icon" />
              <span>Different Providers</span>
            </button>

            <button
              className={`gtb-preset-btn ${topologyMode === 'all-gemini' ? 'gtb-btn-active' : ''}`}
              onClick={() => onSelectTopologyMode('all-gemini')}
              title="Same model across all agents: Gemini 1.5 Pro via active Antigravity subscription"
            >
              <Check size={11} className="gtb-btn-icon" />
              <span>Same Model (Gemini Pro)</span>
            </button>

            <button
              className={`gtb-preset-btn ${topologyMode === 'all-claude' ? 'gtb-btn-active' : ''}`}
              onClick={() => onSelectTopologyMode('all-claude')}
              title="Same model across all agents: Claude 3.5 Sonnet"
            >
              <Sun size={11} className="gtb-btn-icon" />
              <span>Same Model (Claude 3.5)</span>
            </button>

            <button
              className={`gtb-preset-btn ${topologyMode === 'all-local' ? 'gtb-btn-active' : ''}`}
              onClick={() => onSelectTopologyMode('all-local')}
              title="Open-weights models running completely locally via Ollama / Antigravity"
            >
              <Radio size={11} className="gtb-btn-icon" />
              <span>All Local (Ollama)</span>
            </button>

            <button
              className={`gtb-preset-btn ${topologyMode === 'custom' ? 'gtb-btn-active' : ''}`}
              onClick={() => onSelectTopologyMode('custom')}
              title="User-defined custom model assignment per role"
            >
              <Sliders size={11} className="gtb-btn-icon" />
              <span>Custom Matrix</span>
            </button>
          </div>
        </div>

        <div className="gtb-right">
          <button className="gtb-config-btn" onClick={onOpenModelConfig} title="Configure models and parameters">
            <Settings2 size={13} />
            <span>Configure Swarm</span>
          </button>
        </div>
      </div>

      {/* Hero Graph Canvas */}
      <div className="multi-agent-graph-canvas">
        <svg className="mag-svg" viewBox="0 0 1000 570" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Ambient Radial Glows */}
            <radialGradient id="apexOrchGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.3)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id="packetGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Diagonal Hatch Pattern for Blocked / Waiting State */}
            <pattern id="blockedHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(245, 158, 11, 0.25)" strokeWidth="3" />
            </pattern>
          </defs>

          {/* 1. Curved Spline Channels with Directional Gradient Stems */}
          <g className="channels-layer">
            <path id="pathOrchDesign" d={PIPELINE_PATHS.orchToDesign} className="spline-channel sc-cyan" />
            <path id="pathOrchCoder" d={PIPELINE_PATHS.orchToCoder} className="spline-channel sc-emerald" />
            <path id="pathDesignResearch" d={PIPELINE_PATHS.designToResearch} className="spline-channel sc-violet" />
            <path id="pathCoderTester" d={PIPELINE_PATHS.coderToTester} className="spline-channel sc-rose" />
            <path id="pathResearchOrch" d={PIPELINE_PATHS.researchToOrch} className="spline-channel sc-amber" />
            <path id="pathTesterOrch" d={PIPELINE_PATHS.testerToOrch} className="spline-channel sc-rose" />
          </g>

          {/* 2. Continuous Flowing Particles Along Splines */}
          <g className="continuous-particles-layer">
            {/* Orch -> Design particle */}
            <circle r="3.5" fill="#38bdf8" filter="url(#packetGlow)">
              <animateMotion dur="2.4s" repeatCount="indefinite" path={PIPELINE_PATHS.orchToDesign} />
            </circle>
            {/* Orch -> Coder particle */}
            <circle r="4" fill="#34d399" filter="url(#packetGlow)">
              <animateMotion dur="2.1s" repeatCount="indefinite" path={PIPELINE_PATHS.orchToCoder} />
            </circle>
            {/* Design -> Research particle */}
            <circle r="3" fill="#c084fc" filter="url(#packetGlow)">
              <animateMotion dur="2.6s" repeatCount="indefinite" path={PIPELINE_PATHS.designToResearch} />
            </circle>
            {/* Coder -> Tester particle */}
            <circle r="3.5" fill="#f43f5e" filter="url(#packetGlow)">
              <animateMotion dur="2.2s" repeatCount="indefinite" path={PIPELINE_PATHS.coderToTester} />
            </circle>
            {/* Research -> Orch feedback */}
            <circle r="3" fill="#fb923c" filter="url(#packetGlow)">
              <animateMotion dur="3.0s" repeatCount="indefinite" path={PIPELINE_PATHS.researchToOrch} />
            </circle>
            {/* Tester -> Orch feedback */}
            <circle r="3" fill="#f43f5e" filter="url(#packetGlow)">
              <animateMotion dur="2.7s" repeatCount="indefinite" path={PIPELINE_PATHS.testerToOrch} />
            </circle>
          </g>

          {/* 3. Floating Data Transfer Volume Pills along Curves */}
          <g className="data-badges-layer">
            {DATA_BADGES.map((b, idx) => (
              <g key={idx} transform={`translate(${b.x}, ${b.y})`}>
                <rect x="-85" y="-11" width="170" height="22" rx="11" className="data-transfer-pill" />
                <text x="0" y="4" className="data-transfer-text" style={{ fill: b.color }}>
                  {b.text}
                </text>
              </g>
            ))}
          </g>

          {/* 4. Multi-Model Nodes with Tiered Hierarchy */}
          <g className="model-nodes-layer">
            {(Object.keys(NODE_HIERARCHY) as AgentId[]).map((agentId) => {
              const node = NODE_HIERARCHY[agentId];
              const roleColor = ROLE_COLORS[agentId];
              const roleGlow = ROLE_GLOWS[agentId];
              const status = statuses[agentId] || {
                state: 'WORKING',
                progress: agentId === 'orchestrator' ? 82 : agentId === 'design' ? 68 : agentId === 'coder' ? 74 : agentId === 'research' ? 58 : 42,
              };
              const isSelected = selectedAgentId === agentId;
              const isHovered = hoveredAgentId === agentId;
              const model = getModelForAgent(agentId);

              const isBlocked = status.isBlocked || status.state === 'BLOCKED' || status.state === 'WAITING';
              const isFailed = status.state === 'FAILED';
              const isWorking = status.state === 'WORKING' || status.state === 'STARTING';
              const isApex = node.tier === 'apex';

              const renderIcon = () => {
                if (model.provider === 'google') return <Sparkles size={isApex ? 19 : 16} color={roleColor} />;
                if (model.provider === 'anthropic') return <Sun size={isApex ? 19 : 16} color={roleColor} />;
                if (model.provider === 'openai') return <Cpu size={isApex ? 19 : 16} color={roleColor} />;
                if (model.provider === 'meta') return <InfinityIcon size={isApex ? 19 : 16} color={roleColor} />;
                if (model.provider === 'perplexity') return <Search size={isApex ? 19 : 16} color={roleColor} />;
                return <Radio size={isApex ? 19 : 16} color={roleColor} />;
              };

              const halfW = node.w / 2;
              const halfH = node.h / 2;

              return (
                <g
                  key={agentId}
                  className={`swarm-node-group node-tier-${node.tier} ${isSelected ? 'node-active-selected' : ''} ${
                    isBlocked ? 'node-state-blocked' : ''
                  } ${isFailed ? 'node-state-failed' : ''}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => onSelectAgent(agentId)}
                  onMouseEnter={() => setHoveredAgentId(agentId)}
                  onMouseLeave={() => setHoveredAgentId(null)}
                >
                  {/* Outer Apex Aura for Orchestrator */}
                  {isApex && (
                    <rect
                      x={-halfW - 8}
                      y={-halfH - 8}
                      width={node.w + 16}
                      height={node.h + 16}
                      rx="16"
                      fill="none"
                      stroke={roleColor}
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      className="apex-outer-halo"
                    />
                  )}

                  {/* Main Node Box */}
                  <rect
                    x={-halfW}
                    y={-halfH}
                    width={node.w}
                    height={node.h}
                    rx={isApex ? 14 : 10}
                    className="swarm-node-bg"
                    style={{
                      stroke: isFailed ? '#f43f5e' : isBlocked ? '#f59e0b' : roleColor,
                      strokeWidth: isApex ? 2.5 : 1.8,
                    }}
                  />

                  {/* Blocked Hatch Pattern Overlay */}
                  {isBlocked && (
                    <rect
                      x={-halfW}
                      y={-halfH}
                      width={node.w}
                      height={node.h}
                      rx={isApex ? 14 : 10}
                      fill="url(#blockedHatch)"
                      opacity="0.75"
                    />
                  )}

                  {/* Top Apex Crown Badge for Orchestrator */}
                  {isApex && (
                    <g transform={`translate(-80, ${-halfH - 14})`}>
                      <rect x="0" y="0" width="160" height="20" rx="10" className="apex-crown-pill" />
                      <text x="80" y="14" className="apex-crown-text">
                        ★ APEX ORCHESTRATOR
                      </text>
                    </g>
                  )}

                  {/* Blocked Warning Badge */}
                  {isBlocked && (
                    <g transform={`translate(-70, ${-halfH - 12})`}>
                      <rect x="0" y="0" width="140" height="20" rx="6" className="blocked-status-pill" />
                      <text x="70" y="14" className="blocked-status-text">
                        🔒 WAITING ON SPEC
                      </text>
                    </g>
                  )}

                  {/* Error & Retry Badge */}
                  {isFailed && (
                    <g transform={`translate(-65, ${-halfH - 12})`}>
                      <rect x="0" y="0" width="130" height="20" rx="6" className="failed-status-pill" />
                      <text x="65" y="14" className="failed-status-text">
                        ⚠️ FAILED • RETRY #1
                      </text>
                    </g>
                  )}

                  {/* Model Icon / Avatar Circle */}
                  <g transform={`translate(${-halfW + 16}, ${-halfH + 16})`}>
                    <circle
                      cx={isApex ? 18 : 15}
                      cy={isApex ? 18 : 15}
                      r={isApex ? 17 : 14}
                      fill="rgba(255,255,255,0.06)"
                      stroke={roleColor}
                      strokeWidth="1.2"
                    />
                    <g transform={`translate(${isApex ? 8 : 7}, ${isApex ? 8 : 7})`}>{renderIcon()}</g>
                  </g>

                  {/* Model Title (Clickable for mid-run override) */}
                  <text x={-halfW + (isApex ? 60 : 54)} y={-halfH + (isApex ? 26 : 22)} className="node-model-title">
                    {model.name}
                  </text>

                  {/* Role Subtitle */}
                  <text
                    x={-halfW + (isApex ? 60 : 54)}
                    y={-halfH + (isApex ? 42 : 36)}
                    className="node-role-subtitle"
                    fill={roleColor}
                  >
                    {node.roleKey}
                  </text>

                  {/* Progress & Live State Text */}
                  <text
                    x={-halfW + (isApex ? 60 : 54)}
                    y={-halfH + (isApex ? 58 : 50)}
                    className="node-action-progress"
                  >
                    {isBlocked ? 'Blocked' : isFailed ? 'Failed' : isWorking ? 'Working...' : status.state}{' '}
                    {status.progress}%
                  </text>

                  {/* Progress Track Line */}
                  <line
                    x1={-halfW + (isApex ? 60 : 54)}
                    y1={-halfH + (isApex ? 65 : 56)}
                    x2={halfW - 16}
                    y2={-halfH + (isApex ? 65 : 56)}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1={-halfW + (isApex ? 60 : 54)}
                    y1={-halfH + (isApex ? 65 : 56)}
                    x2={
                      -halfW +
                      (isApex ? 60 : 54) +
                      ((halfW - 16 - (-halfW + (isApex ? 60 : 54))) * status.progress) / 100
                    }
                    y2={-halfH + (isApex ? 65 : 56)}
                    stroke={isFailed ? '#f43f5e' : isBlocked ? '#f59e0b' : roleColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Per-Node Mini Resource & Token Usage Tag */}
                  <g transform={`translate(${-halfW + 16}, ${halfH - 20})`}>
                    <text x="0" y="10" className="node-resource-text">
                      CPU {status.cpuPercent || node.defaultCpu}% • {status.promptTokens ? `${Math.round((status.promptTokens + (status.completionTokens || 0)) / 1000)}k` : node.defaultTokens} tok
                    </text>
                  </g>

                  {/* Node Bottom Context Pill Badge */}
                  {!isApex && node.badges && (
                    <g transform={`translate(${-halfW + 14}, ${halfH + 8})`}>
                      <rect x="0" y="0" width={node.w - 28} height="18" rx="5" className="worker-badge-pill" />
                      <text x={(node.w - 28) / 2} y="12" className="worker-badge-text">
                        {node.badges[0]}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};
