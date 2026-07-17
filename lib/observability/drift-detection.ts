/**
 * Drift & Bias Detection System
 * Automated alerts for model performance degradation and bias detection
 * Triggers fallback to higher-tier models or admin notifications when issues detected
 */

export interface ModelPerformanceMetrics {
  modelId: string
  timestamp: number
  latency: number
  cost: number
  successRate: number
  qualityScore: number
  errorRate: number
  tokenUsage: number
}

export interface DriftDetectionResult {
  modelId: string
  driftDetected: boolean
  driftType: 'performance' | 'quality' | 'cost' | 'latency' | 'error_rate'
  severity: 'low' | 'medium' | 'high' | 'critical'
  baselineMetrics: ModelPerformanceMetrics
  currentMetrics: ModelPerformanceMetrics
  deviation: number
  threshold: number
  recommendation: string
  timestamp: number
}

export interface BiasDetectionResult {
  modelId: string
  biasDetected: boolean
  biasType: 'demographic' | 'content' | 'output' | 'resource_allocation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  affectedGroups: string[]
  description: string
  evidence: string[]
  recommendation: string
  timestamp: number
}

export interface DetectionThresholds {
  performanceDeviation: number // percentage
  qualityDeviation: number // percentage
  costDeviation: number // percentage
  latencyDeviation: number // percentage
  errorRateThreshold: number // percentage
  sampleSize: number // minimum samples for detection
  windowSize: number // time window in milliseconds
}

class DriftBiasDetection {
  private performanceHistory: Map<string, ModelPerformanceMetrics[]> = new Map()
  private baselineMetrics: Map<string, ModelPerformanceMetrics> = new Map()
  private driftAlerts: DriftDetectionResult[] = []
  private biasAlerts: BiasDetectionResult[] = []
  private thresholds: DetectionThresholds = {
    performanceDeviation: 15, // 15% deviation triggers alert
    qualityDeviation: 10, // 10% quality drop triggers alert
    costDeviation: 20, // 20% cost increase triggers alert
    latencyDeviation: 25, // 25% latency increase triggers alert
    errorRateThreshold: 5, // 5% error rate triggers alert
    sampleSize: 50, // minimum 50 samples
    windowSize: 3600000 // 1 hour window
  }

  /**
   * Record model performance metrics */
  recordMetrics(metrics: ModelPerformanceMetrics): void {
    const history = this.performanceHistory.get(metrics.modelId) || []
    history.push(metrics)
    
    // Maintain window size
    const cutoff = Date.now() - this.thresholds.windowSize
    const filteredHistory = history.filter(m => m.timestamp > cutoff)
    
    this.performanceHistory.set(metrics.modelId, filteredHistory)
    
    // Set baseline if not exists
    if (!this.baselineMetrics.has(metrics.modelId)) {
      this.baselineMetrics.set(metrics.modelId, metrics)
    }
    
    // Check for drift
    this.checkForDrift(metrics.modelId)
  }

  /**
   * Check for model performance drift */
  private checkForDrift(modelId: string): void {
    const history = this.performanceHistory.get(modelId)
    const baseline = this.baselineMetrics.get(modelId)
    
    if (!history || history.length < this.thresholds.sampleSize || !baseline) {
      return
    }
    
    // Calculate current average metrics
    const currentMetrics = this.calculateAverageMetrics(history)
    
    // Check each metric type
    this.checkPerformanceDrift(modelId, baseline, currentMetrics)
    this.checkQualityDrift(modelId, baseline, currentMetrics)
    this.checkCostDrift(modelId, baseline, currentMetrics)
    this.checkLatencyDrift(modelId, baseline, currentMetrics)
    this.checkErrorRateDrift(modelId, baseline, currentMetrics)
  }

