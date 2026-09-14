import React, { useEffect, useState, useRef, useMemo } from 'react';
import { AgentId, AgentStatus, AgentEvent, AgentMessagePayload, Mission } from '../../types';
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
  HelpCircle,
  Repeat,
  ArrowRight,
  ShieldCheck,
  Coins,
} from 'lucide-react';
import {
  ModelTopologyMode,
  TOPOLOGY_PRESETS,
  ALL_SUPPORTED_MODELS,
  DetailedAIModel,
  ROLE_COLORS,
  ROLE_GLOWS,
  MODEL_PRICING,
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
  mission?: Mission;
}

interface DynamicPacket {
  id: string;
  from: AgentId;
  to: AgentId;
  color: string;
  label: string;
  pathD: string;
}

// Hierarchical tiered node geometry with generous canvas margins
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
    sparkline: number[];
  }
> = {
  orchestrator: {
    x: 500,
    y: 88,
    w: 240,
    h: 104,
    tier: 'apex',
    roleKey: 'Orchestrator',
    badges: ['Task Decomposed: 5 subtasks', 'Coordinating Swarm'],
    defaultTokens: '48.2k',
    defaultCpu: 34,
    sparkline: [22, 28, 35, 30, 42, 38, 45, 34],
  },
  design: {
    x: 225,
    y: 265,
    w: 204,
    h: 88,
    tier: 'mid',
    roleKey: 'Design & UX',
    badges: ['UI Specs & Tokens'],
    defaultTokens: '18.4k',
    defaultCpu: 26,
    sparkline: [15, 18, 22, 26, 32, 28, 24, 26],
  },
  coder: {
    x: 775,
    y: 265,
    w: 204,
    h: 88,
    tier: 'mid',
    roleKey: 'Backend & Code',
    badges: ['AST Transformations'],
    defaultTokens: '32.1k',
    defaultCpu: 58,
    sparkline: [30, 44, 52, 68, 74, 62, 55, 58],
  },
  research: {
    x: 350,
    y: 462,
    w: 192,
    h: 82,
    tier: 'leaf',
    roleKey: 'Research',
    badges: ['12 sources cited'],
    defaultTokens: '14.8k',
    defaultCpu: 19,
    sparkline: [10, 14, 18, 25, 20, 18, 22, 19],
  },
  tester: {
    x: 650,
    y: 462,
    w: 192,
    h: 82,
    tier: 'leaf',
    roleKey: 'Testing & Review',
    badges: ['WCAG AAA & Regressions'],
    defaultTokens: '12.0k',
    defaultCpu: 22,
    sparkline: [12, 16, 20, 28, 32, 26, 24, 22],
  },
};

// Continuous connection paths
const PIPELINE_PATHS: Record<string, string> = {
  orchToDesign: 'M 490,140 C 400,175 285,195 225,221',
  orchToCoder: 'M 510,140 C 600,175 715,195 775,221',
  designToCoderLoop: 'M 327,246 C 435,200 565,200 673,246', // Bi-directional negotiation arc (upper)
  coderToDesignLoop: 'M 673,284 C 565,330 435,330 327,284', // Bi-directional negotiation arc (lower)
  designToResearch: 'M 225,309 C 225,385 285,420 350,440',
  coderToTester: 'M 775,309 C 775,385 715,420 650,440',
  researchToOrch: 'M 350,421 C 410,335 460,215 480,140',
  testerToOrch: 'M 650,421 C 590,335 540,215 520,140',
};

