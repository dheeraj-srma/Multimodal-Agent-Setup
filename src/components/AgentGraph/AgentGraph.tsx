import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
  Move,
  Grid,
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
import { AgentInspector } from '../AgentInspector/AgentInspector';
import './AgentGraph.css';

interface AgentGraphProps {
  statuses: Record<AgentId, AgentStatus>;
  selectedAgentId?: AgentId;
  onSelectAgent: (agentId: AgentId | undefined) => void;
  recentEvents: AgentEvent[];
  topologyMode: ModelTopologyMode;
  customAssignments?: Partial<Record<AgentId, string>>;
  onSelectTopologyMode: (mode: ModelTopologyMode) => void;
  onOpenModelConfig: () => void;
  onModelChange?: (agentId: AgentId, modelId: string) => void;
  onTogglePauseAgent?: (agentId: AgentId) => void;
  onRetryAgent?: (agentId: AgentId) => void;
  onStopAgent?: (agentId: AgentId) => void;
  onSendMessage?: (to: AgentId, message: string) => void;
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

// Default layout coordinates (NASA Mission Control hierarchy)
export const DEFAULT_NODE_POSITIONS: Record<AgentId, { x: number; y: number }> = {
  orchestrator: { x: 500, y: 88 },
  design: { x: 225, y: 265 },
  coder: { x: 775, y: 265 },
  research: { x: 350, y: 462 },
  tester: { x: 650, y: 462 },
};

// Hierarchical tiered node geometry specs
const NODE_METADATA: Record<
  AgentId,
  {
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
  onStopAgent,
  onSendMessage,
  mission,
}) => {
  // Node positions in state for smooth drag-and-drop & auto-arrange
  const [nodePositions, setNodePositions] = useState<Record<AgentId, { x: number; y: number }>>(() => ({
    ...DEFAULT_NODE_POSITIONS,
  }));

  // Dragging state
  const [draggingAgentId, setDraggingAgentId] = useState<AgentId | null>(null);
  const [isAutoArranging, setIsAutoArranging] = useState(false);
  const dragStartRef = useRef<{
    agentId: AgentId;
    svgStartX: number;
    svgStartY: number;
    nodeStartX: number;
    nodeStartY: number;
    hasMoved: boolean;
  } | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dynamicPackets, setDynamicPackets] = useState<DynamicPacket[]>([]);
  const [hoveredAgentId, setHoveredAgentId] = useState<AgentId | null>(null);
  const [activeRationaleAgentId, setActiveRationaleAgentId] = useState<AgentId | null>(null);
  const processedEventIds = useRef<Set<string>>(new Set());

  // Check if mission is actively running
  const isMissionRunning = mission?.status === 'RUNNING';

  // Check if layout has been custom readjusted
  const isLayoutModified = useMemo(() => {
    return (Object.keys(DEFAULT_NODE_POSITIONS) as AgentId[]).some(
      (k) =>
        nodePositions[k].x !== DEFAULT_NODE_POSITIONS[k].x ||
        nodePositions[k].y !== DEFAULT_NODE_POSITIONS[k].y
    );
  }, [nodePositions]);

  // Auto Arrange Button Handler: Resets node positions to default arrangement
  const handleAutoArrange = () => {
    setIsAutoArranging(true);
    setNodePositions({ ...DEFAULT_NODE_POSITIONS });
    setTimeout(() => setIsAutoArranging(false), 450);
  };

  // Convert client mouse coordinates to pixel-perfect SVG viewBox coordinates
  const getSVGCoords = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 500, y: 250 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 500, y: 250 };
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: Math.round(transformed.x), y: Math.round(transformed.y) };
  }, []);

  // Node Drag Handlers
  const handleNodeMouseDown = (e: React.MouseEvent, agentId: AgentId) => {
    // Only drag on primary left click
    if (e.button !== 0) return;
    e.stopPropagation();

    const svgCoord = getSVGCoords(e.clientX, e.clientY);
    const nodePos = nodePositions[agentId];

    dragStartRef.current = {
      agentId,
      svgStartX: svgCoord.x,
      svgStartY: svgCoord.y,
      nodeStartX: nodePos.x,
      nodeStartY: nodePos.y,
      hasMoved: false,
    };
    setDraggingAgentId(agentId);
  };

  const handleSVGMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragStartRef.current) return;
    const { agentId, svgStartX, svgStartY, nodeStartX, nodeStartY } = dragStartRef.current;
    const currentCoord = getSVGCoords(e.clientX, e.clientY);

    const dx = currentCoord.x - svgStartX;
    const dy = currentCoord.y - svgStartY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragStartRef.current.hasMoved = true;
    }

    // Clamp coordinates within visible SVG canvas area (with margin for card dimensions)
    const clampedX = Math.max(125, Math.min(875, nodeStartX + dx));
    const clampedY = Math.max(60, Math.min(520, nodeStartY + dy));

    setNodePositions((prev) => ({
      ...prev,
      [agentId]: { x: clampedX, y: clampedY },
    }));
  };

  const handleSVGMouseUp = () => {
    if (dragStartRef.current) {
      // If it wasn't a significant drag, treat as a selection click
      if (!dragStartRef.current.hasMoved) {
        const clickedId = dragStartRef.current.agentId;
        onSelectAgent(clickedId === selectedAgentId ? undefined : clickedId);
      }
    } else {
      // Clicked on empty SVG canvas background - deselect agent to dismiss floating menu
      onSelectAgent(undefined);
    }
    dragStartRef.current = null;
    setDraggingAgentId(null);
  };

  // Canvas background click handler for dismissing pop-ups
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).classList.contains('multi-agent-graph-canvas')) {
      onSelectAgent(undefined);
      setActiveRationaleAgentId(null);
    }
  };

  // Compute pixel-precise position of an agent node in the canvas container
  const getNodeContainerPixelPos = useCallback(
    (agentId: AgentId) => {
      const pos = nodePositions[agentId] || DEFAULT_NODE_POSITIONS[agentId];
      const svg = svgRef.current;
      const container = canvasContainerRef.current;
      const meta = NODE_METADATA[agentId];
      const halfW = meta ? meta.w / 2 : 100;

      let cardCenterX = 500;
      let cardCenterY = 250;
      let containerWidth = 1000;
      let containerHeight = 515;

      if (container) {
        const cRect = container.getBoundingClientRect();
        if (cRect.width > 0) containerWidth = cRect.width;
        if (cRect.height > 0) containerHeight = cRect.height;
      }

      if (svg && container) {
        try {
          const pt = svg.createSVGPoint();
          pt.x = pos.x;
          pt.y = pos.y;
          const ctm = svg.getScreenCTM();
          if (ctm) {
            const screenPt = pt.matrixTransform(ctm);
            const cRect = container.getBoundingClientRect();
            cardCenterX = screenPt.x - cRect.left;
            cardCenterY = screenPt.y - cRect.top;
          } else {
            cardCenterX = (pos.x / 1000) * containerWidth;
            cardCenterY = (pos.y / 580) * containerHeight;
          }
        } catch {
          cardCenterX = (pos.x / 1000) * containerWidth;
          cardCenterY = (pos.y / 580) * containerHeight;
        }
      } else {
        cardCenterX = (pos.x / 1000) * containerWidth;
        cardCenterY = (pos.y / 580) * containerHeight;
      }

      const scaleX = containerWidth / 1000;
      const cardHalfW_px = halfW * scaleX;

      const popupWidth = 365;
      const popupHeight = 480;
      const gap = 16;

      let placement: 'left' | 'right' = pos.x > 500 ? 'left' : 'right';
      let left = 0;

      if (placement === 'left') {
        left = cardCenterX - cardHalfW_px - popupWidth - gap;
        if (left < 10) {
          if (cardCenterX + cardHalfW_px + popupWidth + gap <= containerWidth - 10) {
            placement = 'right';
            left = cardCenterX + cardHalfW_px + gap;
          } else {
            left = Math.max(10, left);
          }
        }
      } else {
        left = cardCenterX + cardHalfW_px + gap;
        if (left + popupWidth > containerWidth - 10) {
          if (cardCenterX - cardHalfW_px - popupWidth - gap >= 10) {
            placement = 'left';
            left = cardCenterX - cardHalfW_px - popupWidth - gap;
          } else {
            left = Math.min(containerWidth - popupWidth - 10, left);
          }
        }
      }

      let top = cardCenterY - 45;
      top = Math.max(10, Math.min(containerHeight - popupHeight - 10, top));

      return {
        left: Math.round(left),
        top: Math.round(top),
        placement,
      };
    },
    [nodePositions]
  );

  // Dynamically compute continuous connection spline paths based on current nodePositions
  const pipelinePaths = useMemo(() => {
    const orch = nodePositions.orchestrator;
    const design = nodePositions.design;
    const coder = nodePositions.coder;
    const research = nodePositions.research;
    const tester = nodePositions.tester;

    const orchToDesign = `M ${orch.x - 15},${orch.y + 52} C ${(orch.x + design.x) / 2},${orch.y + 70} ${design.x + 20},${design.y - 60} ${design.x},${design.y - 44}`;
    const orchToCoder = `M ${orch.x + 15},${orch.y + 52} C ${(orch.x + coder.x) / 2},${orch.y + 70} ${coder.x - 20},${coder.y - 60} ${coder.x},${coder.y - 44}`;

    // Negotiation loops between Design and Coder
    const midX = (design.x + coder.x) / 2;
    const midYUpper = Math.min(design.y, coder.y) - 60;
    const designToCoderLoop = `M ${design.x + 102},${design.y - 16} C ${design.x + (midX - design.x) * 0.7},${midYUpper} ${coder.x - (coder.x - midX) * 0.7},${midYUpper} ${coder.x - 102},${coder.y - 16}`;

    const midYLower = Math.max(design.y, coder.y) + 60;
    const coderToDesignLoop = `M ${coder.x - 102},${coder.y + 16} C ${coder.x - (coder.x - midX) * 0.7},${midYLower} ${design.x + (midX - design.x) * 0.7},${midYLower} ${design.x + 102},${design.y + 16}`;

    const designToResearch = `M ${design.x},${design.y + 44} C ${design.x},${(design.y + research.y) / 2} ${(design.x + research.x) / 2},${research.y - 60} ${research.x},${research.y - 41}`;
    const coderToTester = `M ${coder.x},${coder.y + 44} C ${coder.x},${(coder.y + tester.y) / 2} ${(coder.x + tester.x) / 2},${tester.y - 60} ${tester.x},${tester.y - 41}`;
    const researchToOrch = `M ${research.x},${research.y - 41} C ${research.x + 50},${(research.y + orch.y) / 2} ${orch.x - 50},${orch.y + 110} ${orch.x - 25},${orch.y + 52}`;
    const testerToOrch = `M ${tester.x},${tester.y - 41} C ${tester.x - 50},${(tester.y + orch.y) / 2} ${orch.x + 50},${orch.y + 110} ${orch.x + 25},${orch.y + 52}`;

    return {
      orchToDesign,
      orchToCoder,
      designToCoderLoop,
      coderToDesignLoop,
      designToResearch,
      coderToTester,
      researchToOrch,
      testerToOrch,
    };
  }, [nodePositions]);

  // Dynamically compute non-overlapping data transfer badge coordinates
  const dataBadges = useMemo(() => {
    const orch = nodePositions.orchestrator;
    const design = nodePositions.design;
    const coder = nodePositions.coder;
    const research = nodePositions.research;
    const tester = nodePositions.tester;

    return [
      {
        id: 'orchToDesign',
        text: 'Directive Dispatch • 12 KB/s',
        x: Math.round((orch.x + design.x) / 2 - 12),
        y: Math.round((orch.y + design.y) / 2 + 8),
        color: '#38bdf8',
      },
      {
        id: 'orchToCoder',
        text: 'Feature Implementation • 28 KB/s',
        x: Math.round((orch.x + coder.x) / 2 + 12),
        y: Math.round((orch.y + coder.y) / 2 + 8),
        color: '#34d399',
      },
      {
        id: 'designToResearch',
        text: 'Design Specs • 8 KB/s',
        x: Math.round((design.x + research.x) / 2 - 32),
        y: Math.round((design.y + research.y) / 2 + 15),
        color: '#c084fc',
      },
      {
        id: 'coderToTester',
        text: 'Verification Suite • 14 KB/s',
        x: Math.round((coder.x + tester.x) / 2 + 32),
        y: Math.round((coder.y + tester.y) / 2 + 15),
        color: '#f43f5e',
      },
    ];
  }, [nodePositions]);

  // Midpoint position for the bi-directional negotiation badge
  const negotiationBadgePos = useMemo(() => {
    return {
      x: Math.round((nodePositions.design.x + nodePositions.coder.x) / 2),
      y: Math.round((nodePositions.design.y + nodePositions.coder.y) / 2),
    };
  }, [nodePositions.design, nodePositions.coder]);

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
      if (msg.to !== 'broadcast' && nodePositions[msg.from] && nodePositions[msg.to]) {
        const pathD = getDynamicPath(msg.from, msg.to);
        if (pathD) {
          addDynamicPacket(msg.from, msg.to, ROLE_COLORS[msg.from] || '#00f0ff', msg.subject, pathD);
        }
      }
    } else if (latest.type === 'TASK_CREATED') {
      const task = latest.payload as any;
      const tgt = task.agentId as AgentId;
      if (tgt && nodePositions[tgt]) {
        const pathD = getDynamicPath('orchestrator', tgt);
        if (pathD) {
          addDynamicPacket('orchestrator', tgt, '#38bdf8', 'TASK', pathD);
        }
      }
    } else if (latest.type === 'TASK_COMPLETED') {
      const task = (latest.payload as any).task;
      const src = task?.agentId as AgentId;
      if (src && nodePositions[src]) {
        const pathD = getDynamicPath(src, 'orchestrator');
        if (pathD) {
          addDynamicPacket(src, 'orchestrator', '#34d399', 'DONE', pathD);
        }
      }
    }
  }, [recentEvents, nodePositions]);

  const getDynamicPath = (from: AgentId, to: AgentId): string | null => {
    if (from === 'orchestrator' && to === 'design') return pipelinePaths.orchToDesign;
    if (from === 'orchestrator' && to === 'coder') return pipelinePaths.orchToCoder;
    if (from === 'design' && to === 'coder') return pipelinePaths.designToCoderLoop;
    if (from === 'coder' && to === 'design') return pipelinePaths.coderToDesignLoop;
    if (from === 'design' && to === 'research') return pipelinePaths.designToResearch;
    if (from === 'coder' && to === 'tester') return pipelinePaths.coderToTester;
    if (from === 'research' && to === 'orchestrator') return pipelinePaths.researchToOrch;
    if (from === 'tester' && to === 'orchestrator') return pipelinePaths.testerToOrch;
    return `M ${nodePositions[from].x},${nodePositions[from].y} L ${nodePositions[to].x},${nodePositions[to].y}`;
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
          {/* Auto Arrange Button: Resets node positions to default layout */}
          <button
            className={`gtb-auto-arrange-btn ${isLayoutModified ? 'btn-layout-modified' : ''}`}
            onClick={handleAutoArrange}
            title="Reset agent nodes to original layout"
          >
            <RotateCcw size={12} className={isAutoArranging ? 'spin-icon' : ''} />
            <span>{isLayoutModified ? 'Auto Arrange (Reset)' : 'Auto Arrange'}</span>
          </button>

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
            <Move size={11} color="#38bdf8" />
            <span style={{ color: '#38bdf8' }}>Drag Nodes to Re-arrange</span>
          </div>
          <div className="legend-divider">|</div>
          <div className="legend-item">
            <Repeat size={11} color="#c084fc" />
            <span style={{ color: '#c084fc' }}>⟲ Spec Negotiation Loop</span>
          </div>
        </div>
      </div>

      {/* Hero Graph Canvas with Full Drag & Drop Support */}
      <div className="multi-agent-graph-canvas" ref={canvasContainerRef} onClick={handleCanvasClick}>
        <svg
          ref={svgRef}
          className={`mag-svg ${draggingAgentId ? 'is-dragging-active' : ''}`}
          viewBox="0 0 1000 580"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleSVGMouseMove}
          onMouseUp={handleSVGMouseUp}
          onMouseLeave={handleSVGMouseUp}
        >
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

          {/* 1. Curved Spline Channels: Dynamically recalculated to follow dragged nodes */}
          <g className="channels-layer">
            <path
              id="pathOrchDesign"
              d={pipelinePaths.orchToDesign}
              stroke="url(#gradOrchDesign)"
              className={`spline-channel ${activeChannels.has('orchToDesign') ? 'sc-active-pulse' : 'sc-idle'}`}
            />
            <path
              id="pathOrchCoder"
              d={pipelinePaths.orchToCoder}
              stroke="url(#gradOrchCoder)"
              className={`spline-channel ${activeChannels.has('orchToCoder') ? 'sc-active-pulse' : 'sc-idle'}`}
            />
            
            {/* Bi-Directional Negotiation Loop between Design and Coder */}
            <path
              id="pathDesignCoderLoop"
              d={pipelinePaths.designToCoderLoop}
              stroke="url(#gradDesignCoder)"
              className={`spline-channel sc-loop-upper ${activeChannels.has('designToCoderLoop') ? 'sc-active-pulse' : 'sc-idle'}`}
            />
            <path
              id="pathCoderDesignLoop"
              d={pipelinePaths.coderToDesignLoop}
              stroke="url(#gradCoderDesign)"
              className={`spline-channel sc-loop-lower ${activeChannels.has('coderToDesignLoop') ? 'sc-active-pulse' : 'sc-idle'}`}
            />

            <path
              id="pathDesignResearch"
              d={pipelinePaths.designToResearch}
              stroke="url(#gradDesignResearch)"
              className={`spline-channel ${activeChannels.has('designToResearch') ? 'sc-active-pulse' : 'sc-idle'}`}
            />
            <path
              id="pathCoderTester"
              d={pipelinePaths.coderToTester}
              stroke="url(#gradCoderTester)"
              className={`spline-channel ${activeChannels.has('coderToTester') ? 'sc-active-pulse' : 'sc-idle'}`}
            />
            <path
              id="pathResearchOrch"
              d={pipelinePaths.researchToOrch}
              stroke="url(#gradResearchOrch)"
              className={`spline-channel ${activeChannels.has('researchToOrch') ? 'sc-active-pulse' : 'sc-idle'}`}
            />
            <path
              id="pathTesterOrch"
              d={pipelinePaths.testerToOrch}
              stroke="url(#gradTesterOrch)"
              className={`spline-channel ${activeChannels.has('testerToOrch') ? 'sc-active-pulse' : 'sc-idle'}`}
            />
          </g>

          {/* 2. Active Communication Particles: Follow dynamic paths during task execution */}
          {isMissionRunning && (
            <g className="continuous-particles-layer">
              {/* Stage 1: Orch -> Coder Active Transfer */}
              {activeChannels.has('orchToCoder') && (
                <>
                  <circle r="4.2" fill="#34d399" filter="url(#packetGlow)">
                    <animateMotion dur="1.0s" repeatCount="indefinite" path={pipelinePaths.orchToCoder} begin="0s" />
                  </circle>
                  <circle r="3.8" fill="#34d399" filter="url(#packetGlow)">
                    <animateMotion dur="1.0s" repeatCount="indefinite" path={pipelinePaths.orchToCoder} begin="0.3s" />
                  </circle>
                  <circle r="4.2" fill="#34d399" filter="url(#packetGlow)">
                    <animateMotion dur="1.0s" repeatCount="indefinite" path={pipelinePaths.orchToCoder} begin="0.6s" />
                  </circle>
                </>
              )}

              {/* Stage 1: Orch -> Design Active Transfer */}
              {activeChannels.has('orchToDesign') && (
                <>
                  <circle r="3.8" fill="#38bdf8" filter="url(#packetGlow)">
                    <animateMotion dur="1.6s" repeatCount="indefinite" path={pipelinePaths.orchToDesign} begin="0s" />
                  </circle>
                  <circle r="3.6" fill="#38bdf8" filter="url(#packetGlow)">
                    <animateMotion dur="1.6s" repeatCount="indefinite" path={pipelinePaths.orchToDesign} begin="0.8s" />
                  </circle>
                </>
              )}

              {/* Stage 2: Design <-> Coder Spec Negotiation Loop */}
              {activeChannels.has('designToCoderLoop') && (
                <>
                  <circle r="3.8" fill="#c084fc" filter="url(#packetGlow)">
                    <animateMotion dur="1.4s" repeatCount="indefinite" path={pipelinePaths.designToCoderLoop} begin="0s" />
                  </circle>
                  <circle r="3.8" fill="#34d399" filter="url(#packetGlow)">
                    <animateMotion dur="1.4s" repeatCount="indefinite" path={pipelinePaths.coderToDesignLoop} begin="0s" />
                  </circle>
                </>
              )}

              {/* Stage 2: Design -> Research specs */}
              {activeChannels.has('designToResearch') && (
                <circle r="3.4" fill="#c084fc" filter="url(#packetGlow)">
                  <animateMotion dur="2.0s" repeatCount="indefinite" path={pipelinePaths.designToResearch} begin="0s" />
                </circle>
              )}

              {/* Stage 3: Coder -> Tester Implementation Transfer */}
              {activeChannels.has('coderToTester') && (
                <>
                  <circle r="4.0" fill="#f43f5e" filter="url(#packetGlow)">
                    <animateMotion dur="1.3s" repeatCount="indefinite" path={pipelinePaths.coderToTester} begin="0s" />
                  </circle>
                  <circle r="3.6" fill="#f43f5e" filter="url(#packetGlow)">
                    <animateMotion dur="1.3s" repeatCount="indefinite" path={pipelinePaths.coderToTester} begin="0.55s" />
                  </circle>
                </>
              )}

              {/* Stage 4: Tester -> Orch Verification Feedback */}
              {activeChannels.has('testerToOrch') && (
                <circle r="3.5" fill="#f43f5e" filter="url(#packetGlow)">
                  <animateMotion dur="2.4s" repeatCount="indefinite" path={pipelinePaths.testerToOrch} begin="0s" />
                </circle>
              )}

              {/* Research -> Orch Feedback */}
              {activeChannels.has('researchToOrch') && (
                <circle r="3.5" fill="#fb923c" filter="url(#packetGlow)">
                  <animateMotion dur="2.6s" repeatCount="indefinite" path={pipelinePaths.researchToOrch} begin="0s" />
                </circle>
              )}
            </g>
          )}

          {/* 3. Real Event Transient Packets */}
          <g className="transient-packets-layer">
            {dynamicPackets.map((pkt) => (
              <circle key={pkt.id} r="5" fill={pkt.color} filter="url(#packetGlow)">
                <animateMotion dur="1.3s" fill="freeze" path={pkt.pathD} />
              </circle>
            ))}
          </g>

          {/* 4. Central Bi-Directional Negotiation Loop Badge */}
          <g
            transform={`translate(${negotiationBadgePos.x}, ${negotiationBadgePos.y})`}
            className={`negotiation-loop-badge-group ${activeChannels.has('designToCoderLoop') ? 'nlb-active' : 'nlb-idle'}`}
          >
            <rect x="-115" y="-12" width="230" height="24" rx="12" className="negotiation-badge-pill" />
            <text x="0" y="4" className="negotiation-badge-text">
              ⟲ Spec Negotiation • 3 Cycles
            </text>
          </g>

          {/* 5. Floating Data Transfer Volume Pills - Dynamically Track Nodes */}
          <g className="data-badges-layer">
            {dataBadges.map((b) => {
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

          {/* 6. Multi-Model Nodes with Smooth Drag & Drop and Tiered Hierarchy */}
          <g className="model-nodes-layer">
            {(Object.keys(nodePositions) as AgentId[]).map((agentId) => {
              const pos = nodePositions[agentId];
              const meta = NODE_METADATA[agentId];
              const roleColor = ROLE_COLORS[agentId];
              const roleGlow = ROLE_GLOWS[agentId];
              const status = statuses[agentId] || {
                state: 'IDLE',
                progress: 0,
              };
              const isSelected = selectedAgentId === agentId;
              const isHovered = hoveredAgentId === agentId;
              const isDraggingThis = draggingAgentId === agentId;
              const model = getModelForAgent(agentId);

              const isBlocked = status.isBlocked || status.state === 'BLOCKED' || status.state === 'WAITING';
              const isFailed = status.state === 'FAILED';
              const isWorking = status.state === 'WORKING' || status.state === 'STARTING';
              const isApex = meta.tier === 'apex';
              const hasRetries = (status.retryCount || 0) > 0;

              const renderIcon = () => {
                if (model.provider === 'google') return <Sparkles size={isApex ? 19 : 16} color={roleColor} />;
                if (model.provider === 'anthropic') return <Sun size={isApex ? 19 : 16} color={roleColor} />;
                if (model.provider === 'openai') return <Cpu size={isApex ? 19 : 16} color={roleColor} />;
                if (model.provider === 'meta') return <InfinityIcon size={isApex ? 19 : 16} color={roleColor} />;
                if (model.provider === 'perplexity') return <Search size={isApex ? 19 : 16} color={roleColor} />;
                return <Radio size={isApex ? 19 : 16} color={roleColor} />;
              };

              const halfW = meta.w / 2;
              const halfH = meta.h / 2;

              return (
                <g
                  key={agentId}
                  className={`swarm-node-group node-tier-${meta.tier} ${isSelected ? 'node-active-selected' : ''} ${
                    isBlocked ? 'node-state-blocked' : ''
                  } ${isFailed ? 'node-state-failed' : ''} ${isWorking ? 'node-actively-working' : ''} ${
                    isDraggingThis ? 'is-node-dragging' : ''
                  }`}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onMouseDown={(e) => handleNodeMouseDown(e, agentId)}
                  onMouseEnter={() => setHoveredAgentId(agentId)}
                  onMouseLeave={() => setHoveredAgentId(null)}
                >
                  {/* Outer Apex Aura for Orchestrator */}
                  {isApex && (
                    <rect
                      x={-halfW - 8}
                      y={-halfH - 8}
                      width={meta.w + 16}
                      height={meta.h + 16}
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
                    width={meta.w}
                    height={meta.h}
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
                      width={meta.w}
                      height={meta.h}
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

                  {/* Model Title */}
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
                    {meta.roleKey}
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
                      {meta.sparkline.map((val, sIdx) => {
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
                            opacity={0.75 + (sIdx / meta.sparkline.length) * 0.25}
                          />
                        );
                      })}
                    </g>
                    <text x="46" y="10" className="node-resource-text">
                      CPU {status.cpuPercent || meta.defaultCpu}% • {status.promptTokens ? `${Math.round((status.promptTokens + (status.completionTokens || 0)) / 1000)}k` : meta.defaultTokens} tok
                    </text>
                  </g>

                  {/* Node Bottom Context Pill Badge */}
                  {!isApex && meta.badges && (
                    <g transform={`translate(${-halfW + 14}, ${halfH + 8})`}>
                      <rect x="0" y="0" width={meta.w - 28} height="18" rx="5" className="worker-badge-pill" />
                      <text x={(meta.w - 28) / 2} y="12" className="worker-badge-text">
                        {meta.badges[0]}
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
              left: `${nodePositions[activeRationaleAgentId].x > 500 ? nodePositions[activeRationaleAgentId].x - 260 : nodePositions[activeRationaleAgentId].x + 40}px`,
              top: `${nodePositions[activeRationaleAgentId].y - 20}px`,
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
        {/* Floating Agent Inspector Pop-up Side-by-Side with Selected Agent Card */}
        {selectedAgentId && (
          <AgentInspector
            agentId={selectedAgentId}
            status={
              statuses[selectedAgentId] || {
                agentId: selectedAgentId,
                role: NODE_METADATA[selectedAgentId]?.roleKey || 'Agent',
                state: 'IDLE',
                progress: 0,
                filesTouchedCount: 0,
                messagesCount: 0,
                executionDurationMs: 0,
              }
            }
            events={recentEvents}
            assignedModelId={getModelForAgent(selectedAgentId).id}
            onClose={() => onSelectAgent(undefined)}
            onPause={(aid) => onTogglePauseAgent?.(aid)}
            onResume={(aid) => onTogglePauseAgent?.(aid)}
            onStop={(aid) => onStopAgent?.(aid)}
            onRetry={(aid) => onRetryAgent?.(aid)}
            onModelChange={(aid, mid) => onModelChange?.(aid, mid)}
            onSendMessage={(to, msg) => onSendMessage?.(to, msg)}
            floatingPosition={getNodeContainerPixelPos(selectedAgentId)}
          />
        )}
      </div>
    </div>
  );
};
