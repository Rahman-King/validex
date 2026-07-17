/**
 * Deterministic Routing Fallback
 * Pure regex/heuristic routing — zero latency, zero cost, zero dependencies.
 * Used when QwenRouter (Ollama) is unavailable or times out.
 * Now includes model selection based on task specializations.
 */

export interface RouterDecision {
  intent: string
  complexity: number       // 0-100
  confidence: number       // 0-100
  predictedTokens: { input: number; output: number; total: number }
  predictedCost: number
  predictedLatency: number
  economyScore: number     // 0-100
  selectedTier: 1 | 2
  selectedModel: string     // Model ID based on specialization
  skippedTiers: number[]
  explanation: string
  reasoning: string
}

/**
 * Estimate token usage for a given prompt and tier.
 */
export function estimateTokens(
  prompt: string,
  tier: number,
): { input: number; output: number; total: number } {
  const inputTokens = Math.ceil(prompt.length / 4)
  const outputMultipliers: Record<number, number> = { 1: 1.2, 2: 2.0, 3: 3.0 }
  const mult = outputMultipliers[tier] ?? 2.0
  const outputTokens = Math.ceil(inputTokens * mult)
  return { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens }
}

/**
 * Estimate monetary cost for a tier + token count.
 * Tier 1 = $0.15/M (Fireworks), Tier 2 = $0.50/M (Fireworks)
 */
export function estimateCost(totalTokens: number, tier: number): number {
  const costPerMillion: Record<number, number> = { 1: 0.15, 2: 0.50 }
  const rate = costPerMillion[tier] ?? 0.15
  return (totalTokens / 1_000_000) * rate
}

/**
 * Estimate latency (ms) for a tier + token count.
 */
export function estimateLatency(totalTokens: number, tier: number): number {
  const baseLatency: Record<number, number> = { 1: 600, 2: 1200 }
  const base = baseLatency[tier] ?? 600
  return base + (totalTokens / 1000) * 80
}

/**
 * Calculate economy score (higher = more economical).
 */
export function calculateEconomyScore(
  predictedCost: number,
  predictedLatency: number,
  selectedTier: number,
): number {
  const costScore = Math.max(0, 100 - predictedCost * 1000)
  const latencyScore = Math.max(0, 100 - predictedLatency / 50)
  const tierScore = (4 - selectedTier) * 20
  return Math.round((costScore + latencyScore + tierScore) / 3)
}

/**
 * Pure heuristic routing — called when Qwen is unavailable.
 * Returns a RouterDecision with confidence capped at 72 to signal uncertainty.
 * Now includes model selection based on task type.
 */
export function deterministicFallback(
  prompt: string,
  category?: string,
): RouterDecision {
  const lower = prompt.toLowerCase()
  const len = prompt.length

  let selectedTier: 1 | 2 = 1
  let intent = 'general'
  let complexity = 15
  let confidence = 65 // capped — we're not sure
  let selectedModel = 'accounts/fireworks/models/minimax-m3' // default

  // Task type detection for model selection
  const isCoding = /(large repo|refactor|architect|codebase|monorepo|microservice|design pattern|system design|code|function|class|bug|debug|api|typescript|python|javascript|react|sql|regex|compile|algorithm)/i.test(lower)
  const isMath = /(math|calculate|equation|formula|solve|compute|integral|derivative|algebra|geometry|statistics|probability)/i.test(lower)
  const isCreative = /(write|story|poem|creative|imagine|fiction|narrative|tale)/i.test(lower)
  const isSentiment = /(sentiment|emotion|feeling|mood|attitude|opinion|review)/i.test(lower)
  const isExtraction = /(extract|parse|identify|recognize|entity|information|data)/i.test(lower)
  const isLongContext = len > 1000 || /(document|article|paper|report|long text|large content)/i.test(lower)

  // Tier 2: expert coding tasks / complex reasoning
  if (isCoding) {
    selectedTier = 2
    intent = 'coding'
    complexity = 75
    confidence = 72
    selectedModel = 'accounts/fireworks/models/codestral-22b-v0.1' // Coding specialist
  } else if (isMath) {
    selectedTier = 2
    intent = 'math'
    complexity = 80
    confidence = 72
    selectedModel = 'accounts/fireworks/models/deepseek-ai/deepseek-r1' // Math specialist
  } else if (
    /(explain|why|analyze|strategy|reason|compare|plan|design|evaluate|critique)/i.test(lower) ||
    len > 300
  ) {
    selectedTier = 2
    intent = 'reasoning'
    complexity = 55
    confidence = 70
    selectedModel = 'accounts/fireworks/models/kimi-k2p6' // Complex reasoning specialist
  }
  // Tier 1: specialized tasks
  else if (isCreative) {
    selectedTier = 1
    intent = 'creative'
    complexity = 35
    confidence = 68
    selectedModel = 'accounts/fireworks/models/qwen-7b-chat' // Creative writing specialist
  } else if (isSentiment) {
    selectedTier = 1
    intent = 'sentiment'
    complexity = 25
    confidence = 68
    selectedModel = 'accounts/fireworks/models/gemma-7b-it' // Sentiment analysis specialist
  } else if (isExtraction) {
    selectedTier = 1
    intent = 'extraction'
    complexity = 30
    confidence = 68
    selectedModel = 'accounts/fireworks/models/mistral-7b-instruct-4k' // Extraction specialist
  } else if (isLongContext) {
    selectedTier = 1
    intent = 'long-context'
    complexity = 40
    confidence = 68
    selectedModel = 'accounts/fireworks/models/phi-3-mini-128k-instruct' // Long-context specialist
  }
  // Tier 1: simple tasks — everything else (greetings, basic questions, short queries)
  else {
    selectedTier = 1
    intent = category || 'general'
    complexity = 18
    confidence = 65
    selectedModel = 'accounts/fireworks/models/llama-v3-8b-instruct' // General purpose
  }

  const predictedTokens = estimateTokens(prompt, selectedTier)
  const predictedCost = estimateCost(predictedTokens.total, selectedTier)
  const predictedLatency = estimateLatency(predictedTokens.total, selectedTier)
  const skippedTiers = Array.from({ length: selectedTier - 1 }, (_, i) => i + 1)

  return {
    intent,
    complexity,
    confidence,
    predictedTokens,
    predictedCost,
    predictedLatency,
    economyScore: calculateEconomyScore(predictedCost, predictedLatency, selectedTier),
    selectedTier,
    selectedModel,
    skippedTiers,
    explanation: `Heuristic fallback → Tier ${selectedTier} (${intent}, complexity ${complexity}/100) → ${selectedModel}`,
    reasoning: 'Deterministic fallback: Qwen router unavailable',
  }
}
