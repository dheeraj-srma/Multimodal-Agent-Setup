import React, { useState, useEffect, useCallback } from 'react';
import {
  AgentId,
  AgentStatus,
  AgentEvent,
  Mission,
  FileConflictPayload,
  GitStatusInfo,
} from './types';
import { eventBus } from './events/EventBus';
import { agentRuntime } from './agents/runtime/AgentRuntime';
import { dagScheduler } from './orchestration/DAGScheduler';
import { storageManager } from './storage/StorageManager';
import { gitManager } from './git/GitManager';
import { workspaceSafety } from './workspace/WorkspaceSafety';
import { orchestratorAgent } from './agents/orchestrator/OrchestratorAgent';

import { TopBar } from './components/TopBar/TopBar';
import { MissionInput } from './components/MissionInput/MissionInput';
import { AgentGraph } from './components/AgentGraph/AgentGraph';
import { AgentCard } from './components/AgentCard/AgentCard';
import { TaskGraphView } from './components/TaskGraph/TaskGraphView';
import { ActivityTerminal } from './components/ActivityTerminal/ActivityTerminal';
import { AgentInspector } from './components/AgentInspector/AgentInspector';
import { ConflictModal } from './components/ConflictResolver/ConflictModal';
import { GitDiffModal } from './components/GitDiffViewer/GitDiffModal';
import { MissionReportModal } from './components/MissionReportModal/MissionReportModal';
import { SettingsModal } from './components/SettingsModal/SettingsModal';

import './styles/theme.css';
import './styles/animations.css';
import './App.css';

