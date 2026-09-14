import { AIModelConfig, AgentId } from '../types';

export interface DetailedAIModel extends AIModelConfig {
  contextWindow?: string;
  latency?: string;
  architecture?: string;
  providerLabel: string;
  description: string;
  routingRationale: string;
}

export const ROLE_COLORS: Record<AgentId, string> = {
  orchestrator: '#38bdf8', // Electric Cyan
  design: '#c084fc',       // Neon Violet
  coder: '#34d399',        // Emerald
  research: '#fb923c',     // Amber Coral
  tester: '#f43f5e',       // Rose Crimson
};

export const ROLE_GLOWS: Record<AgentId, string> = {
  orchestrator: 'rgba(56, 189, 248, 0.5)',
  design: 'rgba(192, 132, 252, 0.5)',
  coder: 'rgba(52, 211, 153, 0.5)',
  research: 'rgba(251, 146, 60, 0.5)',
  tester: 'rgba(244, 63, 94, 0.5)',
};

export const getRoleColor = (agentId: AgentId): string => ROLE_COLORS[agentId] || '#38bdf8';
export const getRoleGlow = (agentId: AgentId): string => ROLE_GLOWS[agentId] || 'rgba(56, 189, 248, 0.4)';

export const MODEL_PRICING: Record<string, { promptPer1M: number; completionPer1M: number }> = {
  'gemini-1.5-pro': { promptPer1M: 0.0, completionPer1M: 0.0 }, // Included with Antigravity Subscription
  'gemini-1.5-flash': { promptPer1M: 0.0, completionPer1M: 0.0 },
  'claude-3.5-sonnet': { promptPer1M: 3.0, completionPer1M: 15.0 },
  'claude-3.5-haiku': { promptPer1M: 0.8, completionPer1M: 4.0 },
  'gpt-4o': { promptPer1M: 2.5, completionPer1M: 10.0 },
  'gpt-4o-mini': { promptPer1M: 0.15, completionPer1M: 0.6 },
  'perplexity-sonar': { promptPer1M: 1.0, completionPer1M: 1.0 },
  'llama-3.1-70b': { promptPer1M: 0.8, completionPer1M: 0.8 },
  'llama-3.3-70b': { promptPer1M: 0.0, completionPer1M: 0.0 }, // Local
  'ollama-deepseek': { promptPer1M: 0.0, completionPer1M: 0.0 }, // Local
  'qwen-2.5-coder': { promptPer1M: 0.0, completionPer1M: 0.0 }, // Local
  'mistral-large': { promptPer1M: 2.0, completionPer1M: 6.0 },
};

export const calculateTokenCost = (modelId: string, promptTokens: number, completionTokens: number): number => {
  const rates = MODEL_PRICING[modelId] || { promptPer1M: 1.0, completionPer1M: 3.0 };
  const cost = (promptTokens / 1_000_000) * rates.promptPer1M + (completionTokens / 1_000_000) * rates.completionPer1M;
  return Math.round(cost * 10000) / 10000;
};

export interface ModelCostBreakdown {
  agentId: AgentId;
  modelId: string;
  modelName: string;
  providerLabel: string;
  role: string;
  tokens: number;
  cost: number;
  percentage: number;
  isSubscriptionNative?: boolean;
}

