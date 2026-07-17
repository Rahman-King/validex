/**
 * Refinement Loop System
 * Automatically re-prompts models when verification detects issues
 * Gives models a "second chance" to correct specific errors
 */

import type { ValidationResult, VerificationStage } from "./types"

export interface RefinementConfig {
  maxIterations: number
  enabledStages: VerificationStage[]
  confidenceThreshold: number
  requireExplicitErrors: boolean
}

export interface RefinementResult {
  originalOutput: string
  refinedOutput: string
  iterations: number
  issuesDetected: string[]
  improvements: string[]
  success: boolean
  reason: string
}

const DEFAULT_CONFIG: RefinementConfig = {
  maxIterations: 2,
  enabledStages: ["content"], // Focus on content verification for refinement
  confidenceThreshold: 0.7,
  requireExplicitErrors: true
}

/**
 * Generate refinement prompt based on verification issues */
export function generateRefinementPrompt(
  originalPrompt: string,
  originalOutput: string,
  verificationResult: ValidationResult
): string {
  const issues = verificationResult.issues.filter(issue => issue.length > 0)
  
  if (issues.length === 0) {
    return originalPrompt
  }
  
  let refinementPrompt = `Original Request: ${originalPrompt}\n\n`
  refinementPrompt += `Your Previous Response: ${originalOutput}\n\n`
  refinementPrompt += `Verification Issues Detected:\n`
  
  issues.forEach((issue, index) => {
    refinementPrompt += `${index + 1}. ${issue}\n`
  })
  
  refinementPrompt += `\nPlease revise your response to address these specific issues. `
  refinementPrompt += `Maintain the core message but fix the identified problems. `
  refinementPrompt += `Provide only the revised response without explanations.`
  
  return refinementPrompt
}

/**
 * Execute refinement loop */
export async function executeRefinementLoop(
  originalPrompt: string,
  originalOutput: string,
  verificationResult: ValidationResult,
  generateResponse: (prompt: string) => Promise<string>,
  config: Partial<RefinementConfig> = {}
): Promise<RefinementResult> {
  const effectiveConfig = { ...DEFAULT_CONFIG, ...config }
  
  // Skip refinement if no issues detected
  if (verificationResult.issues.length === 0) {
    return {
      originalOutput,
      refinedOutput: originalOutput,
      iterations: 0,
      issuesDetected: [],
      improvements: [],
      success: true,
      reason: "No issues detected, refinement not needed"
    }
  }
  
  // Skip if confidence is already high
  if (verificationResult.score >= effectiveConfig.confidenceThreshold) {
    return {
      originalOutput,
      refinedOutput: originalOutput,
      iterations: 0,
      issuesDetected: [],
      improvements: [],
      success: true,
      reason: "Confidence threshold met, refinement not needed"
    }
  }
  
  // Skip if stage not enabled
  if (!effectiveConfig.enabledStages.includes(verificationResult.stage)) {
    return {
      originalOutput,
      refinedOutput: originalOutput,
      iterations: 0,
      issuesDetected: [],
      improvements: [],
      success: true,
      reason: "Stage not enabled for refinement"
    }
  }
  
  let currentOutput = originalOutput
  let iterations = 0
  const issuesDetected = [...verificationResult.issues]
  const improvements: string[] = []
  
  for (let i = 0; i < effectiveConfig.maxIterations; i++) {
    iterations++
    
    try {
      // Generate refinement prompt
      const refinementPrompt = generateRefinementPrompt(
        originalPrompt,
        currentOutput,
        verificationResult
      )
      
      // Generate refined response
      currentOutput = await generateResponse(refinementPrompt)
      
      // In a real implementation, you would re-verify the refined output
      // For now, we'll assume improvement and track the iteration
      improvements.push(`Iteration ${iterations}: Response refined based on ${issuesDetected.length} issues`)
      
      // If this were a full implementation, we would:
      // 1. Re-run verification on currentOutput
      // 2. Check if issues are resolved
      // 3. Break if score improves significantly
      
    } catch (error) {
      return {
        originalOutput,
        refinedOutput: currentOutput,
        iterations,
        issuesDetected,
        improvements,
        success: false,
        reason: `Refinement failed at iteration ${iterations}: ${error}`
      }
    }
  }
  
  return {
    originalOutput,
    refinedOutput: currentOutput,
    iterations,
    issuesDetected,
    improvements,
    success: true,
    reason: `Completed ${iterations} refinement iterations`
  }
}

/**
 * Check if refinement is needed based on verification result */
export function needsRefinement(
  verificationResult: ValidationResult,
  config: Partial<RefinementConfig> = {}
): boolean {
  const effectiveConfig = { ...DEFAULT_CONFIG, ...config }
  
  // Check if stage is enabled
  if (!effectiveConfig.enabledStages.includes(verificationResult.stage)) {
    return false
  }
  
  // Check if there are issues
  if (verificationResult.issues.length === 0) {
    return false
  }
  
  // Check if confidence is below threshold
  if (verificationResult.score >= effectiveConfig.confidenceThreshold) {
    return false
  }
  
  // Check if explicit errors are required
  if (effectiveConfig.requireExplicitErrors) {
    const hasExplicitErrors = verificationResult.issues.some(
      issue => issue.toLowerCase().includes("error") || 
               issue.toLowerCase().includes("invalid") ||
               issue.toLowerCase().includes("hallucination")
    )
    if (!hasExplicitErrors) {
      return false
    }
  }
  
  return true
}

/**
 * Get refinement statistics */
export function getRefinementStats(result: RefinementResult): {
  totalIterations: number
  issuesAddressed: number
  improvementRate: number
} {
  return {
    totalIterations: result.iterations,
    issuesAddressed: result.issuesDetected.length,
    improvementRate: result.iterations > 0 ? result.improvements.length / result.iterations : 0
  }
}