export const App: React.FC = () => {
  // Swarm States
  const [mission, setMission] = useState<Mission | undefined>(() => {
    const lastId = storageManager.getLastActiveMissionId();
    return lastId ? storageManager.getMission(lastId) : undefined;
  });

  const [agentStatuses, setAgentStatuses] = useState<Record<AgentId, AgentStatus>>(() => {
    return agentRuntime.getAllStatuses();
  });

  const [events, setEvents] = useState<AgentEvent[]>(() => {
    return storageManager.getEvents(200);
  });

  const [selectedAgentId, setSelectedAgentId] = useState<AgentId | undefined>(undefined);
  const [activeConflict, setActiveConflict] = useState<FileConflictPayload | undefined>(undefined);

  // Git State
  const [gitStatus, setGitStatus] = useState<GitStatusInfo>({
    isGitRepo: true,
    currentBranch: 'main',
    modifiedFiles: [],
    addedFiles: [],
    deletedFiles: [],
    untrackedFiles: [],
    aheadCount: 0,
    behindCount: 0,
    recentCommits: [],
  });
  const [diffText, setDiffText] = useState<string>('');

  // Modals
  const [showGitModal, setShowGitModal] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Refresh Git Status
  const refreshGit = useCallback(async () => {
    try {
      const status = await gitManager.getStatus();
      setGitStatus(status);
      const diff = await gitManager.getDiff();
      setDiffText(diff);
    } catch (err) {
      console.warn('[App] Error refreshing git status:', err);
    }
  }, []);

  useEffect(() => {
    refreshGit();
    const gitInterval = setInterval(refreshGit, 10000);
    return () => clearInterval(gitInterval);
  }, [refreshGit]);

  // Subscribe to Central EventBus for all real-time events!
  useEffect(() => {
    const unsubscribe = eventBus.subscribe((event) => {
      setEvents((prev) => [...prev.slice(-1500), event]);
      storageManager.appendEvent(event);

      // Handle specific event types for UI updates
      if (event.type === 'AGENT_STATUS' || event.type === 'AGENT_PROGRESS') {
        if (event.agentId !== 'system') {
          setAgentStatuses((prev) => ({
            ...prev,
            [event.agentId as AgentId]: agentRuntime.getStatus(event.agentId),
          }));
        }
      } else if (event.type === 'MISSION_UPDATED') {
        setMission({ ...(event.payload as Mission) });
      } else if (event.type === 'CONFLICT_DETECTED') {
        setActiveConflict(event.payload as FileConflictPayload);
      } else if (event.type === 'CONFLICT_RESOLVED') {
        setActiveConflict(undefined);
      } else if (event.type === 'FILE_CHANGED') {
        refreshGit();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [refreshGit]);

  // Mission Launch Handler
  const handleLaunchMission = async (objective: string) => {
    const newMission = orchestratorAgent.prepareMission(objective);
    setMission(newMission);
    await dagScheduler.runMission(newMission);
  };

  // Swarm Actions
  const handlePauseAll = () => dagScheduler.pauseAll();
  const handleResumeAll = () => dagScheduler.resumeAll();
  const handleStopAll = () => dagScheduler.stopAll();

  // Agent Specific Actions
  const handlePauseAgent = (id: AgentId) => agentRuntime.pause(id);
  const handleResumeAgent = (id: AgentId) => agentRuntime.resume(id);
  const handleStopAgent = (id: AgentId) => agentRuntime.stop(id);
  const handleSendMessageToAgent = (to: AgentId, body: string) => {
    agentRuntime.sendMessage({
      id: `msg-${Date.now()}`,
      from: 'orchestrator',
      to,
      subject: 'OPERATOR_DIRECTIVE',
      body,
    });
  };

  // Conflict Resolution Handler
  const handleResolveConflict = (choice: 'KEEP_A' | 'KEEP_B' | 'MERGE' | 'ORCHESTRATOR') => {
    if (!activeConflict) return;
    workspaceSafety.resolveConflict(activeConflict.conflictId, choice);
    setActiveConflict(undefined);
  };

  // Commit Handler
  const handleCommit = async (message: string) => {
    const res = await gitManager.commit(message);
    await refreshGit();
    return res;
  };

  return (
    <div className="acc-app-root">
      {/* Top Telemetry Header */}
      <TopBar
        mission={mission}
        gitStatus={gitStatus}
        onOpenGitModal={() => setShowGitModal(true)}
        onOpenDiffModal={() => setShowDiffModal(true)}
        onOpenReportModal={() => setShowReportModal(true)}
        onOpenSettingsModal={() => setShowSettingsModal(true)}
        onPauseAll={handlePauseAll}
        onResumeAll={handleResumeAll}
        onStopAll={handleStopAll}
      />

      {/* Main Mission Control Canvas */}
      <main className="acc-main-workspace">
        <div className="workspace-scroll-container">
          {/* Mission Directive Deck */}
          <MissionInput
            onRunMission={handleLaunchMission}
            isExecuting={mission?.status === 'RUNNING'}
          />

          {/* Central Swarm Topology Graph with Animated Travelling Data Packets */}
          <AgentGraph
            statuses={agentStatuses}
            selectedAgentId={selectedAgentId}
            onSelectAgent={(id) => setSelectedAgentId(id)}
            recentEvents={events}
          />

          {/* 4 Specialized Worker Agent Cards Grid */}
          <div className="agent-cards-grid">
            {(['design', 'coder', 'research', 'tester'] as const).map((agentId) => (
              <AgentCard
                key={agentId}
                status={
                  agentStatuses[agentId] || {
                    agentId,
                    role:
                      agentId === 'design'
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
                  }
                }
                recentLogs={events.filter((e) => e.agentId === agentId)}
                isSelected={selectedAgentId === agentId}
                onSelect={(id) => setSelectedAgentId(id)}
              />
            ))}
          </div>

          {/* Dynamic DAG Task Execution Graph */}
          {mission && <TaskGraphView tasks={mission.tasks} />}
        </div>

        {/* Selected Agent Inspector Drawer */}
        {selectedAgentId && (
          <AgentInspector
            agentId={selectedAgentId}
            status={
              agentStatuses[selectedAgentId] || {
                agentId: selectedAgentId,
                role: 'Coder Agent',
                state: 'IDLE',
                progress: 0,
                filesTouchedCount: 0,
                messagesCount: 0,
                executionDurationMs: 0,
              }
            }
            events={events}
            onClose={() => setSelectedAgentId(undefined)}
            onPause={handlePauseAgent}
            onResume={handleResumeAgent}
            onStop={handleStopAgent}
            onSendMessage={handleSendMessageToAgent}
          />
        )}
      </main>

      {/* Global Activity Terminal (Monospace Live Stream) */}
      <ActivityTerminal events={events} onClear={() => eventBus.clearHistory()} />

      {/* Interactive Conflict Resolution Modal */}
      {activeConflict && (
        <ConflictModal
          conflict={activeConflict}
          onResolve={handleResolveConflict}
          onClose={() => setActiveConflict(undefined)}
        />
      )}

      {/* Git Diff & Commit Modal */}
      {(showGitModal || showDiffModal) && (
        <GitDiffModal
          gitStatus={gitStatus}
          diffText={diffText}
          onCommit={handleCommit}
          onClose={() => {
            setShowGitModal(false);
            setShowDiffModal(false);
          }}
        />
      )}

      {/* Mission Synthesis Markdown Report Modal */}
      {showReportModal && (
        <MissionReportModal
          reportText={mission?.finalReport}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* System Settings & AI Keys Modal */}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </div>
  );
};
