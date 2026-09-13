import React, { useState } from 'react';
import { Play, Sparkles, Terminal, RotateCcw } from 'lucide-react';
import './MissionInput.css';

interface MissionInputProps {
  onRunMission: (objective: string) => void;
  isExecuting: boolean;
}

const PRESET_OBJECTIVES = [
  'Audit this project and identify improvements to UI, architecture, performance and accessibility.',
  'Redesign my portfolio, improve performance, audit accessibility, and add a new projects section.',
  'Optimize frontend bundle size, implement strict TypeScript types, and eliminate render bottlenecks.',
];

export const MissionInput: React.FC<MissionInputProps> = ({ onRunMission, isExecuting }) => {
  const [objective, setObjective] = useState(
    'Audit this project and identify improvements to UI, architecture, performance and accessibility.'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!objective.trim() || isExecuting) return;
    onRunMission(objective.trim());
  };

  return (
    <div className="mission-input-card">
      <form onSubmit={handleSubmit} className="mission-form">
        <div className="mission-header-row">
          <div className="mission-prompt-title">
            <Sparkles size={15} className="sparkle-icon" />
            <span>MISSION DIRECTIVE</span>
          </div>
          <div className="preset-chips">
            <span className="preset-label">Presets:</span>
            {PRESET_OBJECTIVES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                className="chip-btn"
                onClick={() => setObjective(preset)}
                disabled={isExecuting}
              >
                {idx === 0 ? 'Project Audit' : idx === 1 ? 'Portfolio Redesign' : 'Bundle Optimization'}
              </button>
            ))}
          </div>
        </div>

        <div className="mission-input-wrapper">
          <textarea
            className="mission-textarea"
            rows={2}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="What should the agents work on? (e.g. Redesign portfolio, improve performance, audit accessibility...)"
            disabled={isExecuting}
          />
          <button
            type="submit"
            className={`run-mission-btn ${isExecuting ? 'btn-executing' : ''}`}
            disabled={isExecuting || !objective.trim()}
          >
            {isExecuting ? (
              <>
                <RotateCcw size={16} className="spin-icon" />
                <span>SWARM RUNNING</span>
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" />
                <span>LAUNCH MISSION</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
