import React from 'react';
import {
  Users,
  Play,
  Pause,
  Square,
  Sparkles,
  Layers,
  Cpu,
} from 'lucide-react';
import { AgentId, AgentStatus, AgentEvent, Mission } from '../../types';
import { AgentCard } from '../AgentCard/AgentCard';
import { ALL_SUPPORTED_MODELS, ModelTopologyMode } from '../../config/models';
import './AgentsView.css';

interface AgentsViewProps {
  statuses: Record<AgentId, AgentStatus>;
  events: AgentEvent[];
  selectedAgentId?: AgentId;
  onSelectAgent: (id: AgentId) => void;
  onPauseAgent: (id: AgentId) => void;
  onResumeAgent: (id: AgentId) => void;
  onRetryAgent: (id: AgentId) => void;
  onPauseAll: () => void;
  onResumeAll: () => void;
  onStopAll: () => void;
  topologyMode: ModelTopologyMode;
  customAssignments?: Partial<Record<AgentId, string>>;
}

const AGENT_ORDER: AgentId[] = ['orchestrator', 'design', 'coder', 'research', 'tester'];

export const AgentsView: React.FC<AgentsViewProps> = ({
  statuses,
  events,
  selectedAgentId,
  onSelectAgent,
  onPauseAgent,
  onResumeAgent,
  onRetryAgent,
  onPauseAll,
  onResumeAll,
  onStopAll,
  topologyMode,
  customAssignments = {},
}) => {
  return (
    <div className="agents-view-container">
      {/* Header */}
      <div className="agents-view-header">
        <div className="avh-title-group">
          <Users size={18} className="avh-icon" />
          <div>
            <h2 className="avh-title">ACTIVE AGENT SWARM ROSTER (5 SPECIALIZED UNITS)</h2>
            <span className="avh-subtitle">
              Orchestrator coordination, design synthesis, AST coding, research validation, and QA regression review
            </span>
          </div>
        </div>

        <div className="avh-actions">
          <button className="avh-btn btn-cyan" onClick={onResumeAll}>
            <Play size={12} />
            <span>Resume Swarm</span>
          </button>
          <button className="avh-btn btn-amber" onClick={onPauseAll}>
            <Pause size={12} />
            <span>Pause Swarm</span>
          </button>
          <button className="avh-btn btn-rose" onClick={onStopAll}>
            <Square size={12} />
            <span>Stop Swarm</span>
          </button>
        </div>
      </div>

      {/* 5-Agent Operational Grid */}
      <div className="agents-view-cards-grid">
        {AGENT_ORDER.map((agentId) => {
          const status = statuses[agentId] || {
            agentId,
            role:
              agentId === 'orchestrator'
                ? 'Orchestrator Agent'
                : agentId === 'design'
                ? 'Design Agent'
                : agentId === 'coder'
                ? 'Coder Agent'
                : agentId === 'research'
                ? 'Research Agent'
                : 'Test / Review Agent',
            state: 'IDLE',
            progress: 0,
            filesTouchedCount: 0,
            messagesCount: 0,
            executionDurationMs: 0,
          };

          return (
            <AgentCard
              key={agentId}
              status={status}
              recentLogs={events.filter((e) => e.agentId === agentId)}
              isSelected={selectedAgentId === agentId}
              onSelect={(id) => onSelectAgent(id)}
              onPause={onPauseAgent}
              onResume={onResumeAgent}
              onRetry={onRetryAgent}
            />
          );
        })}
      </div>
    </div>
  );
};
