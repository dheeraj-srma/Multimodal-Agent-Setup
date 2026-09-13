import React from 'react';
import {
  Layers,
  Users,
  CheckSquare,
  FolderTree,
  GitBranch,
  Settings,
  Sparkles,
  Sun,
  Cpu,
  Infinity as InfinityIcon,
  Search,
  Plus,
  Radio,
  Sliders,
} from 'lucide-react';
import { AgentId } from '../../types';
import { ALL_SUPPORTED_MODELS, ModelTopologyMode, TOPOLOGY_PRESETS } from '../../config/models';
import './Sidebar.css';

interface SidebarProps {
  activeTab: 'mission' | 'agents' | 'tasks' | 'files' | 'git' | 'settings';
  onTabChange: (tab: 'mission' | 'agents' | 'tasks' | 'files' | 'git' | 'settings') => void;
  topologyMode: ModelTopologyMode;
  onTopologyModeChange: (mode: ModelTopologyMode) => void;
  customAssignments?: Partial<Record<AgentId, string>>;
  onOpenAddModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  topologyMode,
  onTopologyModeChange,
  customAssignments = {},
  onOpenAddModal,
}) => {
  const currentAssignments = {
    ...TOPOLOGY_PRESETS[topologyMode]?.assignments,
    ...customAssignments,
  };
  const activeModelIds = Object.values(currentAssignments);

  return (
    <aside className="command-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-apex-icon">
          <span>▲</span>
        </div>
        <div className="brand-info">
          <span className="brand-main">AI COMMAND CENTER</span>
          <span className="brand-sub">MULTI-MODEL AGENT ORCHESTRATION</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activeTab === 'mission' ? 'nav-item-active' : ''}`}
          onClick={() => onTabChange('mission')}
        >
          <Layers size={15} />
          <span>Mission Control</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'agents' ? 'nav-item-active' : ''}`}
          onClick={() => onTabChange('agents')}
        >
          <Users size={15} />
          <span>Agents</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'tasks' ? 'nav-item-active' : ''}`}
          onClick={() => onTabChange('tasks')}
        >
          <CheckSquare size={15} />
          <span>Tasks</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'files' ? 'nav-item-active' : ''}`}
          onClick={() => onTabChange('files')}
        >
          <FolderTree size={15} />
          <span>Files</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'git' ? 'nav-item-active' : ''}`}
          onClick={() => onTabChange('git')}
        >
          <GitBranch size={15} />
          <span>Git</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'settings' ? 'nav-item-active' : ''}`}
          onClick={() => onTabChange('settings')}
        >
          <Settings size={15} />
          <span>Settings</span>
        </button>
      </nav>

      {/* Topology Preset Selector */}
      <div className="sidebar-section">
        <div className="section-header-title">SWARM ARCHITECTURE</div>
        <div className="topology-select-wrapper">
          <select
            value={topologyMode}
            onChange={(e) => onTopologyModeChange(e.target.value as ModelTopologyMode)}
            className="topology-dropdown"
          >
            <option value="multi-provider">Different Models (Cross-Provider)</option>
            <option value="all-gemini">Same Model (All Gemini Antigravity)</option>
            <option value="all-claude">Same Model (All Claude 3.5)</option>
            <option value="all-local">All Local (Ollama / Privacy)</option>
            <option value="custom">Custom Multi-Model Matrix</option>
          </select>
        </div>
      </div>

      {/* Models Section */}
      <div className="sidebar-section models-section">
        <div className="section-header-title">ACTIVE ROSTER</div>
        <div className="models-list">
          {ALL_SUPPORTED_MODELS.slice(0, 7).map((model) => {
            const isAssigned = activeModelIds.includes(model.id);

            return (
              <div
                key={model.id}
                className={`model-row-item ${isAssigned ? 'model-assigned' : ''}`}
                onClick={onOpenAddModal}
                title={`Provider: ${model.providerLabel} | Context: ${model.contextWindow || '128K'}`}
              >
                <div className="model-row-left">
                  {model.provider === 'google' && <Sparkles size={13} style={{ color: model.color }} />}
                  {model.provider === 'anthropic' && <Sun size={13} style={{ color: model.color }} />}
                  {model.provider === 'openai' && <Cpu size={13} style={{ color: model.color }} />}
                  {model.provider === 'meta' && <InfinityIcon size={13} style={{ color: model.color }} />}
                  {model.provider === 'perplexity' && <Search size={13} style={{ color: model.color }} />}
                  {model.provider === 'mistral' && <Radio size={13} style={{ color: model.color }} />}
                  {model.provider === 'local' && <Radio size={13} style={{ color: model.color }} />}
                  <span className="model-row-name">{model.name}</span>
                </div>
                {isAssigned && (
                  <span
                    className="model-active-dot"
                    style={{ background: model.color, boxShadow: `0 0 8px ${model.color}` }}
                  ></span>
                )}
              </div>
            );
          })}
        </div>

        <button className="add-model-btn" onClick={onOpenAddModal}>
          <Plus size={13} />
          <span>Configure Swarm</span>
        </button>
      </div>

      {/* Bottom Audio Waveform / Quote */}
      <div className="sidebar-footer-quote">
        <div className="quote-text">"Ideas multiply when minds work together."</div>
        <div className="waveform-box">
          <span className="wave-bar wb-1"></span>
          <span className="wave-bar wb-2"></span>
          <span className="wave-bar wb-3"></span>
          <span className="wave-bar wb-4"></span>
          <span className="wave-bar wb-5"></span>
          <span className="wave-bar wb-6"></span>
          <span className="wave-bar wb-7"></span>
          <span className="wave-bar wb-8"></span>
          <span className="wave-bar wb-9"></span>
        </div>
      </div>
    </aside>
  );
};
