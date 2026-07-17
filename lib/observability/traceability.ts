/**
 * Traceability & Audit Log System
 * Provides detailed reasoning traces and audit trails for routing decisions
 * Enables debugging, compliance, and transparency
 */

export interface RoutingDecisionTrace {
  timestamp: number
  requestId: string
  userId?: string
  originalPrompt: string
  processedPrompt: string
  
  // Routing factors
  routingFactors: {
    complexity: number
    intent: string
    confidence: number
    costPrediction: number
    latencyPrediction: number
    userPreferences?: any
  }
  
  // Model selection
  modelSelection: {
    selectedTier: number
    selectedModel: string
    alternativeModels: string[]
    selectionReason: string
    fallbackUsed: boolean
  }
  
  // Performance
  performance: {
    actualLatency: number
    actualCost: number
    tokensUsed: number
    cacheHit: boolean
    cacheType?: string
  }
  
  // Verification
  verification?: {
    stagesCompleted: string[]
    overallScore: number
    issuesDetected: string[]
    refinementUsed: boolean
  }
}

export interface AuditLogEntry {
  timestamp: number
  level: 'info' | 'warning' | 'error' | 'critical'
  category: 'routing' | 'verification' | 'security' | 'performance' | 'api'
  message: string
  details?: any
  requestId?: string
  userId?: string
}

class TraceabilitySystem {
  private traces: Map<string, RoutingDecisionTrace> = new Map()
  private auditLogs: AuditLogEntry[] = []
  private maxLogSize = 10000

  /**
   * Create a new routing decision trace */
  createTrace(requestId: string, userId?: string): RoutingDecisionTrace {
    const trace: RoutingDecisionTrace = {
      timestamp: Date.now(),
      requestId,
      userId,
      originalPrompt: '',
      processedPrompt: '',
      routingFactors: {
        complexity: 0,
        intent: '',
        confidence: 0,
        costPrediction: 0,
        latencyPrediction: 0
      },
      modelSelection: {
        selectedTier: 0,
        selectedModel: '',
        alternativeModels: [],
        selectionReason: '',
        fallbackUsed: false
      },
      performance: {
        actualLatency: 0,
        actualCost: 0,
        tokensUsed: 0,
        cacheHit: false
      }
    }
    
    this.traces.set(requestId, trace)
    this.logAudit('info', 'routing', `Created trace for request ${requestId}`, { requestId })
    
    return trace
  }

  /**
   * Update routing factors in trace */
  updateRoutingFactors(requestId: string, factors: Partial<RoutingDecisionTrace['routingFactors']>): void {
    const trace = this.traces.get(requestId)
    if (trace) {
      trace.routingFactors = { ...trace.routingFactors, ...factors }
    }
  }

  /**
   * Update model selection in trace */
  updateModelSelection(requestId: string, selection: Partial<RoutingDecisionTrace['modelSelection']>): void {
    const trace = this.traces.get(requestId)
    if (trace) {
      trace.modelSelection = { ...trace.modelSelection, ...selection }
      this.logAudit('info', 'routing', `Model selected: ${selection.selectedModel}`, {
        requestId,
        model: selection.selectedModel,
        tier: selection.selectedTier
      })
    }
  }

  /**
   * Update performance metrics in trace */
  updatePerformance(requestId: string, performance: Partial<RoutingDecisionTrace['performance']>): void {
    const trace = this.traces.get(requestId)
    if (trace) {
      trace.performance = { ...trace.performance, ...performance }
    }
  }

  /**
   * Update verification results in trace */
  updateVerification(requestId: string, verification: RoutingDecisionTrace['verification']): void {
    const trace = this.traces.get(requestId)
    if (trace) {
      trace.verification = verification
    }
  }

  /**
   * Get trace by request ID */
  getTrace(requestId: string): RoutingDecisionTrace | undefined {
    return this.traces.get(requestId)
  }

  /**
   * Get all traces for a user */
  getUserTraces(userId: string): RoutingDecisionTrace[] {
    return Array.from(this.traces.values()).filter(trace => trace.userId === userId)
  }

  /**
   * Get traces within time range */
  getTracesByTimeRange(startTime: number, endTime: number): RoutingDecisionTrace[] {
    return Array.from(this.traces.values()).filter(
      trace => trace.timestamp >= startTime && trace.timestamp <= endTime
    )
  }