export const getSessionCostBreakdown = (
  assignments: Partial<Record<AgentId, string>>,
  retryWastedTokens: number = 1400
): {
  items: ModelCostBreakdown[];
  totalCost: number;
  totalTokens: number;
  retryWastedCost: number;
} => {
  const defaultAssignments: Record<AgentId, string> = {
    orchestrator: 'gemini-1.5-pro',
    design: 'claude-3.5-sonnet',
    coder: 'gpt-4o',
    research: 'perplexity-sonar',
    tester: 'llama-3.1-70b',
  };

  const activeAssignments = { ...defaultAssignments, ...assignments };

  const agentTokenEstimates: Record<AgentId, { prompt: number; completion: number }> = {
    orchestrator: { prompt: 42000, completion: 6200 },
    design: { prompt: 14500, completion: 3900 },
    coder: { prompt: 24000, completion: 8100 },
    research: { prompt: 12200, completion: 2600 },
    tester: { prompt: 9800, completion: 2200 },
  };

  const retryCost = (retryWastedTokens / 1_000_000) * 2.5;

  const items: ModelCostBreakdown[] = (Object.keys(activeAssignments) as AgentId[]).map((agentId) => {
    const modelId = activeAssignments[agentId];
    const model = ALL_SUPPORTED_MODELS.find((m) => m.id === modelId) || ALL_SUPPORTED_MODELS[0];
    const toks = agentTokenEstimates[agentId];
    const totalToks = toks.prompt + toks.completion;
    const cost = calculateTokenCost(modelId, toks.prompt, toks.completion);

    return {
      agentId,
      modelId,
      modelName: model.name,
      providerLabel: model.providerLabel,
      role: model.role,
      tokens: totalToks,
      cost,
      percentage: 0,
      isSubscriptionNative: model.provider === 'google' || model.provider === 'local',
    };
  });

  const totalCost = items.reduce((acc, curr) => acc + curr.cost, 0);
  const totalTokens = items.reduce((acc, curr) => acc + curr.tokens, 0) + retryWastedTokens;

  items.forEach((item) => {
    item.percentage = totalCost > 0 ? Math.round((item.cost / totalCost) * 100) : 0;
  });

  return {
    items,
    totalCost: Math.round(totalCost * 100) / 100,
    totalTokens,
    retryWastedCost: Math.round(retryCost * 1000) / 1000,
  };
};

