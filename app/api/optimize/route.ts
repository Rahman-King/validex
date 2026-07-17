/**
 * Prompt Optimization API
 * Analyzes and optimizes prompts based on Google's framework
 * Detects confidential data and provides AI-ready prompts with scoring
 */

import { NextRequest, NextResponse } from 'next/server'

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

// Confidential data patterns
const CONFIDENTIAL_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  apiKey: /\b[A-Za-z0-9]{32,}\b/g,
  password: /\bpassword\s*[:=]\s*\S+/gi,
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
}

// Framework analysis patterns
const FRAMEWORK_PATTERNS = {
  persona: [
    /act as|you are|role play|pretend to be|be a|as a|you're a/i,
    /expert|specialist|professional|consultant|advisor/i,
    /teacher|professor|mentor|coach/i,
    /writer|author|journalist|editor/i,
    /developer|engineer|programmer|coder/i,
  ],
  task: [
    /write|create|generate|produce|develop|build/i,
    /explain|describe|analyze|evaluate|assess/i,
    /solve|calculate|compute|determine|find/i,
    /list|enumerate|outline|summarize|summarize/i,
    /compare|contrast|differentiate|distinguish/i,
  ],
  context: [
    /because|since|due to|given that|considering/i,
    /for|to|in order to|so that|with the goal of/i,
    /background|context|situation|scenario|example/i,
    /such as|like|including|specifically|particularly/i,
    /my goal is|i want to|i need to|the purpose is/i,
  ],
  format: [
    /format|structure|organize|arrange|layout/i,
    /list|bullet|numbered|table|chart/i,
    /paragraph|sentence|word|character/i,
    /json|xml|html|markdown|plain text/i,
    /short|concise|brief|detailed|comprehensive/i,
  ],
}

function detectConfidentialData(prompt: string): { detected: boolean; removed: string[]; warning: string } {
  const removed: string[] = []
  let detected = false

  for (const [type, pattern] of Object.entries(CONFIDENTIAL_PATTERNS)) {
    const matches = prompt.match(pattern)
    if (matches) {
      detected = true
      matches.forEach(match => {
        removed.push(`${type}: ${match}`)
      })
    }
  }

  return {
    detected,
    removed,
    warning: detected 
      ? 'Confidential data detected and removed for security. Please review before using.'
      : 'No confidential data detected.',
  }
}

function removeConfidentialData(prompt: string): string {
  let cleaned = prompt
  for (const pattern of Object.values(CONFIDENTIAL_PATTERNS)) {
    cleaned = cleaned.replace(pattern, '[REDACTED]')
  }
  return cleaned
}

function analyzeFramework(prompt: string): {
  persona: number
  task: number
  context: number
  format: number
  issues: string[]
  improvements: string[]
} {
  const lower = prompt.toLowerCase()
  const issues: string[] = []
  const improvements: string[] = []

  // Analyze Persona (25 points)
  let personaScore = 0
  const hasPersona = FRAMEWORK_PATTERNS.persona.some(pattern => pattern.test(lower))
  if (hasPersona) {
    personaScore = 25
  } else {
    personaScore = 5
    issues.push('Missing persona definition - tell the AI who it should be')
    improvements.push('Add a persona: "Act as a [role]..."')
  }

  // Analyze Task (25 points)
  let taskScore = 0
  const hasTask = FRAMEWORK_PATTERNS.task.some(pattern => pattern.test(lower))
  if (hasTask) {
    taskScore = 25
  } else {
    taskScore = 5
    issues.push('Missing clear task specification')
    improvements.push('Specify exactly what you want the AI to do')
  }

  // Analyze Context (25 points)
  let contextScore = 0
  const hasContext = FRAMEWORK_PATTERNS.context.some(pattern => pattern.test(lower))
  const hasLength = prompt.length > 50
  if (hasContext && hasLength) {
    contextScore = 25
  } else if (hasContext || hasLength) {
    contextScore = 15
    issues.push('Context could be more detailed')
    improvements.push('Add background information or examples')
  } else {
    contextScore = 5
    issues.push('Missing context - provide background and goals')
    improvements.push('Share your goals and relevant examples')
  }

  // Analyze Format (25 points)
  let formatScore = 0
  const hasFormat = FRAMEWORK_PATTERNS.format.some(pattern => pattern.test(lower))
  if (hasFormat) {
    formatScore = 25
  } else {
    formatScore = 10
    issues.push('Missing format specification')
    improvements.push('Define how you want the output structured')
  }

  return {
    persona: personaScore,
    task: taskScore,
    context: contextScore,
    format: formatScore,
    issues,
    improvements,
  }
}

function optimizePrompt(prompt: string, analysis: ReturnType<typeof analyzeFramework>): string {
  let optimized = prompt
  const lower = prompt.toLowerCase()

  // Add persona if missing
  if (analysis.persona < 20) {
    optimized = `Act as a helpful AI assistant. ${optimized}`
  }

  // Add format if missing
  if (analysis.format < 20) {
    optimized = `${optimized} Please provide a clear, well-structured response.`
  }

  // Add context if missing
  if (analysis.context < 15) {
    optimized = `${optimized} Provide relevant examples and explanations.`
  }

  return optimized.trim()
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Detect and remove confidential data
    const confidentialData = detectConfidentialData(prompt)
    const cleanedPrompt = removeConfidentialData(prompt)

    // Analyze framework
    const frameworkAnalysis = analyzeFramework(cleanedPrompt)

    // Calculate total score
    const totalScore = frameworkAnalysis.persona + 
                      frameworkAnalysis.task + 
                      frameworkAnalysis.context + 
                      frameworkAnalysis.format

    // Optimize prompt
    const optimizedPrompt = optimizePrompt(cleanedPrompt, frameworkAnalysis)

    const analysis: PromptAnalysis = {
      originalPrompt: prompt,
      optimizedPrompt,
      score: totalScore,
      breakdown: {
        persona: frameworkAnalysis.persona,
        task: frameworkAnalysis.task,
        context: frameworkAnalysis.context,
        format: frameworkAnalysis.format,
      },
      issues: frameworkAnalysis.issues,
      improvements: frameworkAnalysis.improvements,
      confidentialData,
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Error optimizing prompt:', error)
    return NextResponse.json(
      { error: 'Failed to optimize prompt' },
      { status: 500 }
    )
  }
}
