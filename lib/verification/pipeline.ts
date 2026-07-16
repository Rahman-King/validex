/**
 * Main Verification Pipeline
 * Orchestrates all three verification stages with online research capability
 */

import { validateStructure, defaultStructuralConfigs } from "./stage1-structural"
import { validateContent, defaultContentConfigs } from "./stage2-content"
import { validateAnomalies, defaultAnomalyConfigs } from "./stage3-anomaly"
import { verifyOnline } from "./online-research"
import type { 
  VerificationRequest, 
  VerificationResponse, 
  VerificationReport,
  VerificationConfig,
  TaskMode,
  VerificationStatus
} from "./types"

export async function runVerificationPipeline(
  request: VerificationRequest
): Promise<VerificationResponse> {
  const { data, taskMode, config, enableOnlineResearch = false } = request

  try {
    // Use default configs if not provided
    const effectiveConfig: VerificationConfig = {
      structural: config?.structural || defaultStructuralConfigs[taskMode],
      content: config?.content || defaultContentConfigs[taskMode],
      anomaly: config?.anomaly || defaultAnomalyConfigs[taskMode],
      enabledStages: config?.enabledStages || ["structural", "content", "anomaly"],
    }

    const stages: any = {}
    const scores: number[] = []
    const allIssues: string[] = []

    // Stage 1: Structural Validation
    if (effectiveConfig.enabledStages.includes("structural")) {
      stages.structural = await validateStructure(
        data,
        taskMode,
        effectiveConfig.structural
      )
      scores.push(stages.structural.score)
      allIssues.push(...stages.structural.issues)
    }

    // Stage 2: Content Verification
    if (effectiveConfig.enabledStages.includes("content")) {
      stages.content = await validateContent(
        data,
        taskMode,
        effectiveConfig.content
      )
      scores.push(stages.content.score)
      allIssues.push(...stages.content.issues)
    }

    // Stage 3: Anomaly Detection
    if (effectiveConfig.enabledStages.includes("anomaly")) {
      stages.anomaly = await validateAnomalies(
        data,
        taskMode,
        effectiveConfig.anomaly
      )
      scores.push(stages.anomaly.score)
      allIssues.push(...stages.anomaly.issues)
    }

    // Online Research Verification (optional)
    let onlineResearchResult = null
    if (enableOnlineResearch) {
      try {
        onlineResearchResult = await verifyOnline(data, taskMode)
        if (onlineResearchResult.verified) {
          scores.push(onlineResearchResult.confidence)
        } else {
          allIssues.push(...onlineResearchResult.issues)
        }
      } catch (error) {
        console.warn("Online research verification failed:", error)
        allIssues.push("Online research verification failed")
      }
    }

    // Calculate overall score
    const overallScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0

    // Determine overall status
    let overallStatus: VerificationStatus = "valid"
    if (overallScore < 0.5) {
      overallStatus = "invalid"
    } else if (overallScore < 0.7) {
      overallStatus = "warning"
    }

    // Generate recommendations
    const recommendations = generateRecommendations(stages, overallStatus)

    // Create verification report
    const report: VerificationReport = {
      taskId: data.task_id || "unknown",
      overallStatus,
      overallScore,
      stages: {
        structural: stages.structural || { 
          stage: "structural", 
          status: "pending", 
          score: 0, 
          details: "Skipped", 
          issues: [], 
          timestamp: Date.now() 
        },
        content: stages.content || { 
          stage: "content", 
          status: "pending", 
          score: 0, 
          details: "Skipped", 
          issues: [], 
          timestamp: Date.now() 
        },
        anomaly: stages.anomaly || { 
          stage: "anomaly", 
          status: "pending", 
          score: 0, 
          details: "Skipped", 
          issues: [], 
          timestamp: Date.now() 
        },
      },
      recommendations,
      verifiedAt: Date.now(),
    }

    return {
      success: overallStatus !== "invalid",
      report,
      originalData: data,
      verifiedData: overallStatus === "valid" ? data : undefined,
    }
  } catch (error) {
    return {
      success: false,
      report: {
        taskId: data.task_id || "unknown",
        overallStatus: "invalid",
        overallScore: 0,
        stages: {
          structural: { 
            stage: "structural", 
            status: "invalid", 
            score: 0, 
            details: "Pipeline failed", 
            issues: [String(error)], 
            timestamp: Date.now() 
          },
          content: { 
            stage: "content", 
            status: "invalid", 
            score: 0, 
            details: "Pipeline failed", 
            issues: [], 
            timestamp: Date.now() 
          },
          anomaly: { 
            stage: "anomaly", 
            status: "invalid", 
            score: 0, 
            details: "Pipeline failed", 
            issues: [], 
            timestamp: Date.now() 
          },
        },
        recommendations: ["Fix pipeline errors before retrying"],
        verifiedAt: Date.now(),
      },
      originalData: data,
    }
  }
}

function generateRecommendations(stages: any, status: VerificationStatus): string[] {
  const recommendations: string[] = []

  if (status === "valid") {
    recommendations.push("Data passed all verification checks")
    return recommendations
  }

  // Structural recommendations
  if (stages.structural?.issues?.length > 0) {
    recommendations.push("Review structural issues: missing fields, incorrect types, or constraint violations")
  }

  // Content recommendations
  if (stages.content?.issues?.length > 0) {
    if (stages.content.issues.some((i: string) => i.includes("PII"))) {
      recommendations.push("Remove or redact personally identifiable information")
    }
    if (stages.content.issues.some((i: string) => i.includes("bias"))) {
      recommendations.push("Review content for potential bias")
    }
    if (stages.content.issues.some((i: string) => i.includes("hallucination"))) {
      recommendations.push("Verify factual accuracy and remove uncertain language")
    }
  }

  // Anomaly recommendations
  if (stages.anomaly?.issues?.length > 0) {
    recommendations.push("Review data for statistical anomalies or outliers")
  }

  return recommendations
}

// Batch verification for multiple tasks
export async function runBatchVerification(
  requests: VerificationRequest[]
): Promise<VerificationResponse[]> {
  const results = await Promise.all(
    requests.map(req => runVerificationPipeline(req))
  )
  return results
}

// Quick verification (only structural + content, skips anomaly for speed)
export async function runQuickVerification(
  request: VerificationRequest
): Promise<VerificationResponse> {
  return runVerificationPipeline({
    ...request,
    config: {
      ...request.config,
      enabledStages: ["structural", "content"],
    },
  })
}

// Deep verification (all stages + online research)
export async function runDeepVerification(
  request: VerificationRequest
): Promise<VerificationResponse> {
  return runVerificationPipeline({
    ...request,
    enableOnlineResearch: true,
  })
}
