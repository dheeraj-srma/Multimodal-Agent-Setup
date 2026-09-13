import React, { useState, useEffect, useCallback } from 'react';
import {
  AgentId,
  AgentStatus,
  AgentEvent,
  Mission,
  FileConflictPayload,
  GitStatusInfo,
  AgentMessagePayload,
} from './types';
import { eventBus } from './events/EventBus';
import { agentRuntime } from './agents/runtime/AgentRuntime';
import { dagScheduler } from './orchestration/DAGScheduler';
import { storageManager } from './storage/StorageManager';
import { gitManager } from './git/GitManager';
import { workspaceSafety } from './workspace/WorkspaceSafety';
import { orchestratorAgent } from './agents/orchestrator/OrchestratorAgent';
import { ModelTopologyMode, TOPOLOGY_PRESETS } from './config/models';

import { Sidebar } from './components/Sidebar/Sidebar';
import { TopBar } from './components/TopBar/TopBar';
import { MissionInput } from './components/MissionInput/MissionInput';
import { AgentGraph } from './components/AgentGraph/AgentGraph';
import { LiveCommunicationPanel } from './components/LiveCommunication/LiveCommunicationPanel';
import { BottomTelemetryPanel } from './components/BottomTelemetry/BottomTelemetryPanel';
import { AgentCard } from './components/AgentCard/AgentCard';
import { TaskGraphView } from './components/TaskGraph/TaskGraphView';
import { AgentInspector } from './components/AgentInspector/AgentInspector';
import { ModelConfigModal } from './components/ModelConfigModal/ModelConfigModal';
import { ConflictModal } from './components/ConflictResolver/ConflictModal';
import { GitDiffModal } from './components/GitDiffViewer/GitDiffModal';
import { MissionReportModal } from './components/MissionReportModal/MissionReportModal';
import { SettingsModal } from './components/SettingsModal/SettingsModal';

import './styles/theme.css';
import './styles/animations.css';
import './App.css';

