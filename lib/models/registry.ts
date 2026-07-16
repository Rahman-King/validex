/**
 * Model Registry
 * Centralized model configuration for all tiers — all via Fireworks API
 * Tier 1: minimax-m3 via Fireworks ($0.15/M)
 * Tier 2: kimi-k2p6 via Fireworks ($0.50/M)
 */

export interface ModelConfig {
  id: string
  label: string
  tier: 1 | 2
  provider: 'fireworks' | 'ollama'
  purpose: string
  inPerM: number // USD per 1M input tokens (0 for local)
  outPerM: number // USD per 1M output tokens (0 for local)
  estimatedLatency: number // Base latency in ms
  maxTokens: number
  capabilities: string[]
  specialization?: 'general' | 'coding' | 'math' | 'reasoning' | 'creative'
}

// Router model configuration (SEPARATE from tier models)
// Executes BEFORE any tier selection for intelligent routing decisions
export const ROUTER_MODEL: ModelConfig = {
  id: "qwen-router",
  label: "qwen-router (Router)",
  tier: 2,
  provider: 'ollama',
  purpose: "Intent Classification, Complexity Estimation, Routing Decision (EXECUTES BEFORE TIER SELECTION). Custom Ollama model built from qwen2.5:0.5b, tuned for JSON-only routing.",
  inPerM: 0,
  outPerM: 0,
  estimatedLatency: 800,
  maxTokens: 4096,
  capabilities: ["routing", "classification", "prediction", "analysis"],
  specialization: 'reasoning',
}

