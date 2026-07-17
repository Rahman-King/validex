/**
 * QwenRouter — Ollama-powered routing intelligence
 * -------------------------------------------------------
 * Uses "qwen-router" via Ollama to classify every request
 * and select the appropriate response tier (1 / 2).
 *
 * "qwen-router" is a custom Ollama model built FROM
 * qwen2.5:0.5b via a local Modelfile, tuned specifically
 * for JSON-only routing decisions (small context, low output,
 * greedy decoding). Build it with:
 *   ollama create qwen-router -f Modelfile
 *
 * Hard timeout: 4 s.  Falls back to deterministicFallback() silently.
 * Enable live routing: set OLLAMA_ROUTER=true in .env
 *
 * IMPORTANT: This module NEVER generates user-facing responses.
 *            Output is always a compact JSON object only.
 */

import type { RouterDecision } from './deterministic-fallback'
import { deterministicFallback, estimateTokens, estimateCost, estimateLatency, calculateEconomyScore } from './deterministic-fallback'

import { ollama } from "ai-sdk-ollama"
import { generateText } from "ai"

// Custom Ollama model (built from qwen2.5:0.5b) — the routing model
const ROUTER_MODEL_ID = "qwen-router"
const ROUTER_TIMEOUT  = parseInt(process.env.OLLAMA_ROUTER_TIMEOUT_MS || '1500', 10)
// Enabled by default — set OLLAMA_ROUTER=false to use only deterministic fallback
const ROUTER_ENABLED  = process.env.OLLAMA_ROUTER !== 'false'

// ── System prompt ──────────────────────────────────────────────────────────
const ROUTER_SYSTEM_PROMPT = `You are RouteMind Router. Analyse the request and output ONLY valid JSON, nothing else.

Tiers:
1 = MiniMax cloud (general chat, summarisation, rewriting, translation, extraction, simple Q&A, factual lookup). complexity 0-50.
2 = Kimi cloud (complex reasoning, multi-step math, long-context, multi-doc analysis, coding, algorithms, data-structures, debugging, refactoring). complexity 45-100

JSON schema (no extra keys, no prose):
{"i":"intent","c":complexity_0_100,"f":confidence_0_100,"s":tier_1_or_2,"r":"reason max 8 words"}`

// ── User prompt — also as compact as possible ─────────────────────────────
function buildUserPrompt(prompt: string, category?: string): string {
  const snippet = prompt.length > 150 ? prompt.slice(0, 150) + '…' : prompt
  let p = `Request: "${snippet}"`
  if (category) p += `\nHint: ${category}`
  return p
}

