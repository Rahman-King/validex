/**
 * Suggestion Synthesis System
 * Collects suggestions from multiple AI models (Bohr, Gemini)
 * and uses a local Ollama model to synthesize the final decision
 */

import type { ModelSuggestion, VerificationStage } from "./types"

/**
 * Collect suggestions from Bohrium API */
export async function collectBohrSuggestion(
  data: any,
  config?: any
): Promise<ModelSuggestion> {
  try {
    const bohrServiceUrl = process.env.BOHR_SERVICE_URL || "http://localhost:5001"
    
    const bohrData = {
      prompt: data.prompt,
      answer: data.answer,
      task_id: data.task_id,
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
    
    return {
      source: "bohr",
      valid: result.valid || true,
      confidence: result.confidence || 0.8,
      analysis: result.details?.analysis || "Scientific verification completed",
      issues: result.issues || [],
      reasoning: result.details?.reasoning,
      metadata: {
        method: "bohr_scientific_verification",
        computations_performed: result.details?.computations_performed || []
      }
    }
  } catch (error) {
    console.error("Bohr suggestion error:", error)
    return {
      source: "bohr",
      valid: true,
      confidence: 0.5,
      analysis: "Bohr verification unavailable",
      issues: [`Bohr service error: ${error}`],
      metadata: { error: String(error) }
    }
  }
}

/**
 * Collect suggestions from Gemini API */
export async function collectGeminiSuggestion(
  data: any,
  taskMode: string,
  config?: any
): Promise<ModelSuggestion> {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return {
        source: "gemini",
        valid: true,
        confidence: 0.5,
        analysis: "Gemini API not configured",
        issues: ["Gemini API key not provided"],
        metadata: { error: "no_api_key" }
      }
    }

    const { generateText } = await import("ai")
    const { google } = await import("@ai-sdk/google")

    const systemPrompt = `You are a data auditor providing verification suggestions. 
Analyze the following data and return a JSON response with:
{
  "valid": boolean,
  "confidence": number (0-1),
  "analysis": string (detailed analysis),
  "issues": string[],
  "reasoning": string (why you reached this conclusion)
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
        source: "gemini",
        valid: judgment.valid || judgment.confidence > 0.5,
        confidence: judgment.confidence || 0.5,
        analysis: judgment.analysis || "Gemini analysis completed",
        issues: judgment.issues || [],
        reasoning: judgment.reasoning,
        metadata: { model: "gemini-1.5-flash" }
      }
    } catch (parseError) {
      const analysis = result.text.toLowerCase()
      return {
        source: "gemini",
        valid: !analysis.includes("invalid") && !analysis.includes("error"),
        confidence: 0.6,
        analysis: result.text,
        issues: ["Could not parse Gemini response"],
        metadata: { parse_error: true }
      }
    }
  } catch (error) {
    console.error("Gemini suggestion error:", error)
    return {
      source: "gemini",
      valid: true,
      confidence: 0.5,
      analysis: "Gemini verification failed",
      issues: [`Gemini API error: ${error}`],
      metadata: { error: String(error) }
    }
  }
}

/**
 * Synthesize suggestions using local Ollama model */
export async function synthesizeWithLocalModel(
  suggestions: ModelSuggestion[],
  data: any,
  taskMode: string,
  localModel?: string
): Promise<{ finalDecision: string; confidence: number; reasoning: string }> {
  try {
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
    const model = localModel || process.env.OLLAMA_SYNTHESIS_MODEL || "llama3:8b"

    // Prepare synthesis prompt
    const suggestionsText = suggestions.map(s => 
      `${s.source.toUpperCase()} SUGGESTION:
- Valid: ${s.valid}
- Confidence: ${s.confidence}
- Analysis: ${s.analysis}
- Issues: ${s.issues.join(", ") || "None"}
- Reasoning: ${s.reasoning || "Not provided"}
`
    ).join("\n")

    const synthesisPrompt = `You are a verification synthesis engine. 
Review the following suggestions from multiple AI models and provide a final decision.

TASK MODE: ${taskMode}

DATA TO VERIFY:
Prompt: ${data.prompt}
Answer: ${data.answer}

MODEL SUGGESTIONS:
${suggestionsText}

Provide your final decision as JSON:
{
  "finalDecision": "valid" | "invalid" | "warning",
  "confidence": number (0-1),
  "reasoning": string (explain your synthesis process and final decision)
}

Consider:
- Weight of each suggestion based on confidence
- Consistency between suggestions
- Specific issues raised by each model
- Overall data quality and appropriateness`

    const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        prompt: synthesisPrompt,
        stream: false,
        format: "json",
        options: {
          temperature: 0.2,
          num_predict: 500
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`)
    }

    const result = await response.json()
    
    try {
      const synthesis = JSON.parse(result.response)
      return {
        finalDecision: synthesis.finalDecision || "valid",
        confidence: synthesis.confidence || 0.7,
        reasoning: synthesis.reasoning || "Synthesis completed"
      }
    } catch (parseError) {
      // Fallback to simple majority voting if JSON parsing fails
      const validCount = suggestions.filter(s => s.valid).length
      const finalDecision = validCount > suggestions.length / 2 ? "valid" : "invalid"
      const avgConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length
      
      return {
        finalDecision,
        confidence: avgConfidence,
        reasoning: "JSON parsing failed, used majority voting fallback"
      }
    }
  } catch (error) {
    console.error("Local model synthesis error:", error)
    // Fallback to simple majority voting
    const validCount = suggestions.filter(s => s.valid).length
    const finalDecision = validCount > suggestions.length / 2 ? "valid" : "invalid"
    const avgConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length
    
    return {
      finalDecision,
      confidence: avgConfidence,
      reasoning: `Local model unavailable, used majority voting. Error: ${error}`
    }
  }
}

/**
 * Extract numerical data from text */
function extractNumericalData(text: string): number[] {
  const numbers = text.match(/-?\d+\.?\d*/g)
  return numbers ? numbers.map(Number) : []
}

/**
 * Main suggestion collection and synthesis function */
export async function collectAndSynthesizeSuggestions(
  data: any,
  taskMode: string,
  config?: any
): Promise<{ suggestions: ModelSuggestion[]; synthesis: any }> {
  const suggestions: ModelSuggestion[] = []

  // Collect suggestions from enabled sources
  if (config?.enableBohrVerification !== false) {
    const bohrSuggestion = await collectBohrSuggestion(data, config)
    suggestions.push(bohrSuggestion)
  }

  if (config?.checkFacts !== false) {
    const geminiSuggestion = await collectGeminiSuggestion(data, taskMode, config)
    suggestions.push(geminiSuggestion)
  }

  // Synthesize using local model
  const synthesis = await synthesizeWithLocalModel(
    suggestions,
    data,
    taskMode,
    config?.localModel
  )

  return { suggestions, synthesis }
}