  /**
   * Generate human-readable reasoning trace */
  generateReasoningTrace(requestId: string): string {
    const trace = this.traces.get(requestId)
    if (!trace) {
      return `No trace found for request ${requestId}`
    }

    let reasoning = `Routing Decision Trace for ${requestId}\n`
    reasoning += `Generated: ${new Date(trace.timestamp).toISOString()}\n\n`

    reasoning += `ROUTING ANALYSIS:\n`
    reasoning += `- Complexity: ${trace.routingFactors.complexity}/100\n`
    reasoning += `- Intent: ${trace.routingFactors.intent}\n`
    reasoning += `- Confidence: ${(trace.routingFactors.confidence * 100).toFixed(1)}%\n`
    reasoning += `- Predicted Cost: $${trace.routingFactors.costPrediction.toFixed(4)}\n`
    reasoning += `- Predicted Latency: ${trace.routingFactors.latencyPrediction}ms\n\n`

    reasoning += `MODEL SELECTION:\n`
    reasoning += `- Selected Tier: ${trace.modelSelection.selectedTier}\n`
    reasoning += `- Selected Model: ${trace.modelSelection.selectedModel}\n`
    reasoning += `- Selection Reason: ${trace.modelSelection.selectionReason}\n`
    if (trace.modelSelection.fallbackUsed) {
      reasoning += `- Fallback Used: Yes\n`
    }
    if (trace.modelSelection.alternativeModels.length > 0) {
      reasoning += `- Alternative Models: ${trace.modelSelection.alternativeModels.join(', ')}\n`
    }
    reasoning += `\n`

    reasoning += `PERFORMANCE:\n`
    reasoning += `- Actual Latency: ${trace.performance.actualLatency}ms\n`
    reasoning += `- Actual Cost: $${trace.performance.actualCost.toFixed(4)}\n`
    reasoning += `- Tokens Used: ${trace.performance.tokensUsed}\n`
    reasoning += `- Cache Hit: ${trace.performance.cacheHit ? 'Yes' : 'No'}\n`
    if (trace.performance.cacheType) {
      reasoning += `- Cache Type: ${trace.performance.cacheType}\n`
    }
    reasoning += `\n`

    if (trace.verification) {
      reasoning += `VERIFICATION:\n`
      reasoning += `- Stages Completed: ${trace.verification.stagesCompleted.join(', ')}\n`
      reasoning += `- Overall Score: ${(trace.verification.overallScore * 100).toFixed(1)}%\n`
      if (trace.verification.issuesDetected.length > 0) {
        reasoning += `- Issues Detected: ${trace.verification.issuesDetected.join(', ')}\n`
      }
      reasoning += `- Refinement Used: ${trace.verification.refinementUsed ? 'Yes' : 'No'}\n`
    }

    return reasoning
  }

  /**
   * Log audit entry */
  logAudit(
    level: AuditLogEntry['level'],
    category: AuditLogEntry['category'],
    message: string,
    details?: any,
    requestId?: string,
    userId?: string
  ): void {
    const entry: AuditLogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      details,
      requestId,
      userId
    }

    this.auditLogs.push(entry)
    
    // Maintain log size limit
    if (this.auditLogs.length > this.maxLogSize) {
      this.auditLogs = this.auditLogs.slice(-this.maxLogSize)
    }

    // Console output for immediate visibility
    const consoleMethod = level === 'error' || level === 'critical' ? console.error : 
                         level === 'warning' ? console.warn : console.log
    consoleMethod(`[${category.toUpperCase()}] ${message}`, details || '')
  }

  /**
   * Get audit logs with filtering */
  getAuditLogs(filters?: {
    level?: AuditLogEntry['level']
    category?: AuditLogEntry['category']
    startTime?: number
    endTime?: number
    requestId?: string
    userId?: string
  }): AuditLogEntry[] {
    return this.auditLogs.filter(entry => {
      if (filters?.level && entry.level !== filters.level) return false
      if (filters?.category && entry.category !== filters.category) return false
      if (filters?.startTime && entry.timestamp < filters.startTime) return false
      if (filters?.endTime && entry.timestamp > filters.endTime) return false
      if (filters?.requestId && entry.requestId !== filters.requestId) return false
      if (filters?.userId && entry.userId !== filters.userId) return false
      return true
    })
  }

  /**
   * Get audit statistics */
  getAuditStats(): {
    totalLogs: number
    byLevel: Record<string, number>
    byCategory: Record<string, number>
    recentErrors: number
  } {
    const byLevel: Record<string, number> = {}
    const byCategory: Record<string, number> = {}
    const oneHourAgo = Date.now() - 3600000

    this.auditLogs.forEach(entry => {
      byLevel[entry.level] = (byLevel[entry.level] || 0) + 1
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1
    })

    const recentErrors = this.auditLogs.filter(
      entry => (entry.level === 'error' || entry.level === 'critical') && 
               entry.timestamp > oneHourAgo
    ).length

    return {
      totalLogs: this.auditLogs.length,
      byLevel,
      byCategory,
      recentErrors
    }
  }

  /**
   * Clear old traces and logs */
  cleanup(maxAge: number = 86400000): void {
    const cutoff = Date.now() - maxAge
    
    // Clean traces
    for (const [requestId, trace] of this.traces.entries()) {
      if (trace.timestamp < cutoff) {
        this.traces.delete(requestId)
      }
    }
    
    // Clean audit logs
    this.auditLogs = this.auditLogs.filter(entry => entry.timestamp > cutoff)
    
    this.logAudit('info', 'routing', `Cleaned up traces and logs older than ${maxAge}ms`)
  }
}

// Singleton instance
export const traceability = new TraceabilitySystem()
