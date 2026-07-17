/**
 * Output Verification API Endpoint
 * Verifies AI outputs using the 3-step verification system
 */

import { NextRequest, NextResponse } from "next/server"
import { runVerificationPipeline } from "@/lib/verification/pipeline"
import type { VerificationRequest, TaskMode } from "@/lib/verification/types"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, taskMode, verificationLevel = "standard" } = body

    // Validate required fields
    if (!data) {
      return NextResponse.json(
        { error: "Missing required field: data" },
        { status: 400 }
      )
    }

    if (!data.prompt || !data.answer) {
      return NextResponse.json(
        { error: "Missing required fields in data: prompt and answer" },
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
      enableOnlineResearch: false, // Disabled by default for output verification
      config: {
        content: {
          checkPII: true,
          checkBias: true,
          checkHallucinations: true,
          checkFacts: false,
          enableSuggestionSystem: false, // Disabled by default to avoid Ollama dependency
          enableBohrVerification: false, // Disabled by default to avoid Bohr dependency
          factCheckSources: [],
          biasThreshold: 0.7,
          hallucinationThreshold: 0.6
        },
        structural: {
          requiredFields: [],
          fieldTypes: {},
          fieldConstraints: {}
        },
        anomaly: {
          enableOutlierDetection: false,
          enableConsistencyChecks: false,
          outlierThreshold: 2,
          consistencyRules: []
        },
        enabledStages: ["structural", "content", "anomaly"]
      }
    }

    // Run verification pipeline
    const result = await runVerificationPipeline(verificationRequest)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Output verification API error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}

// GET endpoint for verification status/info
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/verify-output",
    method: "POST",
    description: "Verify AI outputs using three-stage verification pipeline",
    parameters: {
      data: "Object containing task_id, prompt, and answer",
      taskMode: "One of: general, math, code, reasoning, factual, sentiment, summarization, ner",
      verificationLevel: "Optional: quick, standard, or deep (default: standard)",
    },
    response: {
      success: "boolean",
      report: {
        taskId: "string",
        overallStatus: "valid | invalid | warning",
        overallScore: "number (0-1)",
        stages: {
          structural: {
            status: "valid | invalid | warning",
            score: "number (0-1)",
            issues: "string[]"
          },
          content: {
            status: "valid | invalid | warning",
            score: "number (0-1)",
            issues: "string[]",
            detections: {
              pii: "boolean",
              bias: "boolean",
              hallucination: "boolean"
            }
          },
          anomaly: {
            status: "valid | invalid | warning",
            score: "number (0-1)",
            issues: "string[]"
          }
        },
        recommendations: "string[]",
      },
    },
  })
}
