/**
 * Prompt Optimization Page
 * Analyzes and optimizes prompts based on Google's framework
 * Detects confidential data and provides AI-ready prompts with scoring
 */

'use client'

import { useState } from 'react'

interface PromptAnalysis {
  originalPrompt: string
  optimizedPrompt: string
  score: number
  breakdown: {
    persona: number
    task: number
    context: number
    format: number
  }
  issues: string[]
  improvements: string[]
  confidentialData: {
    detected: boolean
    removed: string[]
    warning: string
  }
}

export default function OptimizePage() {
  const [prompt, setPrompt] = useState('')
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const analyzePrompt = async () => {
    if (!prompt.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      const result = await response.json()
      setAnalysis(result)
    } catch (error) {
      console.error('Error analyzing prompt:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyOptimizedPrompt = () => {
    if (analysis?.optimizedPrompt) {
      navigator.clipboard.writeText(analysis.optimizedPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Needs Improvement'
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-linear-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Prompt Optimizer
          </h1>
          <p className="text-muted-foreground">
            Optimize your prompts using Google's framework and detect confidential data
          </p>
        </div>

        <div className="space-y-6">
          {/* Input Section */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <label className="block text-sm font-medium mb-2">Your Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
              className="w-full h-32 p-3 border border-input rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              onClick={analyzePrompt}
              disabled={loading || !prompt.trim()}
              className="mt-4 w-full bg-linear-to-r from-violet-600 to-indigo-600 text-white py-2 px-4 rounded-md hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Analyzing...' : 'Optimize Prompt'}
            </button>
          </div>

          {/* Results Section */}
          {analysis && (
            <div className="space-y-6">
              {/* Score Card */}
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">AI-Ready Score</h2>
                  <div className="text-right">
                    <span className={`text-4xl font-bold ${getScoreColor(analysis.score)}`}>
                      {analysis.score}
                    </span>
                    <span className="text-muted-foreground">/100</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  Rating: {getScoreLabel(analysis.score)}
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Persona (25%)</span>
                      <span className={getScoreColor(analysis.breakdown.persona)}>
                        {analysis.breakdown.persona}/25
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-violet-600 h-2 rounded-full transition-all"
                        style={{ width: `${(analysis.breakdown.persona / 25) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Task (25%)</span>
                      <span className={getScoreColor(analysis.breakdown.task)}>
                        {analysis.breakdown.task}/25
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${(analysis.breakdown.task / 25) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Context (25%)</span>
                      <span className={getScoreColor(analysis.breakdown.context)}>
                        {analysis.breakdown.context}/25
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(analysis.breakdown.context / 25) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Format (25%)</span>
                      <span className={getScoreColor(analysis.breakdown.format)}>
                        {analysis.breakdown.format}/25
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-cyan-600 h-2 rounded-full transition-all"
                        style={{ width: `${(analysis.breakdown.format / 25) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Confidential Data Warning */}
              {analysis.confidentialData.detected && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                        Confidential Data Detected
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                        {analysis.confidentialData.warning}
                      </p>
                      {analysis.confidentialData.removed.length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">Removed:</span>
                          <ul className="list-disc list-inside mt-1">
                            {analysis.confidentialData.removed.map((item, index) => (
                              <li key={index} className="text-red-600 dark:text-red-400">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Issues */}
              {analysis.issues.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                  <h3 className="font-semibold mb-3">Issues Found</h3>
                  <ul className="space-y-2">
                    {analysis.issues.map((issue, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-yellow-500 mt-0.5">⚠️</span>
                        <span className="text-muted-foreground">{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {analysis.improvements.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                  <h3 className="font-semibold mb-3">Suggested Improvements</h3>
                  <ul className="space-y-2">
                    {analysis.improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span className="text-muted-foreground">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Optimized Prompt */}
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Optimized Prompt</h3>
                  <button
                    onClick={copyOptimizedPrompt}
                    className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap">
                  {analysis.optimizedPrompt}
                </div>
              </div>
            </div>
          )}

          {/* Framework Info */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h3 className="font-semibold mb-3">Google's Prompt Framework</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-violet-600 mb-1">Persona (25%)</h4>
                <p className="text-muted-foreground">Tell AI who it should be. This sets the tone and expertise level.</p>
              </div>
              <div>
                <h4 className="font-medium text-indigo-600 mb-1">Task (25%)</h4>
                <p className="text-muted-foreground">Specify exactly what you want, with clear parameters.</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-600 mb-1">Context (25%)</h4>
                <p className="text-muted-foreground">Share your goals and any relevant examples.</p>
              </div>
              <div>
                <h4 className="font-medium text-cyan-600 mb-1">Format (25%)</h4>
                <p className="text-muted-foreground">Define how you want the output structured.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