export const ALL_SUPPORTED_MODELS: DetailedAIModel[] = [
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    role: 'Orchestrator',
    agentId: 'orchestrator',
    badge: 'Orchestrator',
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    actionText: 'Planning • Coordinating agents',
    statusBadgeText: 'Task Decomposed • 4 subtasks created',
    contextWindow: '2,000,000 tokens',
    latency: '~420ms',
    architecture: 'Multimodal MoE',
    providerLabel: 'Google Antigravity Native',
    description: 'Ultra-long context window ideal for orchestrating complex codebases without external API keys.',
    routingRationale: '2M context window fits the entire project repository in-memory for zero-loss DAG dependency planning.',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    role: 'Research Agent',
    agentId: 'research',
    badge: 'Fast Reasoning',
    color: '#60a5fa',
    glowColor: 'rgba(96, 165, 250, 0.45)',
    actionText: 'Ultra-fast semantic search & synthesis',
    statusBadgeText: 'Rapid Ingestion',
    contextWindow: '1,000,000 tokens',
    latency: '~180ms',
    architecture: 'Distilled Multimodal',
    providerLabel: 'Google Antigravity Native',
    description: 'Sub-200ms latency model for immediate file verification and live parsing.',
    routingRationale: 'Sub-200ms latency delivers near-instant documentation parsing and AST scanning.',
  },
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    role: 'Design Agent',
    agentId: 'design',
    badge: 'Design & UX',
    color: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.45)',
    actionText: 'UI/UX Analysis • Designing new layout...',
    statusBadgeText: 'Wireframe & Token Audit',
    contextWindow: '200,000 tokens',
    latency: '~650ms',
    architecture: 'Dense Transformer',
    providerLabel: 'Anthropic',
    description: 'State-of-the-art visual and design reasoning with nuanced frontend token awareness.',
    routingRationale: 'Frontier visual reasoning and spatial comprehension for precise CSS token hierarchies and UI wireframes.',
  },
  {
    id: 'claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    role: 'Test / Review Agent',
    agentId: 'tester',
    badge: 'Fast Review',
    color: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    actionText: 'Lint & Regression Unit Check',
    statusBadgeText: 'Snappy Verification',
    contextWindow: '200,000 tokens',
    latency: '~210ms',
    architecture: 'Compact Dense',
    providerLabel: 'Anthropic',
    description: 'Blazing fast test runner with exceptional code safety and syntax validation.',
    routingRationale: 'High-speed syntax consistency and deterministic validation with minimal latency.',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    role: 'Coder Agent',
    agentId: 'coder',
    badge: 'Backend & Code',
    color: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.45)',
    actionText: 'Implementing Features • Editing 6 files...',
    statusBadgeText: 'Active Refactoring Pass',
    contextWindow: '128,000 tokens',
    latency: '~520ms',
    architecture: 'Omni-Transformer',
    providerLabel: 'OpenAI',
    description: 'Comprehensive code generation, AST transformations, and multi-file refactoring engine.',
    routingRationale: 'Superior instruction-following on multi-file refactoring and non-destructive AST modifications.',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    role: 'Research Agent',
    agentId: 'research',
    badge: 'Lightweight Code',
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    actionText: 'Dependency & API Check',
    statusBadgeText: 'Rapid Scan',
    contextWindow: '128,000 tokens',
    latency: '~240ms',
    architecture: 'Dense Transformer',
    providerLabel: 'OpenAI',
    description: 'Cost-effective high-throughput model for auxiliary documentation and dependency queries.',
    routingRationale: 'Low-cost rapid lookup for dependency versioning and lightweight AST lookups.',
  },
  {
    id: 'perplexity-sonar',
    name: 'Perplexity Sonar',
    provider: 'perplexity',
    role: 'Research Agent',
    agentId: 'research',
    badge: 'Research',
    color: '#fb923c',
    glowColor: 'rgba(251, 146, 60, 0.45)',
    actionText: 'Researching best practices • Found 12 relevant sources',
    statusBadgeText: 'Deep Benchmark Scan',
    contextWindow: '128,000 tokens',
    latency: '~480ms',
    architecture: 'Online Search Augmentation',
    providerLabel: 'Perplexity AI',
    description: 'Live real-time citation retrieval and up-to-date framework documentation cross-referencing.',
    routingRationale: 'Integrated web search augmentation pulls live framework documentation and external benchmark citations.',
  },
  {
    id: 'llama-3.1-70b',
    name: 'Llama 3.1 70B',
    provider: 'meta',
    role: 'Test / Review Agent',
    agentId: 'tester',
    badge: 'Testing & Review',
    color: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.45)',
    actionText: 'Test suite in progress • 14/37 tests passed',
    statusBadgeText: 'WCAG AAA & Regression Guard',
    contextWindow: '128,000 tokens',
    latency: '~580ms',
    architecture: 'Open Weights Llama 3',
    providerLabel: 'Meta AI / Local',
    description: 'Excellence in rigorous deterministic evaluation, boundary testing, and adversarial fuzzing.',
    routingRationale: 'Independent open-weights model eliminates evaluation bias when validating peer agent outputs.',
  },
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B',
    provider: 'meta',
    role: 'Orchestrator',
    agentId: 'orchestrator',
    badge: 'Open Orchestrator',
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.45)',
    actionText: 'Autonomous Step Dispatcher',
    statusBadgeText: 'DAG Resolution',
    contextWindow: '128,000 tokens',
    latency: '~540ms',
    architecture: 'Grouped-Query Attention',
    providerLabel: 'Meta AI / Local',
    description: 'Flagship open model with frontier reasoning capabilities for mission graph management.',
    routingRationale: 'Frontier open-weights reasoning for completely local airgapped swarm task decomposition.',
  },
  {
    id: 'ollama-deepseek',
    name: 'DeepSeek R1 (Local)',
    provider: 'local',
    role: 'Coder Agent',
    agentId: 'coder',
    badge: 'Local Reasoning',
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    actionText: 'Offline Local Inference via Ollama',
    statusBadgeText: 'Zero-API-Key Local',
    contextWindow: '64,000 tokens',
    latency: '~680ms',
    architecture: 'DeepSeek Sparse MoE',
    providerLabel: 'Local Offline Engine',
    description: 'Open-weights reasoning powerhouse running fully locally with 0 telemetry or external keys.',
    routingRationale: 'Deep chain-of-thought code synthesis running 100% locally with zero cloud API keys or telemetry.',
  },
  {
    id: 'qwen-2.5-coder',
    name: 'Qwen 2.5 Coder 32B',
    provider: 'local',
    role: 'Coder Agent',
    agentId: 'coder',
    badge: 'Local Coder',
    color: '#14b8a6',
    glowColor: 'rgba(20, 184, 166, 0.4)',
    actionText: 'Local Code Synthesis Pass',
    statusBadgeText: 'Offline Guard',
    contextWindow: '128,000 tokens',
    latency: '~380ms',
    architecture: 'RoPE Attention',
    providerLabel: 'Local Offline Engine',
    description: 'Specialized coding model tailored for multi-language syntax correctness and safe diffs.',
    routingRationale: 'Specialized code completion model tuned for TypeScript type-safety and syntax diff accuracy.',
  },
  {
    id: 'mistral-large',
    name: 'Mistral Large 2',
    provider: 'mistral',
    role: 'Design Agent',
    agentId: 'design',
    badge: 'Logic & Code',
    color: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    actionText: 'Synthesizing module AST...',
    statusBadgeText: 'Standby',
    contextWindow: '128,000 tokens',
    latency: '~440ms',
    architecture: 'European Frontier MoE',
    providerLabel: 'Mistral AI',
    description: 'High-precision European AI model specialized in deterministic reasoning and clean architecture.',
    routingRationale: 'European sovereign model offering high architectural precision and clean semantic separation.',
  },
];

