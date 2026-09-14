import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Sun,
  Cpu,
  Infinity as InfinityIcon,
  Search,
  Radio,
  Layers,
  ShieldCheck,
  Zap,
  Info,
  ChevronDown,
} from 'lucide-react';
import { AgentId } from '../../types';
import {
  ALL_SUPPORTED_MODELS,
  DetailedAIModel,
  ModelTopologyMode,
  TOPOLOGY_PRESETS,
} from '../../config/models';
import './ModelConfigModal.css';

interface ModelConfigModalProps {
  currentTopology: ModelTopologyMode;
  customAssignments?: Partial<Record<AgentId, string>>;
  onApplyTopology: (mode: ModelTopologyMode, assignments?: Partial<Record<AgentId, string>>) => void;
  onClose: () => void;
}

const AGENT_ROLE_LABELS: Record<AgentId, { title: string; subtitle: string }> = {
  orchestrator: { title: 'Orchestrator', subtitle: 'Global Planning & DAG Execution' },
  design: { title: 'Design & UX Agent', subtitle: 'Visual Architecture & Interface Specs' },
  coder: { title: 'Backend & Code Agent', subtitle: 'AST Modifications & Safe Diffs' },
  research: { title: 'Research Agent', subtitle: 'Web Citations, Docs & Benchmark Extraction' },
  tester: { title: 'Testing & Review Agent', subtitle: 'WCAG, Unit Tests & Regression Guard' },
};

export const ModelConfigModal: React.FC<ModelConfigModalProps> = ({
  currentTopology,
  customAssignments,
  onApplyTopology,
  onClose,
}) => {
  const [selectedTopology, setSelectedTopology] = useState<ModelTopologyMode>(currentTopology);
  const [assignments, setAssignments] = useState<Record<AgentId, string>>({
    ...TOPOLOGY_PRESETS[currentTopology].assignments,
    ...customAssignments,
  });

  const handleTopologySelect = (mode: ModelTopologyMode) => {
    setSelectedTopology(mode);
    setAssignments({ ...TOPOLOGY_PRESETS[mode].assignments });
  };

  const handleAgentModelChange = (agentId: AgentId, modelId: string) => {
    setSelectedTopology('custom');
    setAssignments((prev) => ({
      ...prev,
      [agentId]: modelId,
    }));
  };

  const handleSave = () => {
    onApplyTopology(selectedTopology, assignments);
    onClose();
  };

  const renderProviderIcon = (provider: string, color: string) => {
    if (provider === 'google') return <Sparkles size={16} color={color} />;
    if (provider === 'anthropic') return <Sun size={16} color={color} />;
    if (provider === 'openai') return <Cpu size={16} color={color} />;
    if (provider === 'meta') return <InfinityIcon size={16} color={color} />;
    if (provider === 'perplexity') return <Search size={16} color={color} />;
    return <Radio size={16} color={color} />;
  };

  return (
    <div className="mcm-modal-overlay">
      <div className="mcm-modal-container">
        {/* Header */}
        <div className="mcm-header">
          <div className="mcm-title-group">
            <div className="mcm-icon-box">
              <Layers size={18} color="#00f0ff" />
            </div>
            <div>
              <h2 className="mcm-title">Multi-Model Swarm Architecture</h2>
              <p className="mcm-subtitle">
                Configure agents across the same model, different models, or cross-provider multi-model swarms
              </p>
            </div>
          </div>
          <button className="mcm-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Quick Presets Selection */}
        <div className="mcm-presets-section">
          <div className="mcm-section-label">TOPOLOGY PRESETS</div>
          <div className="mcm-preset-grid">
            {(Object.keys(TOPOLOGY_PRESETS) as ModelTopologyMode[]).map((mode) => {
              const preset = TOPOLOGY_PRESETS[mode];
              const isSelected = selectedTopology === mode;
              return (
                <div
                  key={mode}
                  className={`mcm-preset-card ${isSelected ? 'mcm-preset-card-active' : ''}`}
                  onClick={() => handleTopologySelect(mode)}
                >
                  <div className="mcm-preset-top">
                    <span className="mcm-preset-tag">{preset.tag}</span>
                    <span className="mcm-preset-badge">{preset.badge}</span>
                  </div>
                  <div className="mcm-preset-name">{preset.name}</div>
                  <div className="mcm-preset-desc">{preset.description}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Individual Agent Model Mapping */}
        <div className="mcm-agents-section">
          <div className="mcm-section-label">ASSIGNED MODELS PER AGENT ROLE</div>
          <div className="mcm-roles-list">
            {(Object.keys(AGENT_ROLE_LABELS) as AgentId[]).map((agentId) => {
              const assignedModelId = assignments[agentId] || 'gemini-1.5-pro';
              const model =
                ALL_SUPPORTED_MODELS.find((m) => m.id === assignedModelId) || ALL_SUPPORTED_MODELS[0];
              const roleInfo = AGENT_ROLE_LABELS[agentId];

              return (
                <div key={agentId} className="mcm-role-row">
                  <div className="mcm-role-info">
                    <div className="mcm-role-title-row">
                      <span className="mcm-role-name">{roleInfo.title}</span>
                      <span className="mcm-role-sub">{roleInfo.subtitle}</span>
                    </div>
                  </div>

                  <div className="mcm-model-selector-wrapper">
                    <div className="mcm-selected-icon">
                      {renderProviderIcon(model.provider, model.color)}
                    </div>
                    <select
                      value={assignedModelId}
                      onChange={(e) => handleAgentModelChange(agentId, e.target.value)}
                      className="mcm-model-dropdown"
                    >
                      {ALL_SUPPORTED_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.providerLabel}) — {m.contextWindow || '128K'}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="mcm-dropdown-chevron" />
                  </div>

                  <div className="mcm-model-metrics-tag">
                    <span className="mcm-meta-chip">
                      <Zap size={11} color="#00f0ff" />
                      <span>{model.latency || '~400ms'}</span>
                    </span>
                    <span className="mcm-meta-chip">
                      <ShieldCheck size={11} color="#10b981" />
                      <span>{model.architecture || 'MoE'}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Antigravity Subscription Notice */}
        <div className="mcm-notice-box">
          <Info size={16} color="#38bdf8" />
          <div className="mcm-notice-text">
            <strong>Active Gemini Antigravity Subscription Detected:</strong> Unified Gemini and Antigravity
            subagents run natively with authenticated tokens. No external API keys or billing configurations
            required.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mcm-footer">
          <button className="mcm-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="mcm-btn-primary" onClick={handleSave}>
            Apply Swarm Architecture
          </button>
        </div>
      </div>
    </div>
  );
};
