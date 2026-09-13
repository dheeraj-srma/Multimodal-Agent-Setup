import React, { useEffect, useState, useRef } from 'react';
import { AgentId, AgentStatus, AgentEvent, AgentMessagePayload } from '../../types';
import { Brain, Palette, Code, FlaskConical, FileCheck } from 'lucide-react';
import './AgentGraph.css';

interface AgentGraphProps {
  statuses: Record<AgentId, AgentStatus>;
  selectedAgentId?: AgentId;
  onSelectAgent: (agentId: AgentId) => void;
  recentEvents: AgentEvent[];
}

interface TravellingPacket {
  id: string;
  from: AgentId;
  to: AgentId;
  color: string;
  label: string;
  startTime: number;
}

// Normalized coordinate topology (0 to 1000 viewBox) - exact 3-tier hierarchy
const NODE_COORDINATES: Record<
  AgentId,
  { x: number; y: number; label: string; sublabel: string; color: string; icon: any }
> = {
  orchestrator: {
    x: 500,
    y: 65,
    label: '🧠 ORCHESTRATOR',
    sublabel: 'Antigravity Agent',
    color: 'var(--telemetry-cyan)',
    icon: Brain,
  },
  design: {
    x: 200,
    y: 225,
    label: '🎨 DESIGN',
    sublabel: 'Agent',
    color: 'var(--telemetry-violet)',
    icon: Palette,
  },
  coder: {
    x: 500,
    y: 225,
    label: '💻 CODER',
    sublabel: 'Agent',
    color: 'var(--telemetry-blue)',
    icon: Code,
  },
  research: {
    x: 800,
    y: 225,
    label: '🔬 RESEARCH',
    sublabel: 'Agent',
    color: 'var(--telemetry-emerald)',
    icon: FlaskConical,
  },
  tester: {
    x: 500,
    y: 395,
    label: '🧪 TESTER',
    sublabel: 'Agent',
    color: 'var(--telemetry-amber)',
    icon: FileCheck,
  },
};

// Valid communication channels reflecting the exact DAG topology
const CHANNELS: Array<{ from: AgentId; to: AgentId }> = [
  // Orchestrator dispatches to Design, Coder, and Research
  { from: 'orchestrator', to: 'design' },
  { from: 'orchestrator', to: 'coder' },
  { from: 'orchestrator', to: 'research' },

  // Collaboration across mid-tier
  { from: 'design', to: 'coder' },
  { from: 'research', to: 'coder' },

  // All 3 converge into Tester
  { from: 'design', to: 'tester' },
  { from: 'coder', to: 'tester' },
  { from: 'research', to: 'tester' },

  // Final verification report sent back to Orchestrator
  { from: 'tester', to: 'orchestrator' },
];

