export type AgentId = 'orchestrator' | 'design' | 'coder' | 'research' | 'tester';

export type AgentRole = 'Orchestrator' | 'Design Agent' | 'Coder Agent' | 'Research Agent' | 'Test / Review Agent';

export type ModelProvider = 'google' | 'anthropic' | 'openai' | 'meta' | 'perplexity' | 'mistral' | 'local';

export interface AIModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  role: AgentRole;
  agentId: AgentId;
  badge: string;
  color: string;
  glowColor: string;
  actionText: string;
  statusBadgeText: string;
}

export type AgentState =
  | 'IDLE'
  | 'QUEUED'
  | 'STARTING'
  | 'WORKING'
  | 'WAITING'
  | 'BLOCKED'
  | 'REVIEWING'
  | 'COMPLETED'
  | 'FAILED'
  | 'STOPPED';

export interface AgentStatus {
  agentId: AgentId;
  role: AgentRole;
  state: AgentState;
  currentTaskId?: string;
  currentTaskTitle?: string;
  currentAction?: string;
  progress: number; // 0 to 100
  filesTouchedCount: number;
  messagesCount: number;
  startedAt?: number;
  completedAt?: number;
  executionDurationMs: number;
  error?: string;
  isBlocked?: boolean;
  blockedBy?: AgentId[];
  retryCount?: number;
  lastError?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalCost?: number;
  cpuPercent?: number;
  memMb?: number;
}

export type EventTypeFilter = 'ALL' | 'STATUS' | 'MESSAGE' | 'TASK' | 'FILE' | 'ERROR' | 'CONFLICT';

export type TaskStatus = 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'BLOCKED' | 'SKIPPED';

export interface AgentTask {
  id: string;
  missionId: string;
  title: string;
  description: string;
  agentId: AgentId;
  status: TaskStatus;
  dependsOn: string[]; // IDs of tasks that must complete first
  progress: number;
  outputPayload?: unknown;
  error?: string;
  affectedFiles?: string[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export type AgentEventType =
  | 'AGENT_STARTED'
  | 'AGENT_STATUS'
  | 'AGENT_PROGRESS'
  | 'AGENT_LOG'
  | 'AGENT_MESSAGE'
  | 'FILE_CHANGED'
  | 'TASK_CREATED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'TEST_RESULT'
  | 'AGENT_STOPPED'
  | 'CONFLICT_DETECTED'
  | 'CONFLICT_RESOLVED'
  | 'MISSION_UPDATED';

export interface BaseAgentEvent<T = unknown> {
  id: string;
  timestamp: number;
  agentId: AgentId | 'system';
  type: AgentEventType;
  payload: T;
}

export interface AgentStartedPayload {
  taskId: string;
  taskTitle: string;
}

export interface AgentStatusPayload {
  previousState: AgentState;
  newState: AgentState;
  reason?: string;
}

export interface AgentProgressPayload {
  progress: number;
  currentAction: string;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

export interface AgentLogPayload {
  level: LogLevel;
  message: string;
  details?: unknown;
}

export interface AgentMessagePayload {
  id: string;
  from: AgentId;
  to: AgentId | 'broadcast';
  subject: string;
  body: unknown;
  requiresResponse?: boolean;
}

export interface FileChangedPayload {
  filePath: string;
  changeType: 'created' | 'modified' | 'deleted';
  linesAdded: number;
  linesRemoved: number;
  summary: string;
  diffSnippet?: string;
}

export interface TestResultPayload {
  category: 'unit' | 'accessibility' | 'performance' | 'syntax';
  status: 'PASSED' | 'FAILED' | 'NEEDS_REVISION';
  score?: number;
  issues: Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    file?: string;
    line?: number;
    description: string;
    suggestion?: string;
  }>;
  summary: string;
}

export interface ConflictHunk {
  file: string;
  agentA: { agentId: AgentId; lines: string; timestamp: number };
  agentB: { agentId: AgentId; lines: string; timestamp: number };
  startLine: number;
  endLine: number;
}

export interface FileConflictPayload {
  conflictId: string;
  filePath: string;
  hunks: ConflictHunk[];
  detectedAt: number;
  status: 'UNRESOLVED' | 'RESOLVED';
  resolvedChoice?: 'KEEP_A' | 'KEEP_B' | 'MERGE' | 'ORCHESTRATOR';
}

export type AgentEvent =
  | (BaseAgentEvent<AgentStartedPayload> & { type: 'AGENT_STARTED' })
  | (BaseAgentEvent<AgentStatusPayload> & { type: 'AGENT_STATUS' })
  | (BaseAgentEvent<AgentProgressPayload> & { type: 'AGENT_PROGRESS' })
  | (BaseAgentEvent<AgentLogPayload> & { type: 'AGENT_LOG' })
  | (BaseAgentEvent<AgentMessagePayload> & { type: 'AGENT_MESSAGE' })
  | (BaseAgentEvent<FileChangedPayload> & { type: 'FILE_CHANGED' })
  | (BaseAgentEvent<AgentTask> & { type: 'TASK_CREATED' })
  | (BaseAgentEvent<{ task: AgentTask; output: unknown }> & { type: 'TASK_COMPLETED' })
  | (BaseAgentEvent<{ task: AgentTask; error: string }> & { type: 'TASK_FAILED' })
  | (BaseAgentEvent<TestResultPayload> & { type: 'TEST_RESULT' })
  | (BaseAgentEvent<{ reason?: string }> & { type: 'AGENT_STOPPED' })
  | (BaseAgentEvent<FileConflictPayload> & { type: 'CONFLICT_DETECTED' })
  | (BaseAgentEvent<FileConflictPayload> & { type: 'CONFLICT_RESOLVED' })
  | (BaseAgentEvent<Mission> & { type: 'MISSION_UPDATED' });

export type AgentEventListener = (event: AgentEvent) => void;

export interface Mission {
  id: string;
  objective: string;
  status: 'IDLE' | 'ANALYZING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'STOPPED';
  tasks: AgentTask[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  parallelismFactor: number;
  activeAgentsCount: number;
  completedTasksCount: number;
  failedTasksCount: number;
  filesChanged: string[];
  finalReport?: string;
}

export interface GitStatusInfo {
  isGitRepo: boolean;
  currentBranch: string;
  trackingBranch?: string;
  modifiedFiles: string[];
  addedFiles: string[];
  deletedFiles: string[];
  untrackedFiles: string[];
  aheadCount: number;
  behindCount: number;
  recentCommits: Array<{
    hash: string;
    message: string;
    author: string;
    date: string;
  }>;
}

export interface AgentRuntime {
  start(task: AgentTask): Promise<void>;
  stop(agentId: string): Promise<void>;
  pause(agentId: string): Promise<void>;
  sendMessage(message: AgentMessagePayload): Promise<void>;
  getStatus(agentId: string): AgentStatus;
  subscribe(listener: AgentEventListener): () => void;
}

export interface ResearchFinding {
  finding: string;
  recommendation: string;
  confidence: 'high' | 'medium' | 'low';
  affected_area: string;
  sources: string[];
}

export interface DesignSpecification {
  visualHierarchy: string;
  designDecisions: string[];
  colorPalette: {
    primary: string;
    secondary: string;
    background: string;
    accent: string;
  };
  typographyTokens: {
    headingFont: string;
    bodyFont: string;
    monoFont: string;
  };
  affectedFiles: string[];
  implementationNotes: string[];
  remainingConcerns: string[];
}
