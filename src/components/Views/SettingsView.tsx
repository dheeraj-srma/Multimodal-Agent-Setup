import React, { useState } from 'react';
import {
  Settings,
  Key,
  Folder,
  Check,
  ShieldCheck,
  Cpu,
  Sparkles,
  Lock,
  Sliders,
  Terminal,
} from 'lucide-react';
import { storageManager } from '../../storage/StorageManager';
import './SettingsView.css';

export const SettingsView: React.FC = () => {
  const currentSettings = storageManager.getSettings();
  const [apiKeyGemini, setApiKeyGemini] = useState(currentSettings.apiKeyGemini || '');
  const [apiKeyOpenAI, setApiKeyOpenAI] = useState(currentSettings.apiKeyOpenAI || '');
  const [apiKeyAnthropic, setApiKeyAnthropic] = useState(currentSettings.apiKeyAnthropic || '');
  const [ollamaEndpoint, setOllamaEndpoint] = useState(currentSettings.ollamaEndpoint || 'http://localhost:11434');
  const [workspacePath, setWorkspacePath] = useState(currentSettings.workspacePath || '.');
  const [maxConcurrency, setMaxConcurrency] = useState(4);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storageManager.updateSettings({
      apiKeyGemini: apiKeyGemini.trim() || undefined,
      apiKeyOpenAI: apiKeyOpenAI.trim() || undefined,
      apiKeyAnthropic: apiKeyAnthropic.trim() || undefined,
      ollamaEndpoint: ollamaEndpoint.trim() || undefined,
      workspacePath: workspacePath.trim() || '.',
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="settings-view-container">
      {/* Top Header */}
      <div className="settings-view-header">
        <div className="svh-title-group">
          <Settings size={18} className="svh-icon" />
          <div>
            <h2 className="svh-title">SYSTEM CONFIGURATION & PROVIDER CREDENTIALS</h2>
            <span className="svh-subtitle">
              Manage local Antigravity subscription runtime, external model API keys, and workspace safety bounds
            </span>
          </div>
        </div>

        {saved && (
          <div className="svh-saved-banner">
            <Check size={14} />
            <span>Configuration Persisted Successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="settings-view-form">
        {/* Section 1: AI Model Providers */}
        <div className="sv-section-card">
          <div className="sv-section-header">
            <Sparkles size={15} color="#38bdf8" />
            <span className="sv-section-title">AI MODEL PROVIDERS & INFERENCE ENDPOINTS</span>
          </div>

          <div className="sv-fields-grid">
            {/* Google Gemini Antigravity Native */}
            <div className="sv-field-box">
              <div className="svf-label-row">
                <label className="svf-label">Google Gemini Antigravity Native</label>
                <span className="svf-status-badge badge-active">ACTIVE SUBSCRIPTION</span>
              </div>
              <input
                type="password"
                className="svf-input"
                placeholder="Managed via Antigravity Local Subscription"
                value={apiKeyGemini || 'antigravity-native-pro-token'}
                disabled
              />
              <span className="svf-hint">
                Zero external API cost. Operates directly via your Google Deepmind Antigravity subscription.
              </span>
            </div>

            {/* Anthropic Claude */}
            <div className="sv-field-box">
              <div className="svf-label-row">
                <label className="svf-label">Anthropic Claude (Sonnet 3.5)</label>
                <span className="svf-status-badge">OPTIONAL</span>
              </div>
              <input
                type="password"
                className="svf-input"
                placeholder="sk-ant-api03-..."
                value={apiKeyAnthropic}
                onChange={(e) => setApiKeyAnthropic(e.target.value)}
              />
              <span className="svf-hint">
                Used for specialized architectural and UX design tasks when enabled in topology.
              </span>
            </div>

            {/* OpenAI */}
            <div className="sv-field-box">
              <div className="svf-label-row">
                <label className="svf-label">OpenAI (GPT-4o & o1)</label>
                <span className="svf-status-badge">OPTIONAL</span>
              </div>
              <input
                type="password"
                className="svf-input"
                placeholder="sk-proj-..."
                value={apiKeyOpenAI}
                onChange={(e) => setApiKeyOpenAI(e.target.value)}
              />
              <span className="svf-hint">
                Used for multi-provider swarm benchmark cross-validation.
              </span>
            </div>

            {/* Ollama Local */}
            <div className="sv-field-box">
              <div className="svf-label-row">
                <label className="svf-label">Local Ollama REST Endpoint</label>
                <span className="svf-status-badge">LOCAL HOST</span>
              </div>
              <input
                type="text"
                className="svf-input"
                placeholder="http://localhost:11434"
                value={ollamaEndpoint}
                onChange={(e) => setOllamaEndpoint(e.target.value)}
              />
              <span className="svf-hint">
                Local offline inference using Llama 3 or DeepSeek for zero-cost private code analysis.
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Workspace Safety & Concurrency Boundaries */}
        <div className="sv-section-card">
          <div className="sv-section-header">
            <ShieldCheck size={15} color="#10b981" />
            <span className="sv-section-title">WORKSPACE SAFETY & COLLISION BOUNDARIES</span>
          </div>

          <div className="sv-fields-grid">
            <div className="sv-field-box">
              <label className="svf-label">Workspace Target Path</label>
              <input
                type="text"
                className="svf-input"
                placeholder="."
                value={workspacePath}
                onChange={(e) => setWorkspacePath(e.target.value)}
              />
              <span className="svf-hint">
                Root directory where agents inspect code, run diffs, and generate task artifacts.
              </span>
            </div>

            <div className="sv-field-box">
              <label className="svf-label">Max Swarm Concurrency</label>
              <select
                className="svf-select"
                value={maxConcurrency}
                onChange={(e) => setMaxConcurrency(Number(e.target.value))}
              >
                <option value={2}>2 Concurrent Agents (Balanced)</option>
                <option value={4}>4 Concurrent Agents (Swarm Default)</option>
                <option value={8}>8 Concurrent Agents (High Throughput)</option>
              </select>
              <span className="svf-hint">
                Controls how many DAG task stages execute in parallel before orchestrator synchronization.
              </span>
            </div>
          </div>

          <div className="sv-safety-rules-box">
            <div className="srb-header">
              <Lock size={12} color="#f59e0b" />
              <span>ACTIVE IMMUTABLE PATH RULES (PROTECTED AGAINST WRITE COLLISIONS)</span>
            </div>
            <div className="srb-pills">
              <span className="srb-pill">.git/</span>
              <span className="srb-pill">node_modules/</span>
              <span className="srb-pill">package.json</span>
              <span className="srb-pill">.env</span>
              <span className="srb-pill">.gitignore</span>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="sv-actions-bar">
          <button type="submit" className="sv-save-btn">
            <Check size={14} />
            <span>SAVE CONFIGURATION</span>
          </button>
        </div>
      </form>
    </div>
  );
};
