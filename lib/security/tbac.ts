/**
 * Task-Based Access Control (TBAC) System
 * Implements automated enforcement of what AI agents can do and which tools they can access
 * Goes beyond user-based permissions to task-level authorization
 */

export interface TaskPermission {
  taskId: string
  taskType: string
  allowedOperations: string[]
  allowedTools: string[]
  allowedDataSources: string[]
  restrictions: string[]
  maxCost: number
  maxLatency: number
  requiresApproval: boolean
  approvalLevel: 'self' | 'team_lead' | 'admin' | 'executive'
}

export interface AgentCapability {
  agentId: string
  agentName: string
  specialization: string
  defaultPermissions: TaskPermission
  toolAccess: string[]
  dataSourceAccess: string[]
}

export interface AccessRequest {
  requestId: string
  taskId: string
  agentId: string
  requestedOperation: string
  requestedTool?: string
  requestedDataSource?: string
  estimatedCost: number
  userId?: string
  timestamp: number
  status: 'pending' | 'approved' | 'denied' | 'requires_approval'
  reason?: string
}

export interface PolicyRule {
  id: string
  name: string
  description: string
  appliesTo: 'agent' | 'task' | 'user' | 'global'
  target: string
  conditions: {
    taskTypes?: string[]
    costThreshold?: number
    dataSensitivity?: 'low' | 'medium' | 'high' | 'critical'
    timeRestrictions?: { start: string; end: string }
    userRoles?: string[]
  }
  actions: {
    allow: boolean
    requireApproval?: boolean
    approvalLevel?: 'self' | 'team_lead' | 'admin' | 'executive'
    restrictions?: string[]
    overridePermissions?: string[]
  }
  priority: number
}

class TBACSystem {
  private policies: Map<string, PolicyRule> = new Map()
  private agentCapabilities: Map<string, AgentCapability> = new Map()
  private accessRequests: Map<string, AccessRequest> = new Map()
  private auditLog: AccessRequest[] = []

  /**
   * Initialize default policies */
  constructor() {
    this.initializeDefaultPolicies()
    this.initializeDefaultAgentCapabilities()
  }

  /**
   * Initialize default security policies */
  private initializeDefaultPolicies(): void {
    // High-cost operations require approval
    this.addPolicy({
      id: 'policy-high-cost',
      name: 'High-Cost Operations Approval',
      description: 'Operations exceeding cost threshold require approval',
      appliesTo: 'task',
      target: '*',
      conditions: {
        costThreshold: 0.05
      },
      actions: {
        allow: true,
        requireApproval: true,
        restrictions: ['max_tier_2']
      },
      priority: 100
    })

    // Critical data access restrictions
    this.addPolicy({
      id: 'policy-critical-data',
      name: 'Critical Data Access Control',
      description: 'Critical data access requires executive approval',
      appliesTo: 'task',
      target: '*',
      conditions: {
        dataSensitivity: 'critical'
      },
      actions: {
        allow: false,
        requireApproval: true,
        approvalLevel: 'executive'
      },
      priority: 1000
    })

    // Coding tasks have specific tool restrictions
    this.addPolicy({
      id: 'policy-coding-tasks',
      name: 'Coding Task Restrictions',
      description: 'Coding tasks have specific tool and operation restrictions',
      appliesTo: 'task',
      target: 'coding',
      conditions: {
        taskTypes: ['code_generation', 'code_review', 'debugging']
      },
      actions: {
        allow: true,
        restrictions: ['no_production_deployment', 'no_database_write']
      },
      priority: 50
    })

    // Research tasks have data source restrictions
    this.addPolicy({
      id: 'policy-research-tasks',
      name: 'Research Task Data Access',
      description: 'Research tasks have restricted data source access',
      appliesTo: 'task',
      target: 'research',
      conditions: {
        taskTypes: ['research', 'fact_checking', 'analysis']
      },
      actions: {
        allow: true,
        restrictions: ['public_sources_only']
      },
      priority: 50
    })

    // Time-based restrictions for expensive operations
    this.addPolicy({
      id: 'policy-time-restrictions',
      name: 'Time-Based Operation Restrictions',
      description: 'Expensive operations restricted during business hours',
      appliesTo: 'global',
      target: '*',
      conditions: {
        costThreshold: 0.1,
        timeRestrictions: { start: '09:00', end: '17:00' }
      },
      actions: {
        allow: true,
        requireApproval: true
      },
      priority: 75
    })
  }

