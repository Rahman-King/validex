/**
 * Validex SDK for Developers
 * Simple library that abstracts complex routing, caching, and verification logic
 * Provides a single-line interface for external applications
 */

export interface ValidexConfig {
  apiKey?: string
  baseUrl?: string
  defaultMode?: 'fast_cheap' | 'balanced' | 'premium'
  enableCaching?: boolean
  enableVerification?: boolean
  enablePIIProtection?: boolean
  maxTokens?: number
  timeout?: number
}

export interface ChatOptions {
  mode?: 'fast_cheap' | 'balanced' | 'premium'
  taskMode?: string
  sessionId?: string
  enableVerification?: boolean
  enablePIIProtection?: boolean
  streaming?: boolean
  maxTokens?: number
  onProgress?: (progress: number, text: string) => void
}

export interface ChatResponse {
  success: boolean
  response: string
  metadata: {
    modelUsed: string
    tier: number
    tokensUsed: number
    cost: number
    latency: number
    cacheHit: boolean
    verification?: {
      passed: boolean
      score: number
      issues: string[]
    }
  }
  error?: string
}

class ValidexSDK {
  private config: ValidexConfig
  private baseUrl: string

  constructor(config: ValidexConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.FIREWORKS_API_KEY || '',
      baseUrl: config.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      defaultMode: config.defaultMode || 'balanced',
      enableCaching: config.enableCaching !== false,
      enableVerification: config.enableVerification !== false,
      enablePIIProtection: config.enablePIIProtection !== false,
      maxTokens: config.maxTokens || 1000,
      timeout: config.timeout || 30000
    }
    this.baseUrl = this.config.baseUrl || 'http://localhost:3000'
  }

  /**
   * Simple chat interface - single line of code */
  async chat(prompt: string, options: ChatOptions = {}): Promise<ChatResponse> {
    const startTime = Date.now()
    
    try {
      // Apply PII protection if enabled
      const processedPrompt = options.enablePIIProtection !== false && this.config.enablePIIProtection
        ? await this.protectPII(prompt)
        : prompt

      // Prepare request
      const requestBody = {
        prompt: processedPrompt,
        messages: [{ role: 'user', content: processedPrompt }],
        routingConfig: {
          mode: options.mode || this.config.defaultMode,
          taskMode: options.taskMode || 'general',
          maxOutput: options.maxTokens || this.config.maxTokens
        },
        sessionId: options.sessionId,
        enableVerification: options.enableVerification !== false && this.config.enableVerification
      }

      // Make API call
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const data = await response.json()
      const latency = Date.now() - startTime

      // Extract metadata
      const metadata = this.extractMetadata(data, latency)

      return {
        success: true,
        response: data.text || data.response || '',
        metadata,
        error: undefined
      }

    } catch (error) {
      return {
        success: false,
        response: '',
        metadata: {
          modelUsed: '',
          tier: 0,
          tokensUsed: 0,
          cost: 0,
          latency: Date.now() - startTime,
          cacheHit: false
        },
        error: String(error)
      }
    }
  }

  /**
   * Streaming chat interface */
  async *chatStream(
    prompt: string,
    options: ChatOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const processedPrompt = options.enablePIIProtection !== false && this.config.enablePIIProtection
      ? await this.protectPII(prompt)
      : prompt

    const requestBody = {
      prompt: processedPrompt,
      messages: [{ role: 'user', content: processedPrompt }],
      routingConfig: {
        mode: options.mode || this.config.defaultMode,
        taskMode: options.taskMode || 'general',
        maxOutput: options.maxTokens || this.config.maxTokens
      },
      sessionId: options.sessionId,
      stream: true
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const text = parsed.text || parsed.content || ''
            if (text) {
              yield text
              if (options.onProgress) {
                options.onProgress(0, text)
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  /**
   * Get cost estimate before execution */
  async estimateCost(prompt: string, options: ChatOptions = {}): Promise<{
    estimatedCost: number
    estimatedLatency: number
    recommendedTier: number
    reasoning: string
  }> {
    const requestBody = {
      prompt,
      routingConfig: {
        mode: options.mode || this.config.defaultMode,
        taskMode: options.taskMode || 'general',
        maxOutput: options.maxTokens || this.config.maxTokens
      }
    }

    const response = await fetch(`${this.baseUrl}/api/cost-estimate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Verify AI output */
  async verifyOutput(prompt: string, output: string, taskMode: string = 'general'): Promise<{
    success: boolean
    overallStatus: string
    overallScore: number
    stages: any
    recommendations: string[]
  }> {
    const requestBody = {
      data: { prompt, answer: output },
      taskMode,
      verificationLevel: 'standard'
    }

    const response = await fetch(`${this.baseUrl}/api/verify-output`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Optimize prompt */
  async optimizePrompt(prompt: string): Promise<{
    originalPrompt: string
    optimizedPrompt: string
    score: number
    improvements: string[]
  }> {
    const requestBody = { prompt }

    const response = await fetch(`${this.baseUrl}/api/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Protect PII in text */
  private async protectPII(text: string): Promise<string> {
    // Import PII redaction dynamically
    const { redactPII } = await import('@/lib/security/pii-redaction')
    const result = redactPII(text)
    return result.redacted
  }

  /**
   * Extract metadata from API response */
  private extractMetadata(data: any, latency: number): ChatResponse['metadata'] {
    return {
      modelUsed: data.modelUsed || data.model || 'unknown',
      tier: data.tier || data.selectedTier || 1,
      tokensUsed: data.tokensUsed || data.usage?.totalTokens || 0,
      cost: data.cost || data.estimatedCost || 0,
      latency,
      cacheHit: data.cacheHit || false,
      verification: data.verification ? {
        passed: data.verification.overallStatus === 'valid',
        score: data.verification.overallScore || 0,
        issues: data.verification.issues || []
      } : undefined
    }
  }

  /**
   * Update configuration */
  updateConfig(config: Partial<ValidexConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration */
  getConfig(): ValidexConfig {
    return { ...this.config }
  }
}

/**
 * Create a Validex SDK instance */
export function createValidex(config?: ValidexConfig): ValidexSDK {
  return new ValidexSDK(config)
}

/**
 * Default SDK instance */
export const validex = new ValidexSDK()

/**
 * Convenience function for single-line usage */
export async function chat(prompt: string, options?: ChatOptions): Promise<ChatResponse> {
  return validex.chat(prompt, options)
}
