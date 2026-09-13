import React from 'react';
import { AgentTask } from '../../types';
import { CheckCircle2, Clock, Play, AlertCircle, ArrowRight, CornerDownRight } from 'lucide-react';
import './TaskGraphView.css';

interface TaskGraphViewProps {
  tasks: AgentTask[];
}

export const TaskGraphView: React.FC<TaskGraphViewProps> = ({ tasks }) => {
  if (tasks.length === 0) {
    return (
      <div className="task-graph-empty">
        <span>No dynamic mission task graph generated yet. Launch a mission above.</span>
      </div>
    );
  }

  // Separate tasks into root (independent: dependsOn.length === 0) and dependent
  const independentTasks = tasks.filter((t) => t.dependsOn.length === 0);
  const dependentTasks = tasks.filter((t) => t.dependsOn.length > 0);

  return (
    <div className="task-graph-card">
      <div className="task-graph-header">
        <span className="tg-title">DYNAMIC DAG EXECUTION GRAPH</span>
        <span className="tg-stats">
          {tasks.filter((t) => t.status === 'COMPLETED').length} / {tasks.length} Completed
        </span>
      </div>

      <div className="dag-flow-layout">
        {/* Tier 1: Independent Parallel Tasks */}
        <div className="dag-tier">
          <div className="tier-badge">
            <span className="tier-tag">CONCURRENT BATCH 1</span>
            <span className="tier-desc">Independent Operations</span>
          </div>
          <div className="tier-tasks-grid">
            {independentTasks.map((task) => (
              <TaskNodeItem key={task.id} task={task} />
            ))}
          </div>
        </div>

        {/* Transition Divider Arrow */}
        {dependentTasks.length > 0 && (
          <div className="dag-flow-connector">
            <div className="connector-line"></div>
            <div className="connector-arrow">
              <CornerDownRight size={16} />
              <span>DEPENDENCY SYNTHESIS GATE</span>
            </div>
            <div className="connector-line"></div>
          </div>
        )}

        {/* Tier 2: Dependent Sequential Tasks */}
        {dependentTasks.length > 0 && (
          <div className="dag-tier">
            <div className="tier-badge">
              <span className="tier-tag">CONCURRENT BATCH 2</span>
              <span className="tier-desc">Integration & Verification</span>
            </div>
            <div className="tier-tasks-grid">
              {dependentTasks.map((task) => (
                <TaskNodeItem key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TaskNodeItem: React.FC<{ task: AgentTask }> = ({ task }) => {
  const isCompleted = task.status === 'COMPLETED';
  const isRunning = task.status === 'RUNNING';
  const isFailed = task.status === 'FAILED';

  return (
    <div className={`task-node-item node-${task.status.toLowerCase()}`}>
      <div className="task-node-top">
        <span className={`task-agent-badge badge-${task.agentId}`}>{task.agentId.toUpperCase()}</span>
        <div className="task-status-indicator">
          {isCompleted && <CheckCircle2 size={13} className="stat-icon-green" />}
          {isRunning && <Play size={12} className="stat-icon-cyan" />}
          {isFailed && <AlertCircle size={13} className="stat-icon-red" />}
          {!isCompleted && !isRunning && !isFailed && <Clock size={12} className="stat-icon-dim" />}
          <span className="task-status-name">{task.status}</span>
        </div>
      </div>
      <div className="task-node-title">{task.title}</div>
      <div className="task-node-progress">
        <div className="task-bar-track">
          <div
            className={`task-bar-fill ${isRunning ? 'shimmer-active' : ''}`}
            style={{ width: `${task.progress}%` }}
          ></div>
        </div>
        <span className="task-pct">{task.progress}%</span>
      </div>
    </div>
  );
};