export const App: React.FC = () => {
  // Navigation & Topology States
  const [activeTab, setActiveTab] = useState<'mission' | 'agents' | 'tasks' | 'files' | 'git' | 'settings'>('mission');
  const [topologyMode, setTopologyMode] = useState<ModelTopologyMode>('multi-provider');
  const [customAssignments, setCustomAssignments] = useState<Partial<Record<AgentId, string>>>({});
  const [showModelConfig, setShowModelConfig] = useState(false);

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

  const [messages, setMessages] = useState<AgentMessagePayload[]>([]);
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

  // Subscribe to Central EventBus for all real-time events
  useEffect(() => {
    const unsubscribe = eventBus.subscribe((event) => {
      setEvents((prev) => [...prev.slice(-1500), event]);
      storageManager.appendEvent(event);

      // Handle specific event types
      if (event.type === 'AGENT_STATUS' || event.type === 'AGENT_PROGRESS') {
        if (event.agentId !== 'system') {
          setAgentStatuses((prev) => ({
            ...prev,
            [event.agentId as AgentId]: agentRuntime.getStatus(event.agentId),
          }));
        }
      } else if (event.type === 'AGENT_MESSAGE') {
        const msg = event.payload as AgentMessagePayload;
        setMessages((prev) => [...prev.slice(-40), msg]);
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

  // Handle Sidebar Navigation
  const handleTabChange = (tab: 'mission' | 'agents' | 'tasks' | 'files' | 'git' | 'settings') => {
    setActiveTab(tab);
    if (tab === 'files') setShowDiffModal(true);
    if (tab === 'git') setShowGitModal(true);
    if (tab === 'settings') setShowSettingsModal(true);
  };

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
    const newMsg: AgentMessagePayload = {
      id: `msg-${Date.now()}`,
      from: 'orchestrator',
      to,
      subject: 'OPERATOR_DIRECTIVE',
      body,
    };
    agentRuntime.sendMessage(newMsg);
    setMessages((prev) => [...prev, newMsg]);
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

  const handleApplyTopology = (mode: ModelTopologyMode, assignments?: Partial<Record<AgentId, string>>) => {
    setTopologyMode(mode);
    if (assignments) {
      setCustomAssignments(assignments);
    }
  };

  const activeAgentsCount = Object.values(agentStatuses).filter(
    (s) => s.state === 'WORKING' || s.state === 'STARTING'
  ).length || 4;

  return (
    <div className="acc-app-root">
      {/* 1. Left Sidebar (Fixed 240px) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        topologyMode={topologyMode}
        onTopologyModeChange={(mode) => setTopologyMode(mode)}
        customAssignments={customAssignments}
        onOpenAddModal={() => setShowModelConfig(true)}
      />

      {/* 2. Center Main Column (Expands to fill) */}
      <div className="acc-center-column">
        {/* Top HUD Header */}
        <TopBar
          mission={mission}
          gitStatus={gitStatus}
          activeAgentsCount={activeAgentsCount}
          onOpenGitModal={() => setShowGitModal(true)}
          onOpenDiffModal={() => setShowDiffModal(true)}
          onOpenReportModal={() => setShowReportModal(true)}
          onOpenSettingsModal={() => setShowSettingsModal(true)}
          onPauseAll={handlePauseAll}
          onResumeAll={handleResumeAll}
          onStopAll={handleStopAll}
        />

        {/* Center Scrollable Canvas */}
        <div className="acc-center-scroll-body">
          {/* Mission Directive Deck */}
          <MissionInput
            onRunMission={handleLaunchMission}
            isExecuting={mission?.status === 'RUNNING'}
          />

          {/* Hero: Multi-Agent Model Topology Graph */}
          <AgentGraph
            statuses={agentStatuses}
            selectedAgentId={selectedAgentId}
            onSelectAgent={(id) => setSelectedAgentId(id)}
            recentEvents={events}
            topologyMode={topologyMode}
            customAssignments={customAssignments}
            onSelectTopologyMode={(mode) => setTopologyMode(mode)}
            onOpenModelConfig={() => setShowModelConfig(true)}
          />

          {/* Dynamic Views based on activeTab */}
          {activeTab === 'agents' ? (
            <div className="agent-cards-grid">
              {(['orchestrator', 'design', 'coder', 'research', 'tester'] as const).map((agentId) => (
                <AgentCard
                  key={agentId}
                  status={
                    agentStatuses[agentId] || {
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
                    }
                  }
                  recentLogs={events.filter((e) => e.agentId === agentId)}
                  isSelected={selectedAgentId === agentId}
                  onSelect={(id) => setSelectedAgentId(id)}
                />
              ))}
            </div>
          ) : activeTab === 'tasks' ? (
            mission && <TaskGraphView tasks={mission.tasks} />
          ) : (
            <>
              {/* Default Mission Control View: Show DAG if active, plus compact cards */}
              {mission && mission.tasks.length > 0 && <TaskGraphView tasks={mission.tasks} />}
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
            </>
          )}
        </div>

        {/* Bottom Telemetry Dock */}
        <BottomTelemetryPanel
          events={events}
          activeAgentsCount={activeAgentsCount}
          gitStatus={gitStatus}
          onOpenDiffModal={() => setShowDiffModal(true)}
        />
      </div>

      {/* 3. Right Live Communication & Task Panel (Fixed 290px) */}
      <LiveCommunicationPanel
        messages={messages}
        mission={mission}
        onSendMessage={(to, text) => {
          const newMsg: AgentMessagePayload = {
            id: `msg-${Date.now()}`,
            from: 'orchestrator',
            to: (to as AgentId) || 'broadcast',
            subject: 'DIRECTIVE',
            body: text,
          };
          agentRuntime.sendMessage(newMsg);
          setMessages((prev) => [...prev, newMsg]);
        }}
        onPauseAll={handlePauseAll}
        onStopAll={handleStopAll}
        onNewTask={() => {
          const el = document.querySelector('.mission-textarea') as HTMLTextAreaElement | null;
          if (el) {
            el.focus();
            el.select();
          }
        }}
      />

      {/* Modals & Drawers */}
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

      {showModelConfig && (
        <ModelConfigModal
          currentTopology={topologyMode}
          customAssignments={customAssignments}
          onApplyTopology={handleApplyTopology}
          onClose={() => setShowModelConfig(false)}
        />
      )}

      {activeConflict && (
        <ConflictModal
          conflict={activeConflict}
          onResolve={handleResolveConflict}
          onClose={() => setActiveConflict(undefined)}
        />
      )}

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

      {showReportModal && (
        <MissionReportModal
          reportText={mission?.finalReport}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </div>
  );
};
