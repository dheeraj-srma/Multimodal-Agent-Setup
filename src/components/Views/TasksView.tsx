import React from 'react';
import {
  CheckSquare,
  Play,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Mission, AgentTask } from '../../types';
import { TaskGraphView } from '../TaskGraph/TaskGraphView';
import { ROLE_COLORS } from '../../config/models';
import './TasksView.css';

interface TasksViewProps {
  mission?: Mission;
  onLaunchMissionDirective?: (prompt: string) => void;
}

const SAMPLE_PIPELINE_TASKS = [
  {
    id: 'task-arch-01',
    title: 'Decompose Objectives & Formulate System Architecture',
    agentId: 'orchestrator' as const,
    role: 'Orchestrator Agent',
    status: 'COMPLETED' as const,
    progress: 100,
    duration: '1.2s',
    dependsOn: [],
  },
  {
    id: 'task-res-02',
    title: 'Audit Performance Bottlenecks & Best Practices',
    agentId: 'research' as const,
    role: 'Research Agent',
    status: 'COMPLETED' as const,
    progress: 100,
    duration: '2.8s',
    dependsOn: ['task-arch-01'],
  },
  {
    id: 'task-des-03',
    title: 'Design Glassmorphism Theme Tokens & UI Layout Spec',
    agentId: 'design' as const,
    role: 'Design Agent',
    status: 'COMPLETED' as const,
    progress: 100,
    duration: '3.4s',
    dependsOn: ['task-arch-01'],
  },
  {
    id: 'task-code-04',
    title: 'Implement AST Transformations & Component Pipeline',
    agentId: 'coder' as const,
    role: 'Coder Agent',
    status: 'COMPLETED' as const,
    progress: 100,
    duration: '4.1s',
    dependsOn: ['task-des-03', 'task-res-02'],
  },
  {
    id: 'task-test-05',
    title: 'Run WCAG AAA Accessibility & Regression Test Suite',
    agentId: 'tester' as const,
    role: 'Tester Agent',
    status: 'COMPLETED' as const,
    progress: 100,
    duration: '2.1s',
    dependsOn: ['task-code-04'],
  },
];

export const TasksView: React.FC<TasksViewProps> = ({
  mission,
  onLaunchMissionDirective,
}) => {
  const tasks = mission && mission.tasks && mission.tasks.length > 0 ? mission.tasks : null;

  return (
    <div className="tasks-view-container">
      {/* Header */}
      <div className="tasks-view-header">
        <div className="tvh-title-group">
          <CheckSquare size={18} className="tvh-icon" />
          <div>
            <h2 className="tvh-title">TASK PIPELINE & DAG ORCHESTRATION BOARD</h2>
            <span className="tvh-subtitle">
              Dynamic dependency graph, parallel execution tracking, and stage transitions
            </span>
          </div>
        </div>

        <div className="tvh-stats">
          <div className="tvh-stat-chip">
            <span className="tsc-label">PARALLELISM:</span>
            <span className="tsc-val text-cyan">{mission?.parallelismFactor ? `${mission.parallelismFactor.toFixed(1)}x` : '1.6x'}</span>
          </div>
          <div className="tvh-stat-chip">
            <span className="tsc-label">STATUS:</span>
            <span className="tsc-val text-emerald">{mission?.status || 'READY'}</span>
          </div>
        </div>
      </div>

      {/* DAG Visualization */}
      {tasks ? (
        <TaskGraphView tasks={tasks} />
      ) : (
        <div className="tasks-dag-preview-box">
          <div className="tdp-title-row">
            <Layers size={14} color="#38bdf8" />
            <span>ACTIVE SWARM EXECUTION PIPELINE (DAG GRAPH)</span>
          </div>
          <div className="tdp-pipeline-flow">
            {SAMPLE_PIPELINE_TASKS.map((st, idx) => (
              <React.Fragment key={st.id}>
                <div className="tdp-node-card">
                  <div className="tdp-node-role" style={{ color: ROLE_COLORS[st.agentId] }}>
                    {st.role}
                  </div>
                  <div className="tdp-node-title">{st.title}</div>
                  <div className="tdp-node-footer">
                    <span className="tdp-node-status">✓ 100%</span>
                    <span className="tdp-node-dur">{st.duration}</span>
                  </div>
                </div>
                {idx < SAMPLE_PIPELINE_TASKS.length - 1 && (
                  <div className="tdp-flow-arrow">
                    <ArrowRight size={14} color="#64748b" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Task List Details */}
      <div className="tasks-list-panel">
        <div className="tlp-header">
          <span className="tlp-title">EXECUTION STAGES & DEPENDENCY TRACE</span>
          <span className="tlp-count">({(tasks || SAMPLE_PIPELINE_TASKS).length} Subtasks)</span>
        </div>

        <div className="tlp-items-grid">
          {(tasks || SAMPLE_PIPELINE_TASKS).map((task: any) => {
            const roleColor = ROLE_COLORS[task.agentId as keyof typeof ROLE_COLORS] || '#38bdf8';
            return (
              <div key={task.id} className="task-detail-card" style={{ borderLeftColor: roleColor }}>
                <div className="tdc-top">
                  <span className="tdc-agent-role" style={{ color: roleColor }}>
                    @{task.agentId}
                  </span>
                  <span className="tdc-status-tag">
                    {task.status} • {task.progress}%
                  </span>
                </div>
                <h4 className="tdc-title">{task.title}</h4>
                {task.description && <p className="tdc-desc">{task.description}</p>}
                <div className="tdc-meta">
                  <span className="tdc-meta-item">
                    Depends on: {task.dependsOn?.length > 0 ? task.dependsOn.join(', ') : 'Root / Orchestrator'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