export const MODEL_REGISTRY: Record<1 | 2, ModelConfig[]> = {
  // Tier 1: Cost-effective models via Fireworks — general cloud inference
  1: [
    {
      id: "accounts/fireworks/models/minimax-m3",
      label: "Minimax M3",
      tier: 1,
      provider: 'fireworks',
      purpose: "General-purpose inference: Chat, Summarization, Translation, Extraction, Classification, Lightweight reasoning",
      inPerM: 0.15,
      outPerM: 0.15,
      estimatedLatency: 600,
      maxTokens: 8192,
      capabilities: ["chat", "summarization", "translation", "extraction", "classification", "lightweight-reasoning"],
      specialization: 'general',
    },
    {
      id: "accounts/fireworks/models/llama-v3-8b-instruct",
      label: "Llama 3 8B Instruct",
      tier: 1,
      provider: 'fireworks',
      purpose: "General-purpose inference: Chat, Summarization, Translation, Extraction, Classification",
      inPerM: 0.10,
      outPerM: 0.10,
      estimatedLatency: 500,
      maxTokens: 8192,
      capabilities: ["chat", "summarization", "translation", "extraction", "classification"],
      specialization: 'general',
    },
    {
      id: "accounts/fireworks/models/mistral-7b-instruct-4k",
      label: "Mistral 7B Instruct",
      tier: 1,
      provider: 'fireworks',
      purpose: "General-purpose inference: Chat, Summarization, Translation, Extraction, Classification",
      inPerM: 0.08,
      outPerM: 0.08,
      estimatedLatency: 450,
      maxTokens: 4096,
      capabilities: ["chat", "summarization", "translation", "extraction", "classification"],
      specialization: 'general',
    },
    {
      id: "accounts/fireworks/models/gemma-7b-it",
      label: "Gemma 7B IT",
      tier: 1,
      provider: 'fireworks',
      purpose: "General-purpose inference: Chat, Summarization, Translation, Extraction, Classification",
      inPerM: 0.07,
      outPerM: 0.07,
      estimatedLatency: 400,
      maxTokens: 8192,
      capabilities: ["chat", "summarization", "translation", "extraction", "classification"],
      specialization: 'general',
    },
    {
      id: "accounts/fireworks/models/qwen-7b-chat",
      label: "Qwen 7B Chat",
      tier: 1,
      provider: 'fireworks',
      purpose: "General-purpose inference: Chat, Summarization, Translation, Extraction, Classification",
      inPerM: 0.09,
      outPerM: 0.09,
      estimatedLatency: 480,
      maxTokens: 8192,
      capabilities: ["chat", "summarization", "translation", "extraction", "classification"],
      specialization: 'general',
    },
    {
      id: "accounts/fireworks/models/phi-3-mini-128k-instruct",
      label: "Phi-3 Mini 128K",
      tier: 1,
      provider: 'fireworks',
      purpose: "Long-context tasks: Document analysis, code review, large text processing",
      inPerM: 0.12,
      outPerM: 0.12,
      estimatedLatency: 550,
      maxTokens: 128000,
      capabilities: ["chat", "summarization", "extraction", "long-context", "analysis"],
      specialization: 'general',
    },
  ],
  // Tier 2: High-performance models via Fireworks — heavy reasoning
  2: [
    {
      id: "accounts/fireworks/models/kimi-k2p6",
      label: "Kimi K2P6",
      tier: 2,
      provider: 'fireworks',
      purpose: "Higher-quality reasoning: Complex coding, expert analysis, deep multi-step reasoning",
      inPerM: 0.50,
      outPerM: 1.50,
      estimatedLatency: 1200,
      maxTokens: 16384,
      capabilities: ["reasoning", "coding", "analysis", "complex-tasks"],
      specialization: 'general',
    },
    {
      id: "accounts/fireworks/models/llama-v3-70b-instruct",
      label: "Llama 3 70B Instruct",
      tier: 2,
      provider: 'fireworks',
      purpose: "High-quality reasoning: Complex coding, expert analysis, deep multi-step reasoning",
      inPerM: 0.70,
      outPerM: 0.70,
      estimatedLatency: 1500,
      maxTokens: 8192,
      capabilities: ["reasoning", "coding", "analysis", "complex-tasks"],
      specialization: 'general',
    },
    {
      id: "accounts/fireworks/models/mixtral-8x7b-instruct",
      label: "Mixtral 8x7B Instruct",
      tier: 2,
      provider: 'fireworks',
      purpose: "High-quality reasoning: Complex coding, expert analysis, multi-task processing",
      inPerM: 0.40,
      outPerM: 0.40,
      estimatedLatency: 1000,
      maxTokens: 32768,
      capabilities: ["reasoning", "coding", "analysis", "complex-tasks"],
      specialization: 'general',
    },
    {
      id: "accounts/fireworks/models/deepseek-ai/deepseek-r1",
      label: "DeepSeek R1",
      tier: 2,
      provider: 'fireworks',
      purpose: "Advanced reasoning: Mathematical reasoning, complex problem solving, research",
      inPerM: 0.60,
      outPerM: 0.60,
      estimatedLatency: 1300,
      maxTokens: 64000,
      capabilities: ["reasoning", "math", "research", "complex-tasks"],
      specialization: 'reasoning',
    },
    {
      id: "accounts/fireworks/models/qwen-72b-chat",
      label: "Qwen 72B Chat",
      tier: 2,
      provider: 'fireworks',
      purpose: "High-quality reasoning: Complex coding, expert analysis, deep multi-step reasoning",
      inPerM: 0.65,
      outPerM: 0.65,
      estimatedLatency: 1400,
      maxTokens: 32768,
      capabilities: ["reasoning", "coding", "analysis", "complex-tasks"],
      specialization: 'general',
    },
    {
      id: "accounts/fireworks/models/codestral-22b-v0.1",
      label: "Codestral 22B",
      tier: 2,
      provider: 'fireworks',
      purpose: "Specialized coding: Code generation, debugging, code review, technical documentation",
      inPerM: 0.35,
      outPerM: 0.35,
      estimatedLatency: 900,
      maxTokens: 32768,
      capabilities: ["coding", "debugging", "code-review", "technical-writing"],
      specialization: 'coding',
    },
    {
      id: "accounts/fireworks/models/gemma-2-27b-it",
      label: "Gemma 2 27B IT",
      tier: 2,
      provider: 'fireworks',
      purpose: "High-quality reasoning: Complex tasks, analysis, multi-step reasoning",
      inPerM: 0.45,
      outPerM: 0.45,
      estimatedLatency: 1100,
      maxTokens: 8192,
      capabilities: ["reasoning", "analysis", "complex-tasks"],
      specialization: 'general',
    },
  ],
}

/**
 * Get active model registry dynamically mapping ALLOWED_MODELS to avoid violations
 * Now supports unlimited Fireworks models from environment variable
 */
