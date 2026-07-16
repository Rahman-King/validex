"use client"

/**
 * Verification Panel Component
 * Standalone UI for data verification without chat interface
 */

import * as React from "react"
import { Shield, CheckCircle, AlertTriangle, XCircle, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { TaskMode, VerificationReport } from "@/lib/verification/types"

interface VerificationPanelProps {
  onVerificationComplete?: (report: VerificationReport) => void
}

export function VerificationPanel({ onVerificationComplete }: VerificationPanelProps) {
  const [taskId, setTaskId] = React.useState("")
  const [prompt, setPrompt] = React.useState("")
  const [answer, setAnswer] = React.useState("")
  const [taskMode, setTaskMode] = React.useState<TaskMode>("general")
  const [verificationLevel, setVerificationLevel] = React.useState<"quick" | "standard" | "deep">("standard")
  const [enableOnlineResearch, setEnableOnlineResearch] = React.useState(false)
  const [verifying, setVerifying] = React.useState(false)
  const [report, setReport] = React.useState<VerificationReport | null>(null)

  const taskModes: Array<{ id: TaskMode; label: string; emoji: string }> = [
    { id: "general", label: "General", emoji: "🎯" },
    { id: "math", label: "Math", emoji: "🧮" },
    { id: "code", label: "Code", emoji: "💻" },
    { id: "reasoning", label: "Reasoning", emoji: "🧠" },
    { id: "factual", label: "Factual", emoji: "📚" },
    { id: "sentiment", label: "Sentiment", emoji: "😊" },
    { id: "summarization", label: "Summary", emoji: "📝" },
    { id: "ner", label: "NER", emoji: "🏷️" },
  ]

  const handleVerify = async () => {
    if (!prompt || !answer) {
      alert("Please provide both prompt and answer")
      return
    }

    setVerifying(true)
    setReport(null)

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            task_id: taskId || `task-${Date.now()}`,
            prompt,
            answer,
          },
          taskMode,
          verificationLevel,
          enableOnlineResearch,
        }),
      })

      const result = await response.json()
      setReport(result.report)
      onVerificationComplete?.(result.report)
    } catch (error) {
      console.error("Verification failed:", error)
      alert("Verification failed. Please try again.")
    } finally {
      setVerifying(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle className="size-5 text-green-500" />
      case "invalid":
        return <XCircle className="size-5 text-red-500" />
      case "warning":
        return <AlertTriangle className="size-5 text-yellow-500" />
      default:
        return <Shield className="size-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "valid":
        return "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300"
      case "invalid":
        return "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-300"
      default:
        return "bg-gray-500/10 border-gray-500/30 text-gray-700 dark:text-gray-300"
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-brand">
          <Shield className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Data Verification</h1>
          <p className="text-sm text-muted-foreground">Three-stage verification pipeline for data validation</p>
        </div>
      </div>

      {/* Input Section */}
      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Task ID (optional)</label>
            <Input
              placeholder="task-001"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Task Mode</label>
            <select
              value={taskMode}
              onChange={(e) => setTaskMode(e.target.value as TaskMode)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {taskModes.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.emoji} {mode.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Prompt</label>
          <Textarea
            placeholder="Enter the prompt or question..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Answer</label>
          <Textarea
            placeholder="Enter the answer to verify..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Verification Level</label>
            <select
              value={verificationLevel}
              onChange={(e) => setVerificationLevel(e.target.value as "quick" | "standard" | "deep")}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="quick">Quick (Structural + Content)</option>
              <option value="standard">Standard (All Stages)</option>
              <option value="deep">Deep (All Stages + Online Research)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="online-research"
              checked={enableOnlineResearch}
              onChange={(e) => setEnableOnlineResearch(e.target.checked)}
              className="rounded border-input"
            />
            <label htmlFor="online-research" className="text-sm font-medium">
              Enable Online Research
            </label>
          </div>
        </div>

        <Button
          onClick={handleVerify}
          disabled={verifying || !prompt || !answer}
          className="w-full"
        >
          {verifying ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <Send className="mr-2 size-4" />
              Verify Data
            </>
          )}
        </Button>
      </Card>

      {/* Results Section */}
      {report && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Verification Results</h2>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${getStatusColor(report.overallStatus)}`}>
              {getStatusIcon(report.overallStatus)}
              <span className="text-sm font-medium capitalize">{report.overallStatus}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{(report.overallScore * 100).toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">Overall Score</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{report.stages.structural.score.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Structural</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{report.stages.content.score.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Content</div>
            </div>
          </div>

          {/* Stage Details */}
          <div className="space-y-3">
            {Object.entries(report.stages).map(([stageName, stage]: [string, any]) => (
              <div key={stageName} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(stage.status)}
                    <span className="font-medium capitalize">{stageName}</span>
                  </div>
                  <Badge variant={stage.status === "valid" ? "default" : stage.status === "warning" ? "secondary" : "destructive"}>
                    {stage.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{stage.details}</p>
                {stage.issues.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {stage.issues.map((issue: string, idx: number) => (
                      <li key={idx} className="text-xs text-red-600 dark:text-red-400">
                        • {issue}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <h3 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Recommendations</h3>
              <ul className="space-y-1">
                {report.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-blue-600 dark:text-blue-400">
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