export const AgentGraph: React.FC<AgentGraphProps> = ({
  statuses,
  selectedAgentId,
  onSelectAgent,
  recentEvents,
}) => {
  const [packets, setPackets] = useState<TravellingPacket[]>([]);
  const processedEventIds = useRef<Set<string>>(new Set());

  // Listen for real message/task events to trigger travelling data packets!
  useEffect(() => {
    if (recentEvents.length === 0) return;
    const latest = recentEvents[recentEvents.length - 1];
    if (processedEventIds.current.has(latest.id)) return;
    processedEventIds.current.add(latest.id);

    if (latest.type === 'AGENT_MESSAGE') {
      const msg = latest.payload as AgentMessagePayload;
      if (msg.to !== 'broadcast' && NODE_COORDINATES[msg.from] && NODE_COORDINATES[msg.to]) {
        addPacket(msg.from, msg.to, NODE_COORDINATES[msg.from].color, msg.subject);
      } else if (msg.to === 'broadcast' && NODE_COORDINATES[msg.from]) {
        // Broadcast packet to all workers
        const targets: AgentId[] = ['research', 'design', 'coder', 'tester'];
        targets.forEach((tgt) => {
          if (tgt !== msg.from) {
            addPacket(msg.from, tgt, NODE_COORDINATES[msg.from].color, 'BROADCAST');
          }
        });
      }
    } else if (latest.type === 'TASK_CREATED') {
      const task = latest.payload as any;
      const targetAgent = task.agentId as AgentId;
      if (targetAgent && NODE_COORDINATES[targetAgent]) {
        addPacket('orchestrator', targetAgent, 'var(--telemetry-cyan)', `TASK: ${task.title.slice(0, 14)}...`);
      }
    } else if (latest.type === 'TASK_COMPLETED') {
      const task = (latest.payload as any).task;
      const srcAgent = task?.agentId as AgentId;
      if (srcAgent && NODE_COORDINATES[srcAgent]) {
        addPacket(srcAgent, 'orchestrator', 'var(--telemetry-emerald)', 'COMPLETED');
      }
    }
  }, [recentEvents]);

  const addPacket = (from: AgentId, to: AgentId, color: string, label: string) => {
    const packetId = `pkt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newPacket: TravellingPacket = {
      id: packetId,
      from,
      to,
      color,
      label,
      startTime: Date.now(),
    };

    setPackets((prev) => [...prev.slice(-12), newPacket]);

    // Automatically remove after animation completes (1.4 seconds)
    setTimeout(() => {
      setPackets((prev) => prev.filter((p) => p.id !== packetId));
    }, 1400);
  };

  return (
    <div className="agent-graph-container">
      <div className="graph-header-bar">
        <span className="graph-title">AGENT SWARM TOPOLOGY & DATA FLOW</span>
        <span className="graph-hint">Interactive nodes. Glowing packets trigger on real message exchanges.</span>
      </div>

      <svg className="agent-graph-svg" viewBox="0 0 1000 480" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0, 240, 255, 0.2)" />
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

        {/* Render Connection Channels */}
        <g className="channels-group">
          {CHANNELS.map((ch, idx) => {
            const src = NODE_COORDINATES[ch.from];
            const dst = NODE_COORDINATES[ch.to];
            const isOrchestratorLink = ch.from === 'orchestrator' || ch.to === 'orchestrator';

            // Curved quadratic Bezier path
            const midX = (src.x + dst.x) / 2;
            const midY = (src.y + dst.y) / 2 + (isOrchestratorLink ? 0 : 20);
            const pathData = `M ${src.x} ${src.y} Q ${midX} ${midY} ${dst.x} ${dst.y}`;

            return (
              <path
                key={idx}
                d={pathData}
                className="channel-line"
                id={`ch-${ch.from}-${ch.to}`}
              />
            );
          })}
        </g>

        {/* Render Travelling Packets */}
        <g className="packets-group">
          {packets.map((pkt) => {
            const src = NODE_COORDINATES[pkt.from];
            const dst = NODE_COORDINATES[pkt.to];
            if (!src || !dst) return null;

            const isOrchestratorLink = pkt.from === 'orchestrator' || pkt.to === 'orchestrator';
            const midX = (src.x + dst.x) / 2;
            const midY = (src.y + dst.y) / 2 + (isOrchestratorLink ? 0 : 20);
            const pathData = `M ${src.x} ${src.y} Q ${midX} ${midY} ${dst.x} ${dst.y}`;

            return (
              <g key={pkt.id}>
                {/* Visual pulse line */}
                <path
                  d={pathData}
                  className="packet-travel-path"
                  style={{ stroke: pkt.color }}
                />
                {/* Glowing packet circle */}
                <circle
                  r="6"
                  className="travelling-dot"
                  style={
                    {
                      offsetPath: `path('${pathData}')`,
                      fill: pkt.color,
                      filter: 'url(#packetGlow)',
                    } as React.CSSProperties
                  }
                />
              </g>
            );
          })}
        </g>

        {/* Render Interactive Agent Nodes */}
        <g className="nodes-group">
          {(Object.keys(NODE_COORDINATES) as AgentId[]).map((agentId) => {
            const node = NODE_COORDINATES[agentId];
            const status = statuses[agentId] || {
              state: 'IDLE',
              progress: 0,
              filesTouchedCount: 0,
              messagesCount: 0,
            };
            const isSelected = selectedAgentId === agentId;
            const isWorking = status.state === 'WORKING' || status.state === 'STARTING';
            const Icon = node.icon;

            return (
              <g
                key={agentId}
                className={`graph-node ${isSelected ? 'node-selected' : ''} ${isWorking ? 'node-working' : ''}`}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => onSelectAgent(agentId)}
              >
                {/* Node Glow Background */}
                <circle r={isSelected ? 48 : 42} className="node-glow-ring" fill="url(#nodeGlow)" />

                {/* Main Node Body */}
                <rect
                  x="-85"
                  y="-34"
                  width="170"
                  height="68"
                  rx="10"
                  className="node-box"
                  style={{
                    stroke: isSelected ? '#00f0ff' : node.color,
                    boxShadow: `0 0 20px ${node.color}`,
                  }}
                />

                {/* State Indicator Dot */}
                <circle
                  cx="-65"
                  cy="0"
                  r="5"
                  fill={isWorking ? '#10b981' : status.state === 'WAITING' ? '#f59e0b' : '#64748b'}
                />

                {/* Node Icon */}
                <g transform="translate(-48, -10)">
                  <Icon size={18} color={node.color} />
                </g>

                {/* Node Title */}
                <text x="-20" y="-8" className="node-title-text">
                  {node.label}
                </text>

                {/* Node Subtitle (Antigravity Agent / Agent) */}
                <text x="-20" y="7" className="node-sublabel-text">
                  {node.sublabel}
                </text>

                {/* Node State & Progress */}
                <text x="-20" y="21" className="node-state-text" fill={node.color}>
                  {status.state} ({status.progress}%)
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
