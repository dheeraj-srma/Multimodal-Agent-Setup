import React, { useEffect, useState, useRef } from 'react';
import { AgentId, AgentStatus, AgentEvent, AgentMessagePayload } from '../../types';
import {
  Sparkles,
  Sun,
  Cpu,
  Infinity as InfinityIcon,
  Search,
  Radio,
  Share2,
  Layers,
  Settings2,
  Sliders,
  Check,
} from 'lucide-react';
import {
  AVAILABLE_MODELS,
  ModelTopologyMode,
  TOPOLOGY_PRESETS,
  ALL_SUPPORTED_MODELS,
  DetailedAIModel,
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
}

interface TravellingPacket {
  id: string;
  from: AgentId;
  to: AgentId;
  color: string;
  label: string;
  startTime: number;
}

// Coordinate topology (0 to 1000 viewBox) - exact 3-tier layout
const NODE_COORDINATES: Record<
  AgentId,
  { x: number; y: number; roleKey: string; defaultModel: string; badges?: string[] }
> = {
  orchestrator: {
    x: 500,
    y: 105,
    roleKey: 'Orchestrator',
    defaultModel: 'Gemini 1.5 Pro',
    badges: ['Task Decomposed: 4 subtasks created', 'Planning: Coordinating agents'],
  },
  design: {
    x: 230,
    y: 275,
    roleKey: 'Design & UX',
    defaultModel: 'Claude 3.5 Sonnet',
    badges: ['UI/UX Analysis: Designing new layout...'],
  },
  coder: {
    x: 770,
    y: 275,
    roleKey: 'Backend & Code',
    defaultModel: 'GPT-4o',
    badges: ['Implementing Features: Editing 6 files...'],
  },
  research: {
    x: 350,
    y: 465,
    roleKey: 'Research',
    defaultModel: 'Perplexity Sonar',
    badges: ['Researching best practices: Found 12 relevant sources'],
  },
  tester: {
    x: 650,
    y: 465,
    roleKey: 'Testing & Review',
    defaultModel: 'Llama 3.1 70B',
    badges: ['Test suite in progress: 14/37 tests passed'],
  },
};