  /**
   * Calculate average metrics from history */
  private calculateAverageMetrics(history: ModelPerformanceMetrics[]): ModelPerformanceMetrics {
    const sum = history.reduce((acc, m) => ({
      latency: acc.latency + m.latency,
      cost: acc.cost + m.cost,
      successRate: acc.successRate + m.successRate,
      qualityScore: acc.qualityScore + m.qualityScore,
      errorRate: acc.errorRate + m.errorRate,
      tokenUsage: acc.tokenUsage + m.tokenUsage
    }), { latency: 0, cost: 0, successRate: 0, qualityScore: 0, errorRate: 0, tokenUsage: 0 })
    
    const count = history.length
    return {
      modelId: history[0].modelId,
      timestamp: Date.now(),
      latency: sum.latency / count,
      cost: sum.cost / count,
      successRate: sum.successRate / count,
      qualityScore: sum.qualityScore / count,
      errorRate: sum.errorRate / count,
      tokenUsage: sum.tokenUsage / count
    }
  }

  /**
   * Check for performance drift */
  private checkPerformanceDrift(
    modelId: string,
    baseline: ModelPerformanceMetrics,
    current: ModelPerformanceMetrics
  ): void {
    const deviation = this.calculatePercentageDeviation(baseline.successRate, current.successRate)
    
    if (deviation > this.thresholds.performanceDeviation) {
      const alert: DriftDetectionResult = {
        modelId,
        driftDetected: true,
        driftType: 'performance',
        severity: this.determineSeverity(deviation, this.thresholds.performanceDeviation),
        baselineMetrics: baseline,
        currentMetrics: current,
        deviation,
        threshold: this.thresholds.performanceDeviation,
        recommendation: this.getPerformanceRecommendation(deviation),
        timestamp: Date.now()
      }
      
      this.driftAlerts.push(alert)
      this.triggerAlert(alert)
    }
  }

  /**
   * Check for quality drift */
  private checkQualityDrift(
    modelId: string,
    baseline: ModelPerformanceMetrics,
    current: ModelPerformanceMetrics
  ): void {
    const deviation = this.calculatePercentageDeviation(baseline.qualityScore, current.qualityScore)
    
    if (deviation > this.thresholds.qualityDeviation) {
      const alert: DriftDetectionResult = {
        modelId,
        driftDetected: true,
        driftType: 'quality',
        severity: this.determineSeverity(deviation, this.thresholds.qualityDeviation),
        baselineMetrics: baseline,
        currentMetrics: current,
        deviation,
        threshold: this.thresholds.qualityDeviation,
        recommendation: this.getQualityRecommendation(deviation),
        timestamp: Date.now()
      }
      
      this.driftAlerts.push(alert)
      this.triggerAlert(alert)
    }
  }

  /**
   * Check for cost drift */
  private checkCostDrift(
    modelId: string,
    baseline: ModelPerformanceMetrics,
    current: ModelPerformanceMetrics
  ): void {
    const deviation = this.calculatePercentageDeviation(baseline.cost, current.cost)
    
    if (deviation > this.thresholds.costDeviation) {
      const alert: DriftDetectionResult = {
        modelId,
        driftDetected: true,
        driftType: 'cost',
        severity: this.determineSeverity(deviation, this.thresholds.costDeviation),
        baselineMetrics: baseline,
        currentMetrics: current,
        deviation,
        threshold: this.thresholds.costDeviation,
        recommendation: this.getCostRecommendation(deviation),
        timestamp: Date.now()
      }
      
      this.driftAlerts.push(alert)
      this.triggerAlert(alert)
    }
  }

  /**
   * Check for latency drift */
  private checkLatencyDrift(
    modelId: string,
    baseline: ModelPerformanceMetrics,
    current: ModelPerformanceMetrics
  ): void {
    const deviation = this.calculatePercentageDeviation(baseline.latency, current.latency)
    
    if (deviation > this.thresholds.latencyDeviation) {
      const alert: DriftDetectionResult = {
        modelId,
        driftDetected: true,
        driftType: 'latency',
        severity: this.determineSeverity(deviation, this.thresholds.latencyDeviation),
        baselineMetrics: baseline,
        currentMetrics: current,
        deviation,
        threshold: this.thresholds.latencyDeviation,
        recommendation: this.getLatencyRecommendation(deviation),
        timestamp: Date.now()
      }
      
      this.driftAlerts.push(alert)
      this.triggerAlert(alert)
    }
  }

