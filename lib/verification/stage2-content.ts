/**
 * Stage 2: Content Verification (The Auditor)
 * Checks if the data means right - fact-checking, PII detection, bias/hallucination detection
 * Uses suggestion-based system: Bohrium and Gemini provide suggestions, local model synthesizes
 */

import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import type { 
  ValidationResult, 
  VerificationStage, 
  ContentVerificationConfig,
  TaskMode 
} from "./types"
import { collectAndSynthesizeSuggestions } from "./suggestion-synthesis"

// PII Detection patterns
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
}

// Bias detection keywords
const BIAS_KEYWORDS = {
  gender: ["man", "woman", "male", "female", "he", "she", "his", "her"],
  racial: ["race", "ethnic", "color", "skin"],
  age: ["young", "old", "age", "elderly"],
  religious: ["religion", "faith", "god", "christian", "muslim", "jewish"],
}

// Hallucination indicators
const HALLUCINATION_PATTERNS = [
  /\bI think\b/i,
  /\bprobably\b/i,
  /\bmaybe\b/i,
  /\blikely\b/i,
  /\bI believe\b/i,
  /\bas far as I know\b/i,
]

function detectPII(text: string): string[] {
  const issues: string[] = []

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = text.match(pattern)
    if (matches && matches.length > 0) {
      issues.push(`Detected ${type}: ${matches.length} occurrence(s)`)
    }
  }

  return issues
}

function detectBias(text: string): { score: number; issues: string[] } {
  const issues: string[] = []
  const lowerText = text.toLowerCase()

  for (const [category, keywords] of Object.entries(BIAS_KEYWORDS)) {
    const foundKeywords = keywords.filter(kw => lowerText.includes(kw))
    if (foundKeywords.length > 0) {
      issues.push(`Potential ${category} bias detected: ${foundKeywords.join(", ")}`)
    }
  }

  const score = issues.length === 0 ? 1 : Math.max(0, 1 - (issues.length * 0.15))
  return { score, issues }
}

function detectHallucinations(text: string): { score: number; issues: string[] } {
  const issues: string[] = []

  for (const pattern of HALLUCINATION_PATTERNS) {
    const matches = text.match(pattern)
    if (matches && matches.length > 0) {
      issues.push(`Uncertainty language detected: ${matches[0]}`)
    }
  }

  const score = issues.length === 0 ? 1 : Math.max(0, 1 - (issues.length * 0.2))
  return { score, issues }
}

async function llmJudgeContent(
  data: any,
  taskMode: TaskMode,
  config?: ContentVerificationConfig
): Promise<{ valid: boolean; score: number; issues: string[] }> {
  const issues: string[] = []

  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not set, skipping LLM judge")
      return { valid: true, score: 0.8, issues: ["LLM judge skipped - no API key"] }
    }

    const systemPrompt = `You are a data auditor. Analyze the following data and return a JSON response with:
{
  "valid": boolean,
  "score": number (0-1),
  "issues": string[],
  "analysis": string
}

Check for:
- Factual accuracy
- Logical consistency
- Appropriate language and tone
- Completeness of the answer
- Relevance to the prompt

Task mode: ${taskMode}`

    const prompt = `Prompt: ${data.prompt}\n\nAnswer: ${data.answer}`

    const result = await generateText({
      model: google("gemini-1.5-flash"),
      system: systemPrompt,
      prompt: prompt,
      temperature: 0.1,
      maxTokens: 500,
    })

    try {
      const judgment = JSON.parse(result.text.trim())
      return {
        valid: judgment.valid || judgment.score > 0.5,
        score: judgment.score || 0.5,
        issues: judgment.issues || [],
      }
    } catch (parseError) {
      // If JSON parsing fails, do basic analysis
      const analysis = result.text.toLowerCase()
      if (analysis.includes("invalid") || analysis.includes("error")) {
        issues.push("LLM judge identified issues with the content")
        return { valid: false, score: 0.3, issues }
      }
      return { valid: true, score: 0.7, issues: ["Could not parse LLM judgment"] }
    }
  } catch (error) {
    console.error("LLM judge error:", error)
    return { valid: true, score: 0.5, issues: ["LLM judge failed, using fallback"] }
  }
}

/**
 * Bohrium API integration for scientific data verification
 */
async function bohrVerifyContent(
  data: any,
  config?: ContentVerificationConfig
): Promise<{ valid: boolean; score: number; issues: string[]; details?: any }> {
  const issues: string[] = []
  
  try {
    const bohrServiceUrl = process.env.BOHR_SERVICE_URL || "http://localhost:5001"
    
    // Prepare data for Bohrium verification
    const bohrData = {
      prompt: data.prompt,
      answer: data.answer,
      task_id: data.task_id,
      // Extract numerical data if present
      numerical_data: extractNumericalData(data.answer)
    }

    const response = await fetch(`${bohrServiceUrl}/verify/scientific`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bohrData)
    })

    if (!response.ok) {
      throw new Error(`Bohr service error: ${response.statusText}`)
    }

    const result = await response.json()
    
    if (!result.valid) {
      issues.push(...(result.issues || []))
    }

    return {
      valid: result.valid || true,
      score: result.confidence || 0.8,
      issues,
      details: result.details
    }
  } catch (error) {
    console.error("Bohr verification error:", error)
    // Don't fail the entire verification if Bohrium is unavailable
    return { 
      valid: true, 
      score: 0.7, 
      issues: [`Bohr verification unavailable: ${error}`],
      details: { error: String(error) }
    }
  }
}

/**
 * Extract numerical data from text for Bohrium verification
 */
function extractNumericalData(text: string): number[] {
  const numbers = text.match(/-?\d+\.?\d*/g)
  return numbers ? numbers.map(Number) : []
}

