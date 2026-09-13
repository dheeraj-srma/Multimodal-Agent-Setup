import React, { useState } from 'react';
import { X, Settings, Key, Folder, Check } from 'lucide-react';
import { storageManager } from '../../storage/StorageManager';
import './SettingsModal.css';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const currentSettings = storageManager.getSettings();
  const [apiKeyGemini, setApiKeyGemini] = useState(currentSettings.apiKeyGemini || '');
  const [apiKeyOpenAI, setApiKeyOpenAI] = useState(currentSettings.apiKeyOpenAI || '');
  const [apiKeyAnthropic, setApiKeyAnthropic] = useState(currentSettings.apiKeyAnthropic || '');
  const [ollamaEndpoint, setOllamaEndpoint] = useState(currentSettings.ollamaEndpoint || '');
  const [workspacePath, setWorkspacePath] = useState(currentSettings.workspacePath || '.');
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
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="modal-backdrop">
      <div className="settings-modal-card">
        <div className="settings-modal-header">
          <div className="sm-title-group">
            <Settings size={16} className="sm-icon" />
            <span className="sm-title">SYSTEM CONFIGURATION & AI PROVIDERS</span>
          </div>
          <button className="sm-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="settings-modal-body">
          <div className="sm-field-group">
            <label className="sm-label">
              <Key size={12} />
              <span>Google Gemini API Key</span>
            </label>
            <input
              type="password"
              className="sm-input"
              placeholder="AIzaSy..."
              value={apiKeyGemini}
              onChange={(e) => setApiKeyGemini(e.target.value)}
            />
          </div>

          <div className="sm-field-group">
            <label className="sm-label">
              <Key size={12} />
              <span>OpenAI API Key</span>
            </label>
            <input
              type="password"
              className="sm-input"
              placeholder="sk-proj-..."
              value={apiKeyOpenAI}
              onChange={(e) => setApiKeyOpenAI(e.target.value)}
            />
          </div>

          <div className="sm-field-group">
            <label className="sm-label">
              <Key size={12} />
              <span>Local Ollama Endpoint (Optional)</span>
            </label>
            <input
              type="text"
              className="sm-input"
              placeholder="http://localhost:11434"
              value={ollamaEndpoint}
              onChange={(e) => setOllamaEndpoint(e.target.value)}
            />
          </div>

          <div className="sm-field-group">
            <label className="sm-label">
              <Folder size={12} />
              <span>Workspace Target Directory</span>
            </label>
            <input
              type="text"
              className="sm-input"
              placeholder="."
              value={workspacePath}
              onChange={(e) => setWorkspacePath(e.target.value)}
            />
          </div>

          <div className="sm-note-box">
            <span>
              ℹ Note: If external API keys are not provided, the system utilizes its built-in
              <strong> ACC Local Intelligence Engine</strong> for deterministic static analysis, code inspections,
              accessibility audits, and git operations.
            </span>
          </div>

          <div className="settings-modal-footer">
            <button type="submit" className="sm-save-btn">
              {saved ? (
                <>
                  <Check size={14} />
                  <span>SAVED</span>
                </>
              ) : (
                <span>SAVE CONFIGURATION</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