// Data transfer badge markers along the curves
const DATA_BADGES = [
  { text: 'Sending context • 2.4s • 12 KB', x: 340, y: 185 },
  { text: 'Sharing results • 1.8s • 8 KB', x: 500, y: 350 },
  { text: 'Syncing changes • 0.9s • 4 KB', x: 670, y: 370 },
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
}) => {
  const [packets, setPackets] = useState<TravellingPacket[]>([]);
  const processedEventIds = useRef<Set<string>>(new Set());

  // Listen for real message/task events to trigger travelling data packets
  useEffect(() => {
    if (recentEvents.length === 0) return;
    const latest = recentEvents[recentEvents.length - 1];
    if (processedEventIds.current.has(latest.id)) return;
    processedEventIds.current.add(latest.id);

    if (latest.type === 'AGENT_MESSAGE') {
      const msg = latest.payload as AgentMessagePayload;
      if (msg.to !== 'broadcast' && NODE_COORDINATES[msg.from] && NODE_COORDINATES[msg.to]) {
        addPacket(msg.from, msg.to, '#00f0ff', msg.subject);
      }
    } else if (latest.type === 'TASK_CREATED') {
      const task = latest.payload as any;
      const tgt = task.agentId as AgentId;
      if (tgt && NODE_COORDINATES[tgt]) {
        addPacket('orchestrator', tgt, '#00f0ff', 'TASK DISPATCH');
      }
    } else if (latest.type === 'TASK_COMPLETED') {
      const task = (latest.payload as any).task;
      const src = task?.agentId as AgentId;
      if (src && NODE_COORDINATES[src]) {
        addPacket(src, 'orchestrator', '#10b981', 'COMPLETED');
      }
    }
  }, [recentEvents]);

  const addPacket = (from: AgentId, to: AgentId, color: string, label: string) => {
    const packetId = `pkt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setPackets((prev) => [...prev.slice(-10), { id: packetId, from, to, color, label, startTime: Date.now() }]);
    setTimeout(() => {
      setPackets((prev) => prev.filter((p) => p.id !== packetId));
    }, 1400);
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
            <span>Configure Models</span>
          </button>
        </div>
      </div>

      {/* Hero Graph Canvas */}
      <div className="multi-agent-graph-canvas">
        <svg className="mag-svg" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="apexGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.25)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id="packetGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. Curved Spline Interconnection Channels */}
          <g className="channels-layer">
            {/* Orchestrator -> Design */}
            <path d="M 500,135 Q 320,165 230,235" className="spline-channel sc-cyan" />
            {/* Orchestrator -> Coder */}
            <path d="M 500,135 Q 680,165 770,235" className="spline-channel sc-emerald" />
            {/* Design -> Research */}
            <path d="M 230,315 Q 240,425 350,445" className="spline-channel sc-amber" />
            {/* Coder -> Tester */}
            <path d="M 770,315 Q 760,425 650,445" className="spline-channel sc-purple" />
            {/* Research -> Orchestrator Loop */}
            <path d="M 350,445 Q 500,335 500,165" className="spline-channel sc-cyan" />
            {/* Tester -> Orchestrator Loop */}
            <path d="M 650,445 Q 500,335 500,165" className="spline-channel sc-purple" />
          </g>

          {/* 2. Floating Data Transfer Badges along Curves */}
          <g className="data-badges-layer">
            {DATA_BADGES.map((b, idx) => (
              <g key={idx} transform={`translate(${b.x}, ${b.y})`}>
                <rect x="-85" y="-12" width="170" height="24" rx="12" className="data-transfer-pill" />
                <text x="0" y="4" className="data-transfer-text">
                  {b.text}
                </text>
              </g>
            ))}
          </g>

          {/* 3. Travelling Animated Packets */}
          <g className="travelling-packets-layer">
            {packets.map((pkt) => {
              const src = NODE_COORDINATES[pkt.from];
              const dst = NODE_COORDINATES[pkt.to];
              if (!src || !dst) return null;
              const midX = (src.x + dst.x) / 2;
              const midY = (src.y + dst.y) / 2;
              const pathData = `M ${src.x},${src.y} Q ${midX},${midY} ${dst.x},${dst.y}`;

              return (
                <circle
                  key={pkt.id}
                  r="6"
                  className="travelling-pulse-dot"
                  style={{
                    offsetPath: `path('${pathData}')`,
                    fill: pkt.color,
                    filter: 'url(#packetGlow)',
                  } as React.CSSProperties}
                />
              );
            })}
          </g>

          {/* 4. Multi-Model Nodes */}
          <g className="model-nodes-layer">
            {(Object.keys(NODE_COORDINATES) as AgentId[]).map((agentId) => {
              const node = NODE_COORDINATES[agentId];
              const status = statuses[agentId] || {
                state: 'WORKING',
                progress: agentId === 'orchestrator' ? 78 : agentId === 'design' ? 62 : agentId === 'coder' ? 71 : agentId === 'research' ? 54 : 38,
              };
              const isSelected = selectedAgentId === agentId;
              const model = getModelForAgent(agentId);
              const isWorking = status.state === 'WORKING' || status.state === 'STARTING';

              const renderIcon = () => {
                if (model.provider === 'google') return <Sparkles size={17} color={model.color} />;
                if (model.provider === 'anthropic') return <Sun size={17} color={model.color} />;
                if (model.provider === 'openai') return <Cpu size={17} color={model.color} />;
                if (model.provider === 'meta') return <InfinityIcon size={17} color={model.color} />;
                if (model.provider === 'perplexity') return <Search size={17} color={model.color} />;
                return <Radio size={17} color={model.color} />;
              };

              return (
                <g
                  key={agentId}
                  className={`swarm-node-group ${isSelected ? 'node-active-selected' : ''}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => onSelectAgent(agentId)}
                >
                  {/* Node Outer Halo */}
                  <rect
                    x="-96"
                    y="-42"
                    width="192"
                    height="84"
                    rx="12"
                    className="swarm-node-bg"
                    style={{
                      stroke: model.color,
                    }}
                  />

                  {/* Upper Status Pill Badges for Orchestrator */}
                  {agentId === 'orchestrator' && (
                    <>
                      <g transform="translate(-135, -58)">
                        <rect x="0" y="0" width="125" height="18" rx="9" className="mini-badge-pill" />
                        <text x="62" y="12" className="mini-badge-text">Task Decomposed • 4</text>
                      </g>
                      <g transform="translate(10, -58)">
                        <rect x="0" y="0" width="125" height="18" rx="9" className="mini-badge-pill" />
                        <text x="62" y="12" className="mini-badge-text">Planning • Coordinating</text>
                      </g>
                    </>
                  )}

                  {/* Model Icon / Avatar Circle */}
                  <g transform="translate(-76, -26)">
                    <circle cx="16" cy="16" r="14" fill="rgba(255,255,255,0.05)" stroke={model.color} strokeWidth="1" />
                    <g transform="translate(7, 7)">{renderIcon()}</g>
                  </g>

                  {/* Model Title */}
                  <text x="-32" y="-10" className="node-model-title">
                    {model.name}
                  </text>

                  {/* Role Subtitle */}
                  <text x="-32" y="5" className="node-role-subtitle" fill={model.color}>
                    {node.roleKey}
                  </text>

                  {/* Progress State */}
                  <text x="-32" y="21" className="node-action-progress">
                    {isWorking ? 'Working...' : status.state} {status.progress}%
                  </text>

                  {/* Mini Progress Line */}
                  <line x1="-32" y1="28" x2="72" y2="28" stroke="rgba(255,255,255,0.1)" strokeWidth="2" rx="1" />
                  <line
                    x1="-32"
                    y1="28"
                    x2={-32 + (104 * status.progress) / 100}
                    y2="28"
                    stroke={model.color}
                    strokeWidth="2"
                    rx="1"
                  />

                  {/* Bottom Context Pill Badge (for worker agents) */}
                  {agentId !== 'orchestrator' && node.badges && (
                    <g transform="translate(-86, 52)">
                      <rect x="0" y="0" width="172" height="20" rx="6" className="worker-badge-pill" />
                      <text x="86" y="13" className="worker-badge-text">
                        {node.badges[0].slice(0, 28)}...
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