export const AVAILABLE_MODELS: AIModelConfig[] = ALL_SUPPORTED_MODELS.slice(0, 5);

export type ModelTopologyMode = 'multi-provider' | 'all-gemini' | 'all-claude' | 'all-local' | 'custom';

export interface TopologyPreset {
  name: string;
  tag: string;
  badge: string;
  description: string;
  assignments: Record<AgentId, string>;
}

export const TOPOLOGY_PRESETS: Record<ModelTopologyMode, TopologyPreset> = {
  'multi-provider': {
    name: 'Multi-Model Swarm (Different Providers)',
    tag: 'Different Providers',
    badge: 'Cross-Ecosystem',
    description: 'Gemini 1.5 Pro (Orchestrator) + Claude 3.5 Sonnet (Design) + GPT-4o (Coder) + Perplexity Sonar (Research) + Llama 3.1 70B (Tester)',
    assignments: {
      orchestrator: 'gemini-1.5-pro',
      design: 'claude-3.5-sonnet',
      coder: 'gpt-4o',
      research: 'perplexity-sonar',
      tester: 'llama-3.1-70b',
    },
  },
  'all-gemini': {
    name: 'Unified Gemini Swarm (Same Model / Provider)',
    tag: 'Same Model (Gemini)',
    badge: 'Antigravity Native',
    description: '100% Google Gemini 1.5 Pro across all agents using your active Antigravity subscription without any external API keys',
    assignments: {
      orchestrator: 'gemini-1.5-pro',
      design: 'gemini-1.5-pro',
      coder: 'gemini-1.5-pro',
      research: 'gemini-1.5-flash',
      tester: 'gemini-1.5-pro',
    },
  },
  'all-local': {
    name: 'Local Offline Swarm (Open Weights / Privacy)',
    tag: 'All Local (Ollama)',
    badge: 'Offline Airgapped',
    description: 'Zero external cloud requests: DeepSeek R1, Qwen 2.5 Coder, and Llama 3.1 running locally through Ollama / Antigravity Local',
    assignments: {
      orchestrator: 'llama-3.3-70b',
      design: 'llama-3.1-70b',
      coder: 'ollama-deepseek',
      research: 'qwen-2.5-coder',
      tester: 'llama-3.1-70b',
    },
  },
  'all-claude': {
    name: 'Unified Claude Swarm (Same Model / Provider)',
    tag: 'Same Model (Claude)',
    badge: 'Anthropic Swarm',
    description: 'Claude 3.5 Sonnet & Haiku across all 5 roles for state-of-the-art vision, reasoning, and code quality',
    assignments: {
      orchestrator: 'claude-3.5-sonnet',
      design: 'claude-3.5-sonnet',
      coder: 'claude-3.5-sonnet',
      research: 'claude-3.5-sonnet',
      tester: 'claude-3.5-haiku',
    },
  },
  'custom': {
    name: 'Custom Multi-Model Matrix',
    tag: 'Custom Matrix',
    badge: 'User Configured',
    description: 'Individually tailor each role to any supported model or provider for your specific requirements',
    assignments: {
      orchestrator: 'gemini-1.5-pro',
      design: 'claude-3.5-sonnet',
      coder: 'ollama-deepseek',
      research: 'perplexity-sonar',
      tester: 'llama-3.1-70b',
    },
  },
};