  /**
   * Initialize default agent capabilities */
  private initializeDefaultAgentCapabilities(): void {
    // General Assistant
    this.addAgentCapability({
      agentId: 'agent-general',
      agentName: 'General Assistant',
      specialization: 'general',
      defaultPermissions: {
        taskId: 'default',
        taskType: 'general',
        allowedOperations: ['text_generation', 'summarization', 'explanation'],
        allowedTools: ['text_editor', 'calculator'],
        allowedDataSources: ['public_web', 'internal_knowledge_base'],
        restrictions: ['no_sensitive_data'],
        maxCost: 0.02,
        maxLatency: 3000,
        requiresApproval: false,
        approvalLevel: 'self'
      },
      toolAccess: ['text_editor', 'calculator', 'web_search'],
      dataSourceAccess: ['public_web', 'internal_knowledge_base']
    })

    // Code Expert
    this.addAgentCapability({
      agentId: 'agent-coding',
      agentName: 'Code Expert',
      specialization: 'coding',
      defaultPermissions: {
        taskId: 'default',
        taskType: 'coding',
        allowedOperations: ['code_generation', 'code_review', 'debugging', 'documentation'],
        allowedTools: ['code_editor', 'linter', 'debugger', 'version_control'],
        allowedDataSources: ['code_repositories', 'documentation'],
        restrictions: ['no_production_deployment', 'no_database_write', 'no_api_keys'],
        maxCost: 0.05,
        maxLatency: 5000,
        requiresApproval: false,
        approvalLevel: 'self'
      },
      toolAccess: ['code_editor', 'linter', 'debugger', 'version_control', 'test_runner'],
      dataSourceAccess: ['code_repositories', 'documentation', 'internal_codebase']
    })

    // Math Specialist
    this.addAgentCapability({
      agentId: 'agent-math',
      agentName: 'Math Specialist',
      specialization: 'math',
      defaultPermissions: {
        taskId: 'default',
        taskType: 'math',
        allowedOperations: ['calculation', 'problem_solving', 'analysis'],
        allowedTools: ['calculator', 'math_libraries', 'plotting_tools'],
        allowedDataSources: ['mathematical_databases', 'reference_materials'],
        restrictions: ['no_financial_transactions'],
        maxCost: 0.03,
        maxLatency: 4000,
        requiresApproval: false,
        approvalLevel: 'self'
      },
      toolAccess: ['calculator', 'math_libraries', 'plotting_tools', 'symbolic_computation'],
      dataSourceAccess: ['mathematical_databases', 'reference_materials']
    })

    // Fact Checker
    this.addAgentCapability({
      agentId: 'agent-factual',
      agentName: 'Fact Checker',
      specialization: 'factual',
      defaultPermissions: {
        taskId: 'default',
        taskType: 'factual',
        allowedOperations: ['fact_verification', 'research', 'cross_reference'],
        allowedTools: ['web_search', 'database_query', 'api_access'],
        allowedDataSources: ['public_web', 'trusted_databases', 'internal_records'],
        restrictions: ['public_sources_only', 'no_pii_access'],
        maxCost: 0.04,
        maxLatency: 6000,
        requiresApproval: false,
        approvalLevel: 'self'
      },
      toolAccess: ['web_search', 'database_query', 'api_access', 'content_analysis'],
      dataSourceAccess: ['public_web', 'trusted_databases', 'internal_records']
    })
  }

  /**
   * Add a new policy rule */
  addPolicy(policy: PolicyRule): void {
    this.policies.set(policy.id, policy)
  }

  /**
   * Add agent capability definition */
  addAgentCapability(capability: AgentCapability): void {
    this.agentCapabilities.set(capability.agentId, capability)
  }

  /**
   * Check if an access request is permitted */
  async checkAccess(request: AccessRequest): Promise<AccessRequest> {
    const agentCapability = this.agentCapabilities.get(request.agentId)
    if (!agentCapability) {
      request.status = 'denied'
      request.reason = 'Agent not found or not authorized'
      this.logAccessRequest(request)
      return request
    }

    // Check default permissions
    const permissions = agentCapability.defaultPermissions

    // Check if operation is allowed
    if (!permissions.allowedOperations.includes(request.requestedOperation)) {
      request.status = 'denied'
      request.reason = `Operation ${request.requestedOperation} not allowed for this agent`
      this.logAccessRequest(request)
      return request
    }

    // Check tool access if specified
    if (request.requestedTool && !permissions.allowedTools.includes(request.requestedTool)) {
      request.status = 'denied'
      request.reason = `Tool ${request.requestedTool} not accessible for this agent`
      this.logAccessRequest(request)
      return request
    }

    // Check data source access if specified
    if (request.requestedDataSource && !permissions.allowedDataSources.includes(request.requestedDataSource)) {
      request.status = 'denied'
      request.reason = `Data source ${request.requestedDataSource} not accessible for this agent`
      this.logAccessRequest(request)
      return request
    }

    // Check cost limits
    if (request.estimatedCost > permissions.maxCost) {
      request.status = 'requires_approval'
      request.reason = `Cost exceeds agent limit of $${permissions.maxCost}`
      this.logAccessRequest(request)
      return request
    }

    // Apply policy rules
    const applicablePolicies = this.getApplicablePolicies(request)
    for (const policy of applicablePolicies) {
      if (!policy.actions.allow) {
        request.status = 'requires_approval'
        request.reason = `Policy ${policy.name} requires approval`
        request.status = policy.actions.requireApproval ? 'requires_approval' : 'denied'
        this.logAccessRequest(request)
        return request
      }

      if (policy.actions.requireApproval) {
        request.status = 'requires_approval'
        request.reason = `Policy ${policy.name} requires approval`
        this.logAccessRequest(request)
        return request
      }
    }

    // Access granted
    request.status = 'approved'
    request.reason = 'Access granted based on permissions and policies'
    this.logAccessRequest(request)
    return request
  }

