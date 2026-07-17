/**
 * Cost Forecasting System
 * Provides dry-run estimation before executing queries
 * Allows users to choose between "Fast/Cheap" vs "Premium" modes
 */

export interface CostEstimate {
  prompt: string
  estimatedTokens: {
    input: number
    output: number
    total: number
  }
  estimatedCost: {
    tier1: number
    tier2: number
    recommended: number
  }
  estimatedLatency: {
    tier1: number
    tier2: number
    recommended: number
  }
  complexity: number
  recommendedTier: number
  reasoning: string
  alternatives: {
    mode: 'fast_cheap' | 'balanced' | 'premium'
    cost: number
    latency: number
    quality: string
  }[]
}

export interface ForecastingOptions {
  includeAlternatives: boolean
  includeQualityEstimate: boolean
  maxTokens: number
  preferredMode?: 'fast_cheap' | 'balanced' | 'premium'
}

class CostForecasting {
  private tokenCosts = {
    tier1: {
      input: 0.0001, // $0.0001 per 1K tokens
      output: 0.0002
    },
    tier2: {
      input: 0.0005,
      output: 0.001
    }
  }

  private latencyEstimates = {
    tier1: {
      base: 1000, // 1 second base latency
      perToken: 0.01 // 10ms per 1K tokens
    },
    tier2: {
      base: 2000,
      perToken: 0.005
    }
  }

  /**
   * Estimate token usage for a prompt */
  estimateTokens(prompt: string, maxOutputTokens: number = 1000): {
    input: number
    output: number
    total: number
  } {
    // Rough estimation: ~4 characters per token
    const inputTokens = Math.ceil(prompt.length / 4)
    const outputTokens = maxOutputTokens
    
    return {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens
    }
  }

  /**
   * Estimate complexity of a prompt */
  estimateComplexity(prompt: string): number {
    let complexity = 0
    
    // Length factor
    complexity += Math.min(prompt.length / 100, 30)
    
    // Complexity indicators
    const complexityIndicators = [
      { pattern: /code|function|class|algorithm/gi, weight: 15 },
      { pattern: /math|calculate|equation|formula/gi, weight: 12 },
      { pattern: /analyze|reason|logic|deduction/gi, weight: 10 },
      { pattern: /research|investigate|study/gi, weight: 8 },
      { pattern: /creative|write|story|imagine/gi, weight: 7 },
      { pattern: /debug|fix|error|issue/gi, weight: 12 },
      { pattern: /optimize|improve|enhance/gi, weight: 10 }
    ]
    
    complexityIndicators.forEach(({ pattern, weight }) => {
      const matches = prompt.match(pattern)
      if (matches) {
        complexity += matches.length * weight
      }
    })
    
    // Multi-step indicators
    const multiStepPatterns = [
      /then|after that|next|finally|first|second|third/gi,
      /step \d+|phase \d+|part \d+/gi
    ]
    
    multiStepPatterns.forEach(pattern => {
      const matches = prompt.match(pattern)
      if (matches) {
        complexity += matches.length * 5
      }
    })
    
    return Math.min(complexity, 100)
  }

  /**
   * Estimate cost for given tokens and tier */
  estimateCost(tokens: { input: number; output: number }, tier: number): number {
    const tierCosts = tier === 2 ? this.tokenCosts.tier2 : this.tokenCosts.tier1
    
    const inputCost = (tokens.input / 1000) * tierCosts.input
    const outputCost = (tokens.output / 1000) * tierCosts.output
    
    return inputCost + outputCost
  }

  /**
   * Estimate latency for given tokens and tier */
  estimateLatency(tokens: { input: number; output: number }, tier: number): number {
    const tierLatency = tier === 2 ? this.latencyEstimates.tier2 : this.latencyEstimates.tier1
    
    const totalTokens = tokens.input + tokens.output
    const tokenLatency = (totalTokens / 1000) * tierLatency.perToken
    
    return tierLatency.base + tokenLatency
  }

  /**
   * Generate comprehensive cost forecast */
  generateForecast(
    prompt: string,
    options: ForecastingOptions = { includeAlternatives: true, includeQualityEstimate: true, maxTokens: 1000 }
  ): CostEstimate {
    const tokens = this.estimateTokens(prompt, options.maxTokens)
    const complexity = this.estimateComplexity(prompt)
    const recommendedTier = complexity > 60 ? 2 : 1
    
    const tier1Cost = this.estimateCost(tokens, 1)
    const tier2Cost = this.estimateCost(tokens, 2)
    
    const tier1Latency = this.estimateLatency(tokens, 1)
    const tier2Latency = this.estimateLatency(tokens, 2)
    
    const alternatives = options.includeAlternatives ? this.generateAlternatives(tokens, complexity) : []
    
    return {
      prompt,
      estimatedTokens: tokens,
      estimatedCost: {
        tier1: tier1Cost,
        tier2: tier2Cost,
        recommended: recommendedTier === 2 ? tier2Cost : tier1Cost
      },
      estimatedLatency: {
        tier1: tier1Latency,
        tier2: tier2Latency,
        recommended: recommendedTier === 2 ? tier2Latency : tier1Latency
      },
      complexity,
      recommendedTier,
      reasoning: this.generateReasoning(complexity, recommendedTier),
      alternatives
    }
  }

