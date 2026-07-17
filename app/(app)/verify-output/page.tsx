/**
 * Output Verification Page
 * Verifies AI outputs using the 3-step verification system
 * Analyzes accuracy, hallucinations, bias, and provides detailed verification report
 */

'use client'

import { useState } from 'react'

interface VerificationResult {
  success: boolean
  report: {
    taskId: string
    overallStatus: 'valid' | 'invalid' | 'warning'
    overallScore: number
    stages: {
      structural: {
        status: 'valid' | 'invalid' | 'warning'
        score: number
        issues: string[]
      }
      content: {
        status: 'valid' | 'invalid' | 'warning'
        score: number
        issues: string[]
        detections: {
          pii: boolean
          bias: boolean
          hallucination: boolean
        }
      }
      anomaly: {
        status: 'valid' | 'invalid' | 'warning'
        score: number
        issues: string[]
      }
    }
    recommendations: string[]
  }
}

export default function VerifyOutputPage() {
  const [prompt, setPrompt] = useState('')
  const [output, setOutput] = useState('')
  const [taskMode, setTaskMode] = useState('general')
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [loading, setLoading] = useState(false)

  const verifyOutput = async () => {
    if (!prompt.trim() || !output.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/verify-output', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            task_id: `verify-${Date.now()}`,
            prompt,
            answer: output
          },
          taskMode,
          verificationLevel: 'standard'
        }),
      })

      const result = await response.json()
      setVerificationResult(result)
    } catch (error) {
      console.error('Error verifying output:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-500'
    if (score >= 0.6) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
      case 'invalid': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'
    }
  }

  const getScorePercentage = (score: number) => Math.round(score * 100)

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-linear-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Output Verification
          </h1>
          <p className="text-muted-foreground">
            Verify AI outputs using our 3-step verification system for accuracy and reliability
          </p>
        </div>

        <div className="space-y-6">
          {/* Input Section */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="space-y-4">
              {/* Task Mode Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Task Mode</label>
                <select
                  value={taskMode}
                  onChange={(e) => setTaskMode(e.target.value)}
                  className="w-full p-3 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="general">General</option>
                  <option value="math">Math</option>
                  <option value="code">Code</option>
                  <option value="reasoning">Reasoning</option>
                  <option value="factual">Factual</option>
                  <option value="sentiment">Sentiment</option>
                  <option value="summarization">Summarization</option>
                  <option value="ner">Named Entity Recognition</option>
                </select>
              </div>

              {/* Original Prompt */}
              <div>
                <label className="block text-sm font-medium mb-2">Original Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter the original prompt that generated the output..."
                  className="w-full h-32 p-3 border border-input rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* AI Output */}
              <div>
                <label className="block text-sm font-medium mb-2">AI Output to Verify</label>
                <textarea
                  value={output}
                  onChange={(e) => setOutput(e.target.value)}
                  placeholder="Enter the AI output you want to verify..."
                  className="w-full h-40 p-3 border border-input rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <button
                onClick={verifyOutput}
                disabled={loading || !prompt.trim() || !output.trim()}
                className="w-full bg-linear-to-r from-violet-600 to-indigo-600 text-white py-2 px-4 rounded-md hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Verifying...' : 'Verify Output'}
              </button>
            </div>
          </div>

          {/* Results Section */}
          {verificationResult && (
            <div className="space-y-6">
              {/* Overall Score Card */}
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Overall Verification Score</h2>
                  <div className="text-right">
                    <span className={`text-4xl font-bold ${getScoreColor(verificationResult.report.overallScore)}`}>
                      {getScorePercentage(verificationResult.report.overallScore)}
                    </span>
                    <span className="text-muted-foreground">/100</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(verificationResult.report.overallStatus)}`}>
                    {verificationResult.report.overallStatus.toUpperCase()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Task ID: {verificationResult.report.taskId}
                  </span>
                </div>
              </div>

              {/* Stage 1: Structural Validation */}
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <span className="w-8 h-8 bg-violet-100 dark:bg-violet-900 rounded-full flex items-center justify-center text-violet-600 dark:text-violet-300 text-sm font-bold">1</span>
                    Structural Validation
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${getScoreColor(verificationResult.report.stages.structural.score)}`}>
                      {getScorePercentage(verificationResult.report.stages.structural.score)}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(verificationResult.report.stages.structural.status)}`}>
                      {verificationResult.report.stages.structural.status}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mb-4">
                  <div
                    className="bg-violet-600 h-2 rounded-full transition-all"
                    style={{ width: `${getScorePercentage(verificationResult.report.stages.structural.score)}%` }}
                  />
                </div>
                {verificationResult.report.stages.structural.issues.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {verificationResult.report.stages.structural.issues.map((issue, index) => (
                      <li key={index} className="flex items-start gap-2 text-muted-foreground">
                        <span className="text-yellow-500 mt-0.5">⚠️</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Stage 2: Content Verification */}
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <span className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-sm font-bold">2</span>
                    Content Verification
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${getScoreColor(verificationResult.report.stages.content.score)}`}>
                      {getScorePercentage(verificationResult.report.stages.content.score)}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(verificationResult.report.stages.content.status)}`}>
                      {verificationResult.report.stages.content.status}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mb-4">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${getScorePercentage(verificationResult.report.stages.content.score)}%` }}
                  />
                </div>
                
                {/* Detection Flags */}
                <div className="flex gap-2 mb-4">
                  {verificationResult.report.stages.content.detections.pii && (
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded text-xs">
                      PII Detected
                    </span>
                  )}
                  {verificationResult.report.stages.content.detections.bias && (
                    <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 rounded text-xs">
                      Bias Detected
                    </span>
                  )}
                  {verificationResult.report.stages.content.detections.hallucination && (
                    <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100 rounded text-xs">
                      Hallucination Detected
                    </span>
                  )}
                </div>

                {verificationResult.report.stages.content.issues.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {verificationResult.report.stages.content.issues.map((issue, index) => (
                      <li key={index} className="flex items-start gap-2 text-muted-foreground">
                        <span className="text-yellow-500 mt-0.5">⚠️</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Stage 3: Anomaly Detection */}
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 text-sm font-bold">3</span>
                    Anomaly Detection
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${getScoreColor(verificationResult.report.stages.anomaly.score)}`}>
                      {getScorePercentage(verificationResult.report.stages.anomaly.score)}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(verificationResult.report.stages.anomaly.status)}`}>
                      {verificationResult.report.stages.anomaly.status}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mb-4">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${getScorePercentage(verificationResult.report.stages.anomaly.score)}%` }}
                  />
                </div>
                {verificationResult.report.stages.anomaly.issues.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {verificationResult.report.stages.anomaly.issues.map((issue, index) => (
                      <li key={index} className="flex items-start gap-2 text-muted-foreground">
                        <span className="text-yellow-500 mt-0.5">⚠️</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Recommendations */}
              {verificationResult.report.recommendations.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                  <h3 className="font-semibold mb-3">Recommendations</h3>
                  <ul className="space-y-2">
                    {verificationResult.report.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span className="text-muted-foreground">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Verification Info */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h3 className="font-semibold mb-3">3-Step Verification System</h3>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium text-violet-600 mb-1">1. Structural Validation</h4>
                <p className="text-muted-foreground">Validates data format, required fields, and type checking to ensure the output structure is correct.</p>
              </div>
              <div>
                <h4 className="font-medium text-indigo-600 mb-1">2. Content Verification</h4>
                <p className="text-muted-foreground">Detects PII, bias, and hallucinations using multi-model suggestion synthesis with Bohr and Gemini APIs.</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-600 mb-1">3. Anomaly Detection</h4>
                <p className="text-muted-foreground">Performs statistical outlier detection and consistency checks to identify unusual patterns.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
