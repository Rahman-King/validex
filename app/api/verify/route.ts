/**
 * Verification API Endpoint
 * Standalone interface for data verification without chat
 */

import { NextRequest, NextResponse } from "next/server"
import { runVerificationPipeline, runQuickVerification, runDeepVerification } from "@/lib/verification/pipeline"
import type { VerificationRequest, TaskMode } from "@/lib/verification/types"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, taskMode, verificationLevel = "standard", enableOnlineResearch = false } = body

    // Validate required fields
    if (!data) {
      return NextResponse.json(
        { error: "Missing required field: data" },
        { status: 400 }
      )
    }

    if (!taskMode) {
      return NextResponse.json(
        { error: "Missing required field: taskMode" },
        { status: 400 }
      )
    }

    // Validate taskMode
    const validTaskModes: TaskMode[] = ["general", "math", "code", "reasoning", "factual", "sentiment", "summarization", "ner"]
    if (!validTaskModes.includes(taskMode)) {
      return NextResponse.json(
        { error: `Invalid taskMode. Must be one of: ${validTaskModes.join(", ")}` },
        { status: 400 }
      )
    }

    // Create verification request
    const verificationRequest: VerificationRequest = {
      data,
      taskMode,
      enableOnlineResearch,
    }

    // Run verification based on level
    let result
    switch (verificationLevel) {
      case "quick":
        result = await runQuickVerification(verificationRequest)
        break
      case "deep":
        result = await runDeepVerification(verificationRequest)
        break
      case "standard":
      default:
        result = await runVerificationPipeline(verificationRequest)
        break
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Verification API error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

// GET endpoint for verification status/info
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/verify",
    method: "POST",
    description: "Verify data using three-stage verification pipeline",
    parameters: {
      data: "Object containing task_id, prompt, and answer",
      taskMode: "One of: general, math, code, reasoning, factual, sentiment, summarization, ner",
      verificationLevel: "Optional: quick, standard, or deep (default: standard)",
      enableOnlineResearch: "Optional: boolean (default: false)",
    },
    response: {
      success: "boolean",
      report: {
        taskId: "string",
        overallStatus: "valid | invalid | warning",
        overallScore: "number (0-1)",
        stages: {
          structural: "ValidationResult",
          content: "ValidationResult",
          anomaly: "ValidationResult",
        },
        recommendations: "string[]",
        verifiedAt: "timestamp",
      },
    },
  })
}