// Data transfer badge markers - Positioned in clear spans, with zero overlap with cards
const DATA_BADGES = [
  { id: 'orchToDesign', text: 'Directive Dispatch • 12 KB/s', x: 335, y: 175, color: '#38bdf8' },
  { id: 'orchToCoder', text: 'Feature Implementation • 28 KB/s', x: 665, y: 175, color: '#34d399' },
  { id: 'designToResearch', text: 'Design Specs • 8 KB/s', x: 240, y: 380, color: '#c084fc' },
  { id: 'coderToTester', text: 'Verification Suite • 14 KB/s', x: 760, y: 380, color: '#f43f5e' },
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
  mission,
}) => {
  const [dynamicPackets, setDynamicPackets] = useState<DynamicPacket[]>([]);
  const [hoveredAgentId, setHoveredAgentId] = useState<AgentId | null>(null);
  const [activeRationaleAgentId, setActiveRationaleAgentId] = useState<AgentId | null>(null);
  const processedEventIds = useRef<Set<string>>(new Set());

  // Check if mission is actively running
  const isMissionRunning = mission?.status === 'RUNNING';

  // Determine active sequential communication channels based on active tasks
  const activeChannels = useMemo(() => {
    const active = new Set<string>();
    if (!isMissionRunning) return active;

    const tasks = mission?.tasks || [];
    const runningTask = tasks.find((t) => t.status === 'RUNNING');
    const runningAgent = runningTask?.agentId;

    if (!runningTask || runningAgent === 'orchestrator') {
      // Stage 1: Orchestrator is actively planning and dispatching initial directives
      active.add('orchToDesign');
      active.add('orchToCoder');
    } else if (runningAgent === 'design') {
      // Stage 2: Design is processing tokens and negotiating contract with Coder
      active.add('designToCoderLoop');
      active.add('coderToDesignLoop');
      active.add('designToResearch');
    } else if (runningAgent === 'coder') {
      // Stage 3: Coder is implementing features and sending to Tester
      active.add('coderToTester');
      active.add('coderToDesignLoop');
    } else if (runningAgent === 'tester') {
      // Stage 4: Tester is auditing and reporting results back to Orchestrator
      active.add('testerToOrch');
    } else if (runningAgent === 'research') {
      // Research findings flowing to Orchestrator
      active.add('researchToOrch');
    }

    return active;
  }, [isMissionRunning, mission?.tasks]);

  // Listen for real message/task events to trigger transient packets
  useEffect(() => {
    if (recentEvents.length === 0) return;
    const latest = recentEvents[recentEvents.length - 1];
    if (processedEventIds.current.has(latest.id)) return;
    processedEventIds.current.add(latest.id);

    if (latest.type === 'AGENT_MESSAGE') {
      const msg = latest.payload as AgentMessagePayload;
      if (msg.to !== 'broadcast' && NODE_HIERARCHY[msg.from] && NODE_HIERARCHY[msg.to]) {
        const pathKey = getPathBetweenAgents(msg.from, msg.to);
        if (pathKey && PIPELINE_PATHS[pathKey]) {
          addDynamicPacket(msg.from, msg.to, ROLE_COLORS[msg.from] || '#00f0ff', msg.subject, PIPELINE_PATHS[pathKey]);
        }
      }
    } else if (latest.type === 'TASK_CREATED') {
      const task = latest.payload as any;
      const tgt = task.agentId as AgentId;
      if (tgt && NODE_HIERARCHY[tgt]) {
        const pathKey = getPathBetweenAgents('orchestrator', tgt);
        if (pathKey && PIPELINE_PATHS[pathKey]) {
          addDynamicPacket('orchestrator', tgt, '#38bdf8', 'TASK', PIPELINE_PATHS[pathKey]);
        }
      }
    } else if (latest.type === 'TASK_COMPLETED') {
      const task = (latest.payload as any).task;
      const src = task?.agentId as AgentId;
      if (src && NODE_HIERARCHY[src]) {
        const pathKey = getPathBetweenAgents(src, 'orchestrator');
        if (pathKey && PIPELINE_PATHS[pathKey]) {
          addDynamicPacket(src, 'orchestrator', '#34d399', 'DONE', PIPELINE_PATHS[pathKey]);
        }
      }
    }
  }, [recentEvents]);

  const getPathBetweenAgents = (from: AgentId, to: AgentId): string | null => {
    if (from === 'orchestrator' && to === 'design') return 'orchToDesign';
    if (from === 'orchestrator' && to === 'coder') return 'orchToCoder';
    if (from === 'design' && to === 'coder') return 'designToCoderLoop';
    if (from === 'coder' && to === 'design') return 'coderToDesignLoop';
    if (from === 'design' && to === 'research') return 'designToResearch';
    if (from === 'coder' && to === 'tester') return 'coderToTester';
    if (from === 'research' && to === 'orchestrator') return 'researchToOrch';
    if (from === 'tester' && to === 'orchestrator') return 'testerToOrch';
    return null;
  };

  const addDynamicPacket = (from: AgentId, to: AgentId, color: string, label: string, pathD: string) => {
    const packetId = `pkt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setDynamicPackets((prev) => [...prev.slice(-6), { id: packetId, from, to, color, label, pathD }]);
    setTimeout(() => {
      setDynamicPackets((prev) => prev.filter((p) => p.id !== packetId));
    }, 1400);
  };

  const getModelForAgent = (agentId: AgentId): DetailedAIModel => {
    const assignedId = customAssignments[agentId] || TOPOLOGY_PRESETS[topologyMode]?.assignments[agentId];
    return ALL_SUPPORTED_MODELS.find((m) => m.id === assignedId) || ALL_SUPPORTED_MODELS[0];
  };

  const activeRationaleModel = activeRationaleAgentId ? getModelForAgent(activeRationaleAgentId) : null;

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

      {/* Swarm Pipeline Legend Bar */}
      <div className="graph-pipeline-legend">
        <div className="legend-group">
          <span className="legend-title">PIPELINE LEGEND:</span>
          <div className="legend-item" title="Orchestrator Role">
            <span className="legend-dot" style={{ background: ROLE_COLORS.orchestrator }}></span>
            <span>Orchestrator</span>
          </div>
          <div className="legend-item" title="Design & Frontend Role">
            <span className="legend-dot" style={{ background: ROLE_COLORS.design }}></span>
            <span>Design</span>
          </div>
          <div className="legend-item" title="Backend & Coding Role">
            <span className="legend-dot" style={{ background: ROLE_COLORS.coder }}></span>
            <span>Coder</span>
          </div>
          <div className="legend-item" title="Research & Benchmark Role">
            <span className="legend-dot" style={{ background: ROLE_COLORS.research }}></span>
            <span>Research</span>
          </div>
          <div className="legend-item" title="QA, Testing & Regressions Role">
            <span className="legend-dot" style={{ background: ROLE_COLORS.tester }}></span>
            <span>Tester</span>
          </div>
        </div>

        <div className="legend-group legend-telemetry-key">
          <div className="legend-item">
            <span className="legend-flow-icon">●</span>
            <span>{isMissionRunning ? 'Active Sequential Transfer' : 'Standby / Quiescent'}</span>
          </div>
          <div className="legend-divider">|</div>
          <div className="legend-item">
            <Repeat size={11} color="#c084fc" />
            <span style={{ color: '#c084fc' }}>⟲ Spec Negotiation Loop</span>
          </div>
        </div>
      </div>

      {/* Hero Graph Canvas with Generous Margin to Prevent Cutoff */}
      <div className="multi-agent-graph-canvas">
        <svg className="mag-svg" viewBox="0 0 1000 580" preserveAspectRatio="xMidYMid meet">
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

            {/* Directional Path Gradients: Inherit source to target role color */}
            <linearGradient id="gradOrchDesign" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="gradOrchCoder" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="gradDesignCoder" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.85" />
            </linearGradient>

            <linearGradient id="gradCoderDesign" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.85" />
            </linearGradient>

            <linearGradient id="gradDesignResearch" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fb923c" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="gradCoderTester" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="gradResearchOrch" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fb923c" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.75" />
            </linearGradient>

            <linearGradient id="gradTesterOrch" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.75" />
            </linearGradient>

            {/* Diagonal Hatch Pattern for Blocked / Waiting State */}
            <pattern id="blockedHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(245, 158, 11, 0.25)" strokeWidth="3" />
            </pattern>
          </defs>

          {/* 1. Curved Spline Channels: Dim when idle, vividly animated when channel is active */}
          <g className="channels-layer">
            <path
              id="pathOrchDesign"
              d={PIPELINE_PATHS.orchToDesign}
              stroke="url(#gradOrchDesign)"
              className={`spline-channel ${activeChannels.has('orchToDesign') ? 'sc-active-pulse' : 'sc-idle'}`}
            />
            <path
              id="pathOrchCoder"
              d={PIPELINE_PATHS.orchToCoder}
              stroke="url(#gradOrchCoder)"
              className={`spline-channel ${activeChannels.has('orchToCoder') ? 'sc-active-pulse' : 'sc-idle'}`}
            />
            
            {/* Bi-Directional Negotiation Loop between Design and Coder */}
            <path
              id="pathDesignCoderLoop"
              d={PIPELINE_PATHS.designToCoderLoop}
              stroke="url(#gradDesignCoder)"
              className={`spline-channel sc-loop-upper ${activeChannels.has('designToCoderLoop') ? 'sc-active-pulse' : 'sc-idle'}`}
            />
            <path
              id="pathCoderDesignLoop"
              d={PIPELINE_PATHS.coderToDesignLoop}
              stroke="url(#gradCoderDesign)"
              className={`spline-channel sc-loop-lower ${activeChannels.has('coderToDesignLoop') ? 'sc-active-pulse' : 'sc-idle'}`}
            />

            <path
              id="pathDesignResearch"
              d={PIPELINE_PATHS.designToResearch}
              stroke="url(#gradDesignResearch)"
              className={`spline-channel ${activeChannels.has('designToResearch') ? 'sc-active-pulse' : 'sc-idle'}`}
            />
            <path
              id="pathCoderTester"
              d={PIPELINE_PATHS.coderToTester}
              stroke="url(#gradCoderTester)"
              className={`spline-channel ${activeChannels.has('coderToTester') ? 'sc-active-pulse' : 'sc-idle'}`}
            />
            <path
              id="pathResearchOrch"
              d={PIPELINE_PATHS.researchToOrch}
              stroke="url(#gradResearchOrch)"
              className={`spline-channel ${activeChannels.has('researchToOrch') ? 'sc-active-pulse' : 'sc-idle'}`}
            />
            <path
              id="pathTesterOrch"
              d={PIPELINE_PATHS.testerToOrch}
              stroke="url(#gradTesterOrch)"
              className={`spline-channel ${activeChannels.has('testerToOrch') ? 'sc-active-pulse' : 'sc-idle'}`}
            />
          </g>

          {/* 2. Active Communication Particles: ONLY rendered when a task is actively running on that channel */}
          {isMissionRunning && (
            <g className="continuous-particles-layer">
              {/* Stage 1: Orch -> Coder Active Transfer (28 KB/s) */}
              {activeChannels.has('orchToCoder') && (
                <>
                  <circle r="4.2" fill="#34d399" filter="url(#packetGlow)">
                    <animateMotion dur="1.0s" repeatCount="indefinite" path={PIPELINE_PATHS.orchToCoder} begin="0s" />
                  </circle>
                  <circle r="3.8" fill="#34d399" filter="url(#packetGlow)">
                    <animateMotion dur="1.0s" repeatCount="indefinite" path={PIPELINE_PATHS.orchToCoder} begin="0.3s" />
                  </circle>
                  <circle r="4.2" fill="#34d399" filter="url(#packetGlow)">
                    <animateMotion dur="1.0s" repeatCount="indefinite" path={PIPELINE_PATHS.orchToCoder} begin="0.6s" />
                  </circle>
                </>
              )}

              {/* Stage 1: Orch -> Design Active Transfer (12 KB/s) */}
              {activeChannels.has('orchToDesign') && (
                <>
                  <circle r="3.8" fill="#38bdf8" filter="url(#packetGlow)">
                    <animateMotion dur="1.6s" repeatCount="indefinite" path={PIPELINE_PATHS.orchToDesign} begin="0s" />
                  </circle>
                  <circle r="3.6" fill="#38bdf8" filter="url(#packetGlow)">
                    <animateMotion dur="1.6s" repeatCount="indefinite" path={PIPELINE_PATHS.orchToDesign} begin="0.8s" />
                  </circle>
                </>
              )}

              {/* Stage 2: Design <-> Coder Spec Negotiation Loop */}
              {activeChannels.has('designToCoderLoop') && (
                <>
                  <circle r="3.8" fill="#c084fc" filter="url(#packetGlow)">
                    <animateMotion dur="1.4s" repeatCount="indefinite" path={PIPELINE_PATHS.designToCoderLoop} begin="0s" />
                  </circle>
                  <circle r="3.8" fill="#34d399" filter="url(#packetGlow)">
                    <animateMotion dur="1.4s" repeatCount="indefinite" path={PIPELINE_PATHS.coderToDesignLoop} begin="0s" />
                  </circle>
                </>
              )}

              {/* Stage 2: Design -> Research specs */}
              {activeChannels.has('designToResearch') && (
                <circle r="3.4" fill="#c084fc" filter="url(#packetGlow)">
                  <animateMotion dur="2.0s" repeatCount="indefinite" path={PIPELINE_PATHS.designToResearch} begin="0s" />
                </circle>
              )}

              {/* Stage 3: Coder -> Tester Implementation Transfer (14 KB/s) */}
              {activeChannels.has('coderToTester') && (
                <>
                  <circle r="4.0" fill="#f43f5e" filter="url(#packetGlow)">
                    <animateMotion dur="1.3s" repeatCount="indefinite" path={PIPELINE_PATHS.coderToTester} begin="0s" />
                  </circle>
                  <circle r="3.6" fill="#f43f5e" filter="url(#packetGlow)">
                    <animateMotion dur="1.3s" repeatCount="indefinite" path={PIPELINE_PATHS.coderToTester} begin="0.55s" />
                  </circle>
                </>
              )}

              {/* Stage 4: Tester -> Orch Verification Feedback */}
              {activeChannels.has('testerToOrch') && (
                <circle r="3.5" fill="#f43f5e" filter="url(#packetGlow)">
                  <animateMotion dur="2.4s" repeatCount="indefinite" path={PIPELINE_PATHS.testerToOrch} begin="0s" />
                </circle>
              )}

              {/* Research -> Orch Feedback */}
              {activeChannels.has('researchToOrch') && (
                <circle r="3.5" fill="#fb923c" filter="url(#packetGlow)">
                  <animateMotion dur="2.6s" repeatCount="indefinite" path={PIPELINE_PATHS.researchToOrch} begin="0s" />
                </circle>
              )}
            </g>
          )}

          {/* 3. Real Event Transient Packets (In-Flight Messages & Task Handoffs) */}
          <g className="transient-packets-layer">
            {dynamicPackets.map((pkt) => (
              <circle key={pkt.id} r="5" fill={pkt.color} filter="url(#packetGlow)">
                <animateMotion dur="1.3s" fill="freeze" path={pkt.pathD} />
              </circle>
            ))}
          </g>

          {/* 4. Central Bi-Directional Negotiation Loop Badge */}
          <g
            transform="translate(500, 265)"
            className={`negotiation-loop-badge-group ${activeChannels.has('designToCoderLoop') ? 'nlb-active' : 'nlb-idle'}`}
          >
            <rect x="-115" y="-12" width="230" height="24" rx="12" className="negotiation-badge-pill" />
            <text x="0" y="4" className="negotiation-badge-text">
              ⟲ Spec Negotiation • 3 Cycles
            </text>
          </g>

          {/* 5. Floating Data Transfer Volume Pills - Illuminated only when active */}
          <g className="data-badges-layer">
            {DATA_BADGES.map((b) => {
              const isActive = activeChannels.has(b.id);
              return (
                <g key={b.id} transform={`translate(${b.x}, ${b.y})`} className={`data-badge-group ${isActive ? 'badge-active' : 'badge-idle'}`}>
                  <rect x="-85" y="-11" width="170" height="22" rx="11" className="data-transfer-pill" />
                  <text x="0" y="4" className="data-transfer-text" style={{ fill: b.color }}>
                    {b.text}
                  </text>
                </g>
              );
            })}
          </g>

          {/* 6. Multi-Model Nodes with Tiered Hierarchy */}
          <g className="model-nodes-layer">
            {(Object.keys(NODE_HIERARCHY) as AgentId[]).map((agentId) => {
              const node = NODE_HIERARCHY[agentId];
              const roleColor = ROLE_COLORS[agentId];
              const roleGlow = ROLE_GLOWS[agentId];
              const status = statuses[agentId] || {
                state: 'IDLE',
                progress: 0,
              };
              const isSelected = selectedAgentId === agentId;
              const isHovered = hoveredAgentId === agentId;
              const model = getModelForAgent(agentId);

              const isBlocked = status.isBlocked || status.state === 'BLOCKED' || status.state === 'WAITING';
              const isFailed = status.state === 'FAILED';
              const isWorking = status.state === 'WORKING' || status.state === 'STARTING';
              const isApex = node.tier === 'apex';
              const hasRetries = (status.retryCount || 0) > 0;

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
                  } ${isFailed ? 'node-state-failed' : ''} ${isWorking ? 'node-actively-working' : ''}`}
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

                  {/* Retry & Cost Consequence Badge */}
                  {(isFailed || hasRetries) && (
                    <g transform={`translate(-80, ${-halfH - 12})`}>
                      <rect x="0" y="0" width="160" height="20" rx="6" className="failed-status-pill" />
                      <text x="80" y="14" className="failed-status-text">
                        {isFailed ? '⚠️ FAILED • RETRY #1' : `⚠️ RETRIED (${status.retryCount}x • +$0.004)`}
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

                  {/* Model Title & Routing Rationale Button */}
                  <text x={-halfW + (isApex ? 60 : 54)} y={-halfH + (isApex ? 26 : 22)} className="node-model-title">
                    {model.name}
                  </text>

                  {/* Model Routing Rationale Badge Button [?] */}
                  <g
                    transform={`translate(${halfW - 24}, ${-halfH + 12})`}
                    className="rationale-trigger-group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveRationaleAgentId(activeRationaleAgentId === agentId ? null : agentId);
                    }}
                  >
                    <title>{`View Routing Rationale for ${model.name}`}</title>
                    <circle cx="8" cy="8" r="8" className="rationale-trigger-circle" />
                    <text x="8" y="11" className="rationale-trigger-text">?</text>
                  </g>

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

                  {/* Mini Token/Burn Sparkline Bar */}
                  <g transform={`translate(${-halfW + 16}, ${halfH - 22})`}>
                    <g className="mini-node-sparkline">
                      {node.sparkline.map((val, sIdx) => {
                        const barH = Math.max(3, (val / 80) * 12);
                        const isSpike = val > 50;
                        return (
                          <rect
                            key={sIdx}
                            x={sIdx * 5}
                            y={12 - barH}
                            width="3"
                            height={barH}
                            rx="1"
                            fill={isSpike ? '#f59e0b' : roleColor}
                            opacity={0.75 + (sIdx / node.sparkline.length) * 0.25}
                          />
                        );
                      })}
                    </g>
                    <text x="46" y="10" className="node-resource-text">
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

        {/* Floating Model Routing Rationale Tooltip Modal / Popover */}
        {activeRationaleAgentId && activeRationaleModel && (
          <div
            className="model-rationale-popover"
            style={{
              left: `${NODE_HIERARCHY[activeRationaleAgentId].x > 500 ? NODE_HIERARCHY[activeRationaleAgentId].x - 260 : NODE_HIERARCHY[activeRationaleAgentId].x + 40}px`,
              top: `${NODE_HIERARCHY[activeRationaleAgentId].y - 20}px`,
            }}
          >
            <div className="mrp-header">
              <div className="mrp-title-group">
                <HelpCircle size={13} color={ROLE_COLORS[activeRationaleAgentId]} />
                <span className="mrp-title">ROUTING RATIONALE</span>
              </div>
              <button
                className="mrp-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveRationaleAgentId(null);
                }}
              >
                ✕
              </button>
            </div>

            <div className="mrp-body">
              <div className="mrp-model-line">
                <span className="mrp-model-name" style={{ color: ROLE_COLORS[activeRationaleAgentId] }}>
                  {activeRationaleModel.name}
                </span>
                <span className="mrp-provider-chip">{activeRationaleModel.providerLabel}</span>
              </div>

              <div className="mrp-reason-box">
                <span className="mrp-reason-label">WHY THIS MODEL FOR THIS ROLE:</span>
                <p className="mrp-reason-text">{activeRationaleModel.routingRationale}</p>
              </div>

              <div className="mrp-stats-grid">
                <div className="mrp-stat-item">
                  <span className="mrp-stat-label">Architecture</span>
                  <span className="mrp-stat-val">{activeRationaleModel.architecture || 'Frontier Transformer'}</span>
                </div>
                <div className="mrp-stat-item">
                  <span className="mrp-stat-label">Latency</span>
                  <span className="mrp-stat-val">{activeRationaleModel.latency || '~400ms'}</span>
                </div>
                <div className="mrp-stat-item">
                  <span className="mrp-stat-label">Context Window</span>
                  <span className="mrp-stat-val">{activeRationaleModel.contextWindow || '128k tokens'}</span>
                </div>
                <div className="mrp-stat-item">
                  <span className="mrp-stat-label">Pricing / Token Rate</span>
                  <span className="mrp-stat-val" style={{ color: '#f59e0b' }}>
                    {MODEL_PRICING[activeRationaleModel.id]?.promptPer1M === 0
                      ? 'Antigravity Native ($0.00)'
                      : `$${MODEL_PRICING[activeRationaleModel.id]?.promptPer1M || 1}/1M Prompt`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