  /**
   * Generate alternative mode options */
  private generateAlternatives(
    tokens: { input: number; output: number },
    complexity: number
  ): CostEstimate['alternatives'] {
    const tier1Cost = this.estimateCost(tokens, 1)
    const tier2Cost = this.estimateCost(tokens, 2)
    
    const tier1Latency = this.estimateLatency(tokens, 1)
    const tier2Latency = this.estimateLatency(tokens, 2)
    
    return [
      {
        mode: 'fast_cheap',
        cost: tier1Cost,
        latency: tier1Latency,
        quality: complexity > 50 ? 'Lower quality for complex tasks' : 'Good quality for simple tasks'
      },
      {
        mode: 'balanced',
        cost: complexity > 60 ? tier2Cost : tier1Cost,
        latency: complexity > 60 ? tier2Latency : tier1Latency,
        quality: 'Optimal balance of cost and quality'
      },
      {
        mode: 'premium',
        cost: tier2Cost,
        latency: tier2Latency,
        quality: 'Highest quality, best for complex tasks'
      }
    ]
  }

  /**
   * Generate reasoning for tier recommendation */
  private generateReasoning(complexity: number, recommendedTier: number): string {
    if (complexity < 40) {
      return 'Low complexity task - Tier 1 model sufficient for optimal cost-performance ratio'
    }
    
    if (complexity < 60) {
      return 'Moderate complexity - Tier 1 recommended, Tier 2 available if higher quality needed'
    }
    
    if (complexity < 80) {
      return 'High complexity - Tier 2 recommended for quality, Tier 1 available for cost savings'
    }
    
    return 'Very high complexity - Tier 2 required for accurate results, quality justifies cost'
  }

  /**
   * Perform dry run without execution */
  async dryRun(
    prompt: string,
    options: ForecastingOptions = { includeAlternatives: true, includeQualityEstimate: true, maxTokens: 1000 }
  ): Promise<{
    forecast: CostEstimate
    recommendation: string
    shouldProceed: boolean
    warnings: string[]
  }> {
    const forecast = this.generateForecast(prompt, options)
    const warnings: string[] = []
    
    // Check for high cost
    if (forecast.estimatedCost.recommended > 0.1) {
      warnings.push(`High cost estimated: $${forecast.estimatedCost.recommended.toFixed(4)}`)
    }
    
    // Check for high latency
    if (forecast.estimatedLatency.recommended > 5000) {
      warnings.push(`High latency estimated: ${forecast.estimatedLatency.recommended}ms`)
    }
    
    // Check for very high complexity
    if (forecast.complexity > 80) {
      warnings.push('Very high complexity task - consider breaking into smaller sub-tasks')
    }
    
    const recommendation = this.generateRecommendation(forecast, options.preferredMode)
    const shouldProceed = warnings.length === 0 || options.preferredMode === 'premium'
    
    return {
      forecast,
      recommendation,
      shouldProceed,
      warnings
    }
  }

  /**
   * Generate execution recommendation */
  private generateRecommendation(
    forecast: CostEstimate,
    preferredMode?: 'fast_cheap' | 'balanced' | 'premium'
  ): string {
    if (preferredMode === 'fast_cheap') {
      return `Recommended: Fast/Cheap mode using Tier 1. Estimated cost: $${forecast.estimatedCost.tier1.toFixed(4)}, latency: ${forecast.estimatedLatency.tier1}ms`
    }
    
    if (preferredMode === 'premium') {
      return `Recommended: Premium mode using Tier 2. Estimated cost: $${forecast.estimatedCost.tier2.toFixed(4)}, latency: ${forecast.estimatedLatency.tier2}ms`
    }
    
    return `Recommended: Balanced mode using Tier ${forecast.recommendedTier}. Estimated cost: $${forecast.estimatedCost.recommended.toFixed(4)}, latency: ${forecast.estimatedLatency.recommended}ms`
  }

  /**
   * Get cost comparison between tiers */
  compareTiers(prompt: string, maxOutputTokens: number = 1000): {
    tier1: { cost: number; latency: number; quality: string }
    tier2: { cost: number; latency: number; quality: string }
    savings: { cost: number; percentage: number }
    recommendation: string
  } {
    const tokens = this.estimateTokens(prompt, maxOutputTokens)
    
    const tier1Cost = this.estimateCost(tokens, 1)
    const tier2Cost = this.estimateCost(tokens, 2)
    
    const tier1Latency = this.estimateLatency(tokens, 1)
    const tier2Latency = this.estimateLatency(tokens, 2)
    
    const costSavings = tier2Cost - tier1Cost
    const savingsPercentage = (costSavings / tier2Cost) * 100
    
    return {
      tier1: {
        cost: tier1Cost,
        latency: tier1Latency,
        quality: 'Good for simple tasks, may struggle with complexity'
      },
      tier2: {
        cost: tier2Cost,
        latency: tier2Latency,
        quality: 'Excellent for complex tasks, higher accuracy'
      },
      savings: {
        cost: costSavings,
        percentage: savingsPercentage
      },
      recommendation: costSavings > 0.05 
        ? `Tier 1 saves $${costSavings.toFixed(4)} (${savingsPercentage.toFixed(1)}%) but may reduce quality for complex tasks`
        : 'Cost difference is minimal - consider Tier 2 for better quality'
    }
  }

  /**
   * Update token costs */
  updateTokenCosts(tier: 1 | 2, costs: { input: number; output: number }): void {
    if (tier === 1) {
      this.tokenCosts.tier1 = costs
    } else {
      this.tokenCosts.tier2 = costs
    }
  }

  /**
   * Update latency estimates */
  updateLatencyEstimates(tier: 1 | 2, estimates: { base: number; perToken: number }): void {
    if (tier === 1) {
      this.latencyEstimates.tier1 = estimates
    } else {
      this.latencyEstimates.tier2 = estimates
    }
  }
}

// Singleton instance
export const costForecasting = new CostForecasting()