export function getActiveRegistry(): Record<1 | 2, ModelConfig[]> {
  const allowed = typeof process !== 'undefined' && process.env.ALLOWED_MODELS
    ? process.env.ALLOWED_MODELS.split(',').map(m => m.trim()).filter(Boolean)
    : []
  
  if (allowed.length === 0) return MODEL_REGISTRY

  // Dynamic mapping - use all allowed models intelligently
  // Sort by model name length as heuristic for parameter count (shorter = smaller = cheaper)
  const sortedModels = [...allowed].sort((a, b) => a.length - b.length)

  // Tier 1: Use smallest/cheapest models for simple tasks
  const tier1Models = sortedModels.slice(0, Math.max(1, Math.floor(sortedModels.length / 2)))
  
  // Tier 2: Use larger models for complex reasoning
  const tier2Models = sortedModels.slice(Math.max(1, Math.floor(sortedModels.length / 2)))

  // Create model configs for Tier 1
  const tier1Configs: ModelConfig[] = tier1Models.map((id, index) => ({
    id,
    label: `Fireworks Model ${index + 1}`,
    tier: 1,
    provider: 'fireworks',
    purpose: "General-purpose inference: Chat, Summarization, Translation, Extraction, Classification, Lightweight reasoning",
    inPerM: 0.15, // Default cost estimate
    outPerM: 0.15,
    estimatedLatency: 600,
    maxTokens: 8192,
    capabilities: ["chat", "summarization", "translation", "extraction", "classification", "lightweight-reasoning"],
    specialization: 'general',
  }))

  // Create model configs for Tier 2
  const tier2Configs: ModelConfig[] = tier2Models.map((id, index) => ({
    id,
    label: `Fireworks Model ${tier1Models.length + index + 1}`,
    tier: 2,
    provider: 'fireworks',
    purpose: "Higher-quality reasoning: Complex coding, expert analysis, deep multi-step reasoning",
    inPerM: 0.50, // Default cost estimate
    outPerM: 1.50,
    estimatedLatency: 1200,
    maxTokens: 16384,
    capabilities: ["reasoning", "coding", "analysis", "complex-tasks"],
    specialization: 'general',
  }))

  return {
    1: tier1Configs.length > 0 ? tier1Configs : MODEL_REGISTRY[1],
    2: tier2Configs.length > 0 ? tier2Configs : MODEL_REGISTRY[2],
  }
}

/**
 * Get model configuration by tier (returns first model)
 */
export function getModelByTier(tier: 1 | 2): ModelConfig {
  return getActiveRegistry()[tier][0]
}

/**
 * Get all models for a tier
 */
export function getModelsByTier(tier: 1 | 2): ModelConfig[] {
  return getActiveRegistry()[tier]
}

/**
 * Get best model for tier based on specialization
 */
export function getBestModelForTier(tier: 1 | 2, specialization?: 'general' | 'coding' | 'math' | 'reasoning' | 'creative'): ModelConfig {
  const models = getActiveRegistry()[tier]
  if (!specialization) {
    return models[0]
  }
  const specializedModel = models.find(m => m.specialization === specialization)
  if (specializedModel) {
    return specializedModel
  }
  return models.reduce((cheapest, model) =>
    (model.inPerM + model.outPerM) < (cheapest.inPerM + cheapest.outPerM) ? model : cheapest
  )
}

/**
 * Get model configuration by ID
 */
export function getModelById(id: string): ModelConfig | undefined {
  return Object.values(getActiveRegistry()).flat().find(model => model.id === id)
}

/**
 * Get all models
 */
export function getAllModels(): ModelConfig[] {
  return Object.values(getActiveRegistry()).flat()
}

/**
 * Validate model ID is from registry
 */
export function isValidModelId(id: string): boolean {
  return Object.values(getActiveRegistry()).flat().some(model => model.id === id)
}

/**
 * Calculate estimated cost for tokens
 */
export function estimateCost(tier: 1 | 2, inputTokens: number, outputTokens: number, specialization?: 'general' | 'coding' | 'math' | 'reasoning' | 'creative'): number {
  const model = getBestModelForTier(tier, specialization)
  const inputCost = (inputTokens / 1_000_000) * model.inPerM
  const outputCost = (outputTokens / 1_000_000) * model.outPerM
  return inputCost + outputCost
}

/**
 * Calculate estimated latency
 */
export function estimateLatency(tier: 1 | 2, totalTokens: number, specialization?: 'general' | 'coding' | 'math' | 'reasoning' | 'creative'): number {
  const model = getBestModelForTier(tier, specialization)
  const tokenLatency = (totalTokens / 1000) * 100
  return model.estimatedLatency + tokenLatency
}