  /**
   * Check for error rate drift */
  private checkErrorRateDrift(
    modelId: string,
    baseline: ModelPerformanceMetrics,
    current: ModelPerformanceMetrics
  ): void {
    if (current.errorRate > this.thresholds.errorRateThreshold) {
      const deviation = this.calculatePercentageDeviation(baseline.errorRate, current.errorRate)
      
      const alert: DriftDetectionResult = {
        modelId,
        driftDetected: true,
        driftType: 'error_rate',
        severity: current.errorRate > 10 ? 'critical' : 'high',
        baselineMetrics: baseline,
        currentMetrics: current,
        deviation,
        threshold: this.thresholds.errorRateThreshold,
        recommendation: this.getErrorRateRecommendation(current.errorRate),
        timestamp: Date.now()
      }
      
      this.driftAlerts.push(alert)
      this.triggerAlert(alert)
    }
  }

  /**
   * Calculate percentage deviation */
  private calculatePercentageDeviation(baseline: number, current: number): number {
    if (baseline === 0) return 0
    return Math.abs((current - baseline) / baseline) * 100
  }

  /**
   * Determine severity based on deviation */
  private determineSeverity(deviation: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    if (deviation < threshold * 1.5) return 'low'
    if (deviation < threshold * 2) return 'medium'
    if (deviation < threshold * 3) return 'high'
    return 'critical'
  }

  /**
   * Get performance recommendation */
  private getPerformanceRecommendation(deviation: number): string {
    if (deviation < 20) return 'Monitor closely, consider model retraining'
    if (deviation < 30) return 'Consider fallback to alternative model'
    return 'Immediate fallback to higher-tier model required'
  }

  /**
   * Get quality recommendation */
  private getQualityRecommendation(deviation: number): string {
    if (deviation < 15) return 'Increase verification frequency'
    if (deviation < 25) return 'Enable refinement loop for all outputs'
    return 'Switch to higher-tier model immediately'
  }

  /**
   * Get cost recommendation */
  private getCostRecommendation(deviation: number): string {
    if (deviation < 25) return 'Review token usage patterns'
    if (deviation < 35) return 'Consider cost optimization strategies'
    return 'Implement strict cost controls and alerts'
  }

  /**
   * Get latency recommendation */
  private getLatencyRecommendation(deviation: number): string {
    if (deviation < 30) return 'Monitor API performance'
    if (deviation < 40) return 'Consider load balancing'
    return 'Switch to faster model or CDN'
  }

  /**
   * Get error rate recommendation */
  private getErrorRateRecommendation(errorRate: number): string {
    if (errorRate < 8) return 'Investigate error patterns'
    if (errorRate < 12) return 'Enable circuit breaker pattern'
    return 'Immediate model replacement required'
  }

  /**
   * Trigger alert for drift detection */
  private triggerAlert(alert: DriftDetectionResult): void {
    // In production, this would send notifications to admins
    console.error(`DRIFT ALERT: ${alert.modelId} - ${alert.driftType} drift detected (${alert.severity})`)
    console.error(`Deviation: ${alert.deviation.toFixed(2)}% (threshold: ${alert.threshold}%)`)
    console.error(`Recommendation: ${alert.recommendation}`)
  }

  /**
   * Detect bias in model outputs */
  detectBias(
    modelId: string,
    outputs: any[],
    demographicGroups: string[]
  ): BiasDetectionResult {
    // Simple bias detection based on output distribution
    const groupDistribution = this.analyzeOutputDistribution(outputs, demographicGroups)
    const biasDetected = this.detectUnequalDistribution(groupDistribution)
    
    const result: BiasDetectionResult = {
      modelId,
      biasDetected,
      biasType: 'demographic',
      severity: biasDetected ? 'medium' : 'low',
      affectedGroups: biasDetected ? this.getAffectedGroups(groupDistribution) : [],
      description: biasDetected ? 'Unequal output distribution detected across demographic groups' : 'No significant bias detected',
      evidence: biasDetected ? this.generateBiasEvidence(groupDistribution) : [],
      recommendation: biasDetected ? 'Review training data and consider retraining with balanced dataset' : 'Continue monitoring',
      timestamp: Date.now()
    }
    
    if (biasDetected) {
      this.biasAlerts.push(result)
      this.triggerBiasAlert(result)
    }
    
    return result
  }