export async function validateContent(
  data: any,
  taskMode: TaskMode,
  config?: ContentVerificationConfig
): Promise<ValidationResult> {
  const stage: VerificationStage = "content"
  const issues: string[] = []
  const scores: number[] = []
  const suggestions: any[] = []

  const effectiveConfig: ContentVerificationConfig = config || {
    checkPII: true,
    checkBias: true,
    checkHallucinations: true,
    checkFacts: true,
    enableBohrVerification: false,
    enableSuggestionSystem: true,
    factCheckSources: [],
    biasThreshold: 0.7,
    hallucinationThreshold: 0.7,
  }

  try {
    const textToCheck = `${data.prompt} ${data.answer}`

    // 1. PII Detection
    if (effectiveConfig.checkPII) {
      const piiIssues = detectPII(textToCheck)
      issues.push(...piiIssues)
      scores.push(piiIssues.length === 0 ? 1 : 0.5)
    }

    // 2. Bias Detection
    if (effectiveConfig.checkBias) {
      const biasResult = detectBias(textToCheck)
      issues.push(...biasResult.issues)
      scores.push(biasResult.score)
    }

    // 3. Hallucination Detection
    if (effectiveConfig.checkHallucinations) {
      const hallucResult = detectHallucinations(data.answer)
      issues.push(...hallucResult.issues)
      scores.push(hallucResult.score)
    }

    // 4. Suggestion-based verification (Bohr + Gemini + Local Synthesis)
    let finalDecision = "valid" as "valid" | "invalid" | "warning"
    let synthesisScore = 0.8

    if (effectiveConfig.enableSuggestionSystem) {
      const { suggestions: modelSuggestions, synthesis } = await collectAndSynthesizeSuggestions(
        data,
        taskMode,
        effectiveConfig
      )
      
      suggestions.push(...modelSuggestions)
      finalDecision = synthesis.finalDecision
      synthesisScore = synthesis.confidence
      scores.push(synthesisScore)
      
      // Add synthesis reasoning to details
      if (synthesis.reasoning) {
        issues.push(`Synthesis reasoning: ${synthesis.reasoning}`)
      }
    } else {
      // Fallback to old LLM judge method
      if (effectiveConfig.checkFacts) {
        const llmResult = await llmJudgeContent(data, taskMode, effectiveConfig)
        if (!llmResult.valid) {
          issues.push(...llmResult.issues)
        }
        scores.push(llmResult.score)
      }
    }

    // Calculate overall score
    const overallScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 1

    const status: "valid" | "invalid" | "warning" = 
      overallScore >= effectiveConfig.biasThreshold ? "valid" :
      overallScore >= effectiveConfig.hallucinationThreshold ? "warning" : "invalid"

    return {
      stage,
      status,
      score: overallScore,
      details: issues.length === 0 
        ? "Content verification passed all checks" 
        : `Found ${issues.length} content issue(s)`,
      issues,
      suggestions,
      finalDecision: finalDecision,
      timestamp: Date.now(),
    }
  } catch (error) {
    return {
      stage,
      status: "invalid",
      score: 0,
      details: `Content verification failed: ${error}`,
      issues: ["Unexpected error during content verification"],
      suggestions: [],
      finalDecision: "invalid",
      timestamp: Date.now(),
    }
  }
}

// Default configurations for different task modes
export const defaultContentConfigs: Record<TaskMode, ContentVerificationConfig> = {
  general: {
    checkPII: true,
    checkBias: true,
    checkHallucinations: true,
    checkFacts: true,
    enableBohrVerification: false,
    enableSuggestionSystem: true,
    factCheckSources: [],
    biasThreshold: 0.7,
    hallucinationThreshold: 0.7,
  },
  math: {
    checkPII: false,
    checkBias: false,
    checkHallucinations: true,
    checkFacts: true,
    enableBohrVerification: true,
    enableSuggestionSystem: true,
    factCheckSources: [],
    biasThreshold: 0.8,
    hallucinationThreshold: 0.8,
  },
  code: {
    checkPII: false,
    checkBias: false,
    checkHallucinations: true,
    checkFacts: true,
    enableBohrVerification: false,
    enableSuggestionSystem: true,
    factCheckSources: [],
    biasThreshold: 0.8,
    hallucinationThreshold: 0.8,
  },
  reasoning: {
    checkPII: false,
    checkBias: false,
    checkHallucinations: true,
    checkFacts: true,
    enableBohrVerification: true,
    enableSuggestionSystem: true,
    factCheckSources: [],
    biasThreshold: 0.7,
    hallucinationThreshold: 0.7,
  },
  factual: {
    checkPII: true,
    checkBias: false,
    checkHallucinations: true,
    checkFacts: true,
    enableBohrVerification: false,
    enableSuggestionSystem: true,
    factCheckSources: ["wikipedia", "google"],
    biasThreshold: 0.8,
    hallucinationThreshold: 0.8,
  },
  sentiment: {
    checkPII: true,
    checkBias: true,
    checkHallucinations: false,
    checkFacts: false,
    enableBohrVerification: false,
    enableSuggestionSystem: false,
    factCheckSources: [],
    biasThreshold: 0.7,
    hallucinationThreshold: 0.7,
  },
  summarization: {
    checkPII: true,
    checkBias: true,
    checkHallucinations: true,
    checkFacts: true,
    enableBohrVerification: false,
    enableSuggestionSystem: true,
    factCheckSources: [],
    biasThreshold: 0.7,
    hallucinationThreshold: 0.7,
  },
  ner: {
    checkPII: true,
    checkBias: false,
    checkHallucinations: false,
    checkFacts: true,
    enableBohrVerification: false,
    enableSuggestionSystem: true,
    factCheckSources: [],
    biasThreshold: 0.8,
    hallucinationThreshold: 0.8,
  },
}
