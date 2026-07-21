/**
 * Paritok Token Optimization Integration
 * Middleware for token-efficient AI operations using Paritok compression model
 * Reduces input tokens by ~74% while maintaining quality
 */

export interface ParitokConfig {
  enabled: boolean
  useGpuServer: boolean
  gpuServerApiKey?: string
  localBaseUrl?: string
  localModel?: string
  proxyPort?: number
}

export interface ParitokCompressionResult {
  originalTokens: number
  compressedTokens: number
  compressionRatio: number
  costSavings: number
  compressedContent: string
}

class ParitokIntegration {
  private config: ParitokConfig
  private proxyUrl: string

  constructor(config: ParitokConfig = { enabled: true, useGpuServer: false }) {
    this.config = {
      enabled: config.enabled !== false,
      useGpuServer: config.useGpuServer || false,
      gpuServerApiKey: config.gpuServerApiKey || process.env.PARITOK_API_KEY,
      localBaseUrl: config.localBaseUrl || 'http://localhost:11434/v1',
      localModel: config.localModel || 'paritok-4b-v1',
      proxyPort: config.proxyPort || 8080
    }

    this.proxyUrl = `http://127.0.0.1:${this.config.proxyPort}`
  }

  /**
   * Check if Paritok proxy is available */
  async isAvailable(): Promise<boolean> {
    if (!this.config.enabled) return false

    try {
      const response = await fetch(`${this.proxyUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000)
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Compress content using Paritok */
  async compressContent(content: string): Promise<ParitokCompressionResult> {
    if (!this.config.enabled) {
      return {
        originalTokens: this.estimateTokens(content),
        compressedTokens: this.estimateTokens(content),
        compressionRatio: 1,
        costSavings: 0,
        compressedContent: content
      }
    }

    const originalTokens = this.estimateTokens(content)

    try {
      const response = await fetch(`${this.proxyUrl}/compress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.gpuServerApiKey && {
            'Authorization': `Bearer ${this.config.gpuServerApiKey}`
          })
        },
        body: JSON.stringify({
          content,
          model: this.config.useGpuServer ? 'gpu-server' : this.config.localModel
        })
      })

      if (!response.ok) {
        throw new Error(`Paritok compression failed: ${response.statusText}`)
      }

      const result = await response.json()
      const compressedTokens = this.estimateTokens(result.compressed_content)
      const compressionRatio = originalTokens / compressedTokens
      const costSavings = (1 - 1 / compressionRatio) * 100

      return {
        originalTokens,
        compressedTokens,
        compressionRatio,
        costSavings,
        compressedContent: result.compressed_content
      }
    } catch (error) {
      console.warn('Paritok compression failed, using original content:', error)
      return {
        originalTokens,
        compressedTokens: originalTokens,
        compressionRatio: 1,
        costSavings: 0,
        compressedContent: content
      }
    }
  }

  /**
   * Compress messages array for LLM API */
  async compressMessages(messages: any[]): Promise<{
    compressedMessages: any[]
    compressionResult: ParitokCompressionResult
  }> {
    const content = messages.map(m => m.content).join('\n')
    const compressionResult = await this.compressContent(content)

    // For now, return original messages with compression stats
    // In production, you'd need to reconstruct the compressed messages
    return {
      compressedMessages: messages,
      compressionResult
    }
  }

  /**
   * Estimate token count (rough approximation) */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  /**
   * Get compression statistics */
  getStats(): {
    enabled: boolean
    useGpuServer: boolean
    proxyUrl: string
  } {
    return {
      enabled: this.config.enabled,
      useGpuServer: this.config.useGpuServer,
      proxyUrl: this.proxyUrl
    }
  }

  /**
   * Update configuration */
  updateConfig(config: Partial<ParitokConfig>): void {
    this.config = { ...this.config, ...config }
    if (config.proxyPort) {
      this.proxyUrl = `http://127.0.0.1:${config.proxyPort}`
    }
  }
}

// Singleton instance
export const paritokIntegration = new ParitokIntegration()

/**
 * Middleware function to compress content before sending to LLM */
export async function withParitokCompression<T>(
  content: string,
  operation: (compressedContent: string) => Promise<T>
): Promise<{ result: T; compression: ParitokCompressionResult }> {
  const compression = await paritokIntegration.compressContent(content)
  const result = await operation(compression.compressedContent)
  return { result, compression }
}