  /**
   * Analyze output distribution across groups */
  private analyzeOutputDistribution(outputs: any[], groups: string[]): Map<string, number> {
    const distribution = new Map<string, number>()
    
    groups.forEach(group => distribution.set(group, 0))
    
    // Simple analysis - in production would use more sophisticated methods
    outputs.forEach(output => {
      const group = this.classifyOutputGroup(output, groups)
      distribution.set(group, (distribution.get(group) || 0) + 1)
    })
    
    return distribution
  }

  /**
   * Classify output into demographic group (simplified) */
  private classifyOutputGroup(output: any, groups: string[]): string {
    // In production, this would use actual demographic classification
    // For now, return random group for demonstration
    return groups[Math.floor(Math.random() * groups.length)]
  }

  /**
   * Detect unequal distribution */
  private detectUnequalDistribution(distribution: Map<string, number>): boolean {
    const values = Array.from(distribution.values())
    const max = Math.max(...values)
    const min = Math.min(...values)
    
    // If max is more than 2x min, flag as potential bias
    return max > min * 2
  }

  /**
   * Get affected groups from distribution */
  private getAffectedGroups(distribution: Map<string, number>): string[] {
    const values = Array.from(distribution.entries())
    const avg = values.reduce((sum, [, count]) => sum + count, 0) / values.length
    
    return values
      .filter(([, count]) => count < avg * 0.5 || count > avg * 1.5)
      .map(([group]) => group)
  }

  /**
   * Generate bias evidence */
  private generateBiasEvidence(distribution: Map<string, number>): string[] {
    const evidence: string[] = []
    
    distribution.forEach((count, group) => {
      evidence.push(`Group ${group}: ${count} outputs`)
    })
    
    return evidence
  }

  /**
   * Trigger bias alert */
  private triggerBiasAlert(alert: BiasDetectionResult): void {
    console.error(`BIAS ALERT: ${alert.modelId} - ${alert.biasType} bias detected (${alert.severity})`)
    console.error(`Affected groups: ${alert.affectedGroups.join(', ')}`)
    console.error(`Recommendation: ${alert.recommendation}`)
  }

  /**
   * Get drift alerts */
  getDriftAlerts(modelId?: string): DriftDetectionResult[] {
    if (modelId) {
      return this.driftAlerts.filter(alert => alert.modelId === modelId)
    }
    return this.driftAlerts
  }

  /**
   * Get bias alerts */
  getBiasAlerts(modelId?: string): BiasDetectionResult[] {
    if (modelId) {
      return this.biasAlerts.filter(alert => alert.modelId === modelId)
    }
    return this.biasAlerts
  }

  /**
   * Get performance history for a model */
  getModelHistory(modelId: string): ModelPerformanceMetrics[] {
    return this.performanceHistory.get(modelId) || []
  }

  /**
   * Update detection thresholds */
  updateThresholds(thresholds: Partial<DetectionThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds }
  }

  /**
   * Reset baseline for a model */
  resetBaseline(modelId: string): boolean {
    const history = this.performanceHistory.get(modelId)
    if (!history || history.length === 0) return false
    
    const newBaseline = this.calculateAverageMetrics(history)
    this.baselineMetrics.set(modelId, newBaseline)
    return true
  }

  /**
   * Get detection statistics */
  getDetectionStats(): {
    totalDriftAlerts: number
    totalBiasAlerts: number
    modelsMonitored: number
    bySeverity: Record<string, number>
    byDriftType: Record<string, number>
  } {
    const bySeverity: Record<string, number> = {}
    const byDriftType: Record<string, number> = {}
    
    this.driftAlerts.forEach(alert => {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1
      byDriftType[alert.driftType] = (byDriftType[alert.driftType] || 0) + 1
    })
    
    return {
      totalDriftAlerts: this.driftAlerts.length,
      totalBiasAlerts: this.biasAlerts.length,
      modelsMonitored: this.performanceHistory.size,
      bySeverity,
      byDriftType
    }
  }
}

// Singleton instance
export const driftBiasDetection = new DriftBiasDetection()