// ── Parse Qwen's simplified response ───────────────────────────────────────
// Now outputs plain text "tier 1" or "tier 2" instead of JSON
function parseQwenResponse(raw: string, originalPrompt: string): RouterDecision {
  const normalized = raw.toLowerCase().trim()
  let selectedTier: 1 | 2 = 1
  let intent = 'general'
  let complexity = 30
  let confidence = 75
  let selectedModel = 'accounts/fireworks/models/minimax-m3' // default

  const lower = originalPrompt.toLowerCase()
  const len = originalPrompt.length

  // Task type detection for model selection
  const isCoding = /(large repo|refactor|architect|codebase|monorepo|microservice|design pattern|system design|code|function|class|bug|debug|api|typescript|python|javascript|react|sql|regex|compile|algorithm)/i.test(lower)
  const isMath = /(math|calculate|equation|formula|solve|compute|integral|derivative|algebra|geometry|statistics|probability)/i.test(lower)
  const isCreative = /(write|story|poem|creative|imagine|fiction|narrative|tale)/i.test(lower)
  const isSentiment = /(sentiment|emotion|feeling|mood|attitude|opinion|review)/i.test(lower)
  const isExtraction = /(extract|parse|identify|recognize|entity|information|data)/i.test(lower)
  const isLongContext = len > 1000 || /(document|article|paper|report|long text|large content)/i.test(lower)

  if (normalized.includes('tier 2') || normalized.includes('tier2')) {
    selectedTier = 2
    intent = 'complex'
    complexity = 70
    confidence = 85
    
    // Select specialized Tier 2 model
    if (isCoding) {
      selectedModel = 'accounts/fireworks/models/codestral-22b-v0.1'
      intent = 'coding'
    } else if (isMath) {
      selectedModel = 'accounts/fireworks/models/deepseek-ai/deepseek-r1'
      intent = 'math'
    } else {
      selectedModel = 'accounts/fireworks/models/kimi-k2p6'
    }
  } else if (normalized.includes('tier 1') || normalized.includes('tier1')) {
    selectedTier = 1
    intent = 'general'
    complexity = 25
    confidence = 80
    
    // Select specialized Tier 1 model
    if (isCreative) {
      selectedModel = 'accounts/fireworks/models/qwen-7b-chat'
      intent = 'creative'
    } else if (isSentiment) {
      selectedModel = 'accounts/fireworks/models/gemma-7b-it'
      intent = 'sentiment'
    } else if (isExtraction) {
      selectedModel = 'accounts/fireworks/models/mistral-7b-instruct-4k'
      intent = 'extraction'
    } else if (isLongContext) {
      selectedModel = 'accounts/fireworks/models/phi-3-mini-128k-instruct'
      intent = 'long-context'
    } else {
      selectedModel = 'accounts/fireworks/models/llama-v3-8b-instruct'
    }
  } else {
    // Fallback if output doesn't match expected format
    console.warn('[QwenRouter] Unexpected output format, defaulting to Tier 1')
    selectedModel = 'accounts/fireworks/models/llama-v3-8b-instruct'
  }

  const predictedTokens  = estimateTokens(originalPrompt, selectedTier)
  const predictedCost    = estimateCost(predictedTokens.total, selectedTier)
  const predictedLatency = estimateLatency(predictedTokens.total, selectedTier)
  const skippedTiers     = Array.from({ length: selectedTier - 1 }, (_, i) => i + 1)

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
    explanation: `qwen-router (Ollama) → Tier ${selectedTier} → ${selectedModel}`,
    reasoning: `Direct tier selection from qwen-router with model specialization`,
  }
}

// ── Main export ───────────────────────────────────────────────────────────
export class QwenRouter {
  /**
   * Classify the prompt and return a RouterDecision.
   * Falls back to deterministicFallback() if Qwen is unavailable or disabled.
   */
  async route(
    prompt: string,
    context?: { category?: string; previousTiers?: number[] },
  ): Promise<RouterDecision> {
    if (!ROUTER_ENABLED) {
      return deterministicFallback(prompt, context?.category)
    }

    try {
      const controller = new AbortController()
      const timeoutId  = setTimeout(() => controller.abort(), ROUTER_TIMEOUT)

      // No `system` override here — qwen-router's Modelfile already bakes in
      // the routing system prompt. temperature/maxOutputTokens match the
      // Modelfile's PARAMETER directives (temperature 0.1, num_predict 1024) so
      // decoding behavior stays consistent between the Modelfile and the call.
      const result = await generateText({
        model: ollama(ROUTER_MODEL_ID),
        prompt: buildUserPrompt(prompt, context?.category),
        temperature: 0.1,
        maxOutputTokens: 1024,
        abortSignal: controller.signal,
      })

      clearTimeout(timeoutId)
      const text = result.text

      console.log('[QwenRouter] Raw response:', text)

      if (!text.trim()) {
        console.warn('[QwenRouter] Empty response — falling back to heuristics')
        return deterministicFallback(prompt, context?.category)
      }

      const decision = parseQwenResponse(text, prompt)
      console.log(`[QwenRouter] → Tier ${decision.selectedTier} | intent: ${decision.intent} | complexity: ${decision.complexity} | confidence: ${decision.confidence}`)
      return decision

    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.warn('[QwenRouter] Timed out — falling back to heuristics')
      } else {
        console.warn('[QwenRouter] Error:', err?.message ?? err)
      }
      return deterministicFallback(prompt, context?.category)
    }
  }
}

// Singleton — shared across all requests
export const qwenRouter = new QwenRouter()

// Re-export RouterDecisionso callers don't need two imports
export type { RouterDecision }