  /**
   * Get applicable policies for a request */
  private getApplicablePolicies(request: AccessRequest): PolicyRule[] {
    return Array.from(this.policies.values())
      .filter(policy => {
        // Sort by priority (highest first)
        return true // All policies are applicable for now
      })
      .sort((a, b) => b.priority - a.priority)
  }

  /**
   * Log access request for audit */
  private logAccessRequest(request: AccessRequest): void {
    this.accessRequests.set(request.requestId, request)
    this.auditLog.push(request)
    
    // Maintain audit log size
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000)
    }
  }

  /**
   * Get access request by ID */
  getAccessRequest(requestId: string): AccessRequest | undefined {
    return this.accessRequests.get(requestId)
  }

  /**
   * Get audit logs with filtering */
  getAuditLogs(filters?: {
    agentId?: string
    status?: AccessRequest['status']
    startTime?: number
    endTime?: number
    userId?: string
  }): AccessRequest[] {
    return this.auditLog.filter(entry => {
      if (filters?.agentId && entry.agentId !== filters.agentId) return false
      if (filters?.status && entry.status !== filters.status) return false
      if (filters?.startTime && entry.timestamp < filters.startTime) return false
      if (filters?.endTime && entry.timestamp > filters.endTime) return false
      if (filters?.userId && entry.userId !== filters.userId) return false
      return true
    })
  }

  /**
   * Get access statistics */
  getAccessStats(): {
    totalRequests: number
    approved: number
    denied: number
    requiresApproval: number
    byAgent: Record<string, number>
    byOperation: Record<string, number>
  } {
    const stats = {
      totalRequests: this.auditLog.length,
      approved: 0,
      denied: 0,
      requiresApproval: 0,
      byAgent: {} as Record<string, number>,
      byOperation: {} as Record<string, number>
    }

    this.auditLog.forEach(entry => {
      if (entry.status === 'approved') stats.approved++
      else if (entry.status === 'denied') stats.denied++
      else if (entry.status === 'requires_approval') stats.requiresApproval++

      stats.byAgent[entry.agentId] = (stats.byAgent[entry.agentId] || 0) + 1
      stats.byOperation[entry.requestedOperation] = (stats.byOperation[entry.requestedOperation] || 0) + 1
    })

    return stats
  }

  /**
   * Create access request */
  createAccessRequest(params: {
    taskId: string
    agentId: string
    requestedOperation: string
    requestedTool?: string
    requestedDataSource?: string
    estimatedCost: number
    userId?: string
  }): AccessRequest {
    return {
      requestId: `access-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId: params.taskId,
      agentId: params.agentId,
      requestedOperation: params.requestedOperation,
      requestedTool: params.requestedTool,
      requestedDataSource: params.requestedDataSource,
      estimatedCost: params.estimatedCost,
      userId: params.userId,
      timestamp: Date.now(),
      status: 'pending'
    }
  }

  /**
   * Get all policies */
  getAllPolicies(): PolicyRule[] {
    return Array.from(this.policies.values())
  }

  /**
   * Get all agent capabilities */
  getAllAgentCapabilities(): AgentCapability[] {
    return Array.from(this.agentCapabilities.values())
  }

  /**
   * Update policy */
  updatePolicy(policyId: string, updates: Partial<PolicyRule>): boolean {
    const existing = this.policies.get(policyId)
    if (!existing) return false

    this.policies.set(policyId, { ...existing, ...updates })
    return true
  }

  /**
   * Remove policy */
  removePolicy(policyId: string): boolean {
    return this.policies.delete(policyId)
  }
}

// Singleton instance
export const tbacSystem = new TBACSystem()
