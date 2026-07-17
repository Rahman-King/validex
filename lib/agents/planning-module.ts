/**
 * Planning Module (Plan-Act-Reflect-Repeat)
 * Enhances the manager-worker pattern with intelligent planning and reflection
 * Decomposes complex requests, executes sequentially/parallel, and refines based on quality
 */

export interface Plan {
  id: string
  originalRequest: string
  decompositionStrategy: string
  subTasks: PlannedTask[]
  executionStrategy: 'sequential' | 'parallel' | 'hybrid'
  estimatedTotalCost: number
  estimatedTotalLatency: number
  qualityThreshold: number
  maxReflections: number
}

export interface PlannedTask {
  id: string
  parentId?: string
  description: string
  type: 'analysis' | 'generation' | 'verification' | 'synthesis'
  agentType: string
  dependencies: string[]
  priority: number
  estimatedCost: number
  estimatedLatency: number
  qualityThreshold: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'refined'
  input: any
  output?: any
  qualityScore?: number
  reflectionCount: number
}

export interface ReflectionResult {
  taskId: string
  originalQuality: number
  refinedQuality: number
  improvements: string[]
  shouldRefine: boolean
  reason: string
}

export interface ExecutionResult {
  planId: string
  success: boolean
  finalOutput: string
  executionTrace: {
    taskId: string
    agent: string
    status: string
    duration: number
    cost: number
    qualityScore: number
    reflections: number
  }[]
  totalCost: number
  totalLatency: number
  reflectionsPerformed: number
  qualityImprovement: number
  errors: string[]
}

class PlanningModule {
  /**
   * Analyze request and determine if planning is needed */
  needsPlanning(request: string, complexity: number): boolean {
    // Complex requests need planning
    if (complexity > 60) return true
    
    // Multi-step requests need planning
    const multiStepIndicators = [
      'then', 'after that', 'next', 'finally', 'first', 'second', 'third',
      'step 1', 'step 2', 'part 1', 'part 2', 'phase 1', 'phase 2'
    ]
    
    const hasMultiStep = multiStepIndicators.some(indicator => 
      request.toLowerCase().includes(indicator)
    )
    if (hasMultiStep) return true
    
    // Requests requiring verification need planning
    const verificationIndicators = [
      'verify', 'check', 'validate', 'confirm', 'ensure', 'double-check'
    ]
    
    const needsVerification = verificationIndicators.some(indicator => 
      request.toLowerCase().includes(indicator)
    )
    if (needsVerification) return true
    
    return false
  }

  /**
   * Create a comprehensive plan for complex requests */
  createPlan(request: string, complexity: number): Plan {
    const planId = `plan-${Date.now()}`
    
    // Determine execution strategy based on complexity and dependencies
    const executionStrategy = this.determineExecutionStrategy(request, complexity)
    
    // Decompose request into sub-tasks
    const subTasks = this.decomposeRequest(request, complexity)
    
    // Calculate estimates
    const estimatedTotalCost = subTasks.reduce((sum, task) => sum + task.estimatedCost, 0)
    const estimatedTotalLatency = this.calculateTotalLatency(subTasks, executionStrategy)
    
    const plan: Plan = {
      id: planId,
      originalRequest: request,
      decompositionStrategy: this.getDecompositionStrategy(request),
      subTasks,
      executionStrategy,
      estimatedTotalCost,
      estimatedTotalLatency,
      qualityThreshold: 0.75,
      maxReflections: 2
    }
    
    return plan
  }

  /**
   * Determine execution strategy */
  private determineExecutionStrategy(request: string, complexity: number): 'sequential' | 'parallel' | 'hybrid' {
    // Simple tasks: sequential
    if (complexity < 70) return 'sequential'
    
    // Independent tasks: parallel
    const hasIndependentPhrases = [
      'also', 'additionally', 'in addition', 'besides', 'moreover'
    ]
    
    const hasIndependent = hasIndependentPhrases.some(phrase => 
      request.toLowerCase().includes(phrase)
    )
    if (hasIndependent) return 'parallel'
    
    // Complex with dependencies: hybrid
    return 'hybrid'
  }

  /**
   * Decompose request into planned sub-tasks */
  private decomposeRequest(request: string, complexity: number): PlannedTask[] {
    const tasks: PlannedTask[] = []
    const taskIndex = 0
    
    // Analysis phase
    tasks.push({
      id: `task-${Date.now()}-analysis`,
      description: `Analyze the request: ${request}`,
      type: 'analysis',
      agentType: 'reasoning',
      dependencies: [],
      priority: 1,
      estimatedCost: 0.01,
      estimatedLatency: 1000,
      qualityThreshold: 0.8,
      status: 'pending',
      input: { request },
      reflectionCount: 0
    })
    
    // Generation phase
    tasks.push({
      id: `task-${Date.now()}-generation`,
      description: `Generate response for: ${request}`,
      type: 'generation',
      agentType: this.determineAgentType(request),
      dependencies: [tasks[0].id],
      priority: 2,
      estimatedCost: 0.02,
      estimatedLatency: 2000,
      qualityThreshold: 0.75,
      status: 'pending',
      input: { request },
      reflectionCount: 0
    })
    
    // Verification phase for complex tasks
    if (complexity > 70) {
      tasks.push({
        id: `task-${Date.now()}-verification`,
        description: 'Verify the generated response',
        type: 'verification',
        agentType: 'verification',
        dependencies: [tasks[1].id],
        priority: 3,
        estimatedCost: 0.01,
        estimatedLatency: 1500,
        qualityThreshold: 0.8,
        status: 'pending',
        input: { request },
        reflectionCount: 0
      })
    }
    
    // Synthesis phase
    tasks.push({
      id: `task-${Date.now()}-synthesis`,
      description: 'Synthesize final response',
      type: 'synthesis',
      agentType: 'general',
      dependencies: tasks.map(t => t.id),
      priority: 4,
      estimatedCost: 0.01,
      estimatedLatency: 1000,
      qualityThreshold: 0.85,
      status: 'pending',
      input: { request },
      reflectionCount: 0
    })
    
    return tasks
  }

  /**
   * Determine appropriate agent type for request */
  private determineAgentType(request: string): string {
    const lowerRequest = request.toLowerCase()
    
    if (lowerRequest.includes('code') || lowerRequest.includes('function')) return 'coding'
    if (lowerRequest.includes('math') || lowerRequest.includes('calculate')) return 'math'
    if (lowerRequest.includes('analyze') || lowerRequest.includes('reason')) return 'reasoning'
    if (lowerRequest.includes('write') || lowerRequest.includes('creative')) return 'creative'
    if (lowerRequest.includes('fact') || lowerRequest.includes('research')) return 'factual'
    
    return 'general'
  }

  /**
   * Get decomposition strategy description */
  private getDecompositionStrategy(request: string): string {
    if (request.toLowerCase().includes('code')) return 'code-focused decomposition'
    if (request.toLowerCase().includes('analyze')) return 'analytical decomposition'
    if (request.toLowerCase().includes('research')) return 'research-focused decomposition'
    return 'standard task decomposition'
  }

  /**
   * Calculate total latency based on execution strategy */
  private calculateTotalLatency(tasks: PlannedTask[], strategy: 'sequential' | 'parallel' | 'hybrid'): number {
    if (strategy === 'sequential') {
      return tasks.reduce((sum, task) => sum + task.estimatedLatency, 0)
    }
    
    if (strategy === 'parallel') {
      return Math.max(...tasks.map(task => task.estimatedLatency))
    }
    
    // Hybrid: weighted average
    const sequentialTasks = tasks.filter(t => t.dependencies.length > 0)
    const parallelTasks = tasks.filter(t => t.dependencies.length === 0)
    
    const sequentialLatency = sequentialTasks.reduce((sum, task) => sum + task.estimatedLatency, 0)
    const parallelLatency = parallelTasks.length > 0 ? Math.max(...parallelTasks.map(t => t.estimatedLatency)) : 0
    
    return sequentialLatency + parallelLatency
  }

  /**
   * Execute plan with reflection capability */
  async executePlan(
    plan: Plan,
    executeTask: (task: PlannedTask) => Promise<{ output: string; qualityScore: number }>,
    reflectOnTask: (task: PlannedTask, qualityScore: number) => Promise<ReflectionResult>
  ): Promise<ExecutionResult> {
    const executionTrace: ExecutionResult['executionTrace'] = []
    const errors: string[] = []
    let totalCost = 0
    let totalLatency = 0
    let reflectionsPerformed = 0
    let qualityImprovement = 0
    
    // Execute tasks based on strategy
    const taskOrder = this.determineExecutionOrder(plan.subTasks, plan.executionStrategy)
    
    for (const taskId of taskOrder) {
      const task = plan.subTasks.find(t => t.id === taskId)
      if (!task) continue
      
      const startTime = Date.now()
      task.status = 'in_progress'
      
      try {
        // Execute task
        const result = await executeTask(task)
        task.output = result.output
        task.qualityScore = result.qualityScore
        task.status = 'completed'
        
        const duration = Date.now() - startTime
        totalLatency += duration
        totalCost += task.estimatedCost
        
        // Reflect on quality if below threshold
        let taskReflections = 0
        if (result.qualityScore < plan.qualityThreshold && task.reflectionCount < plan.maxReflections) {
          const reflection = await reflectOnTask(task, result.qualityScore)
          
          if (reflection.shouldRefine) {
            taskReflections++
            reflectionsPerformed++
            task.reflectionCount++
            task.status = 'refined'
            qualityImprovement += (reflection.refinedQuality - reflection.originalQuality)
            
            // Re-execute with refinement
            const refinedResult = await executeTask(task)
            task.output = refinedResult.output
            task.qualityScore = refinedResult.qualityScore
            task.status = 'completed'
          }
        }
        
        executionTrace.push({
          taskId: task.id,
          agent: task.agentType,
          status: task.status,
          duration,
          cost: task.estimatedCost,
          qualityScore: task.qualityScore || 0,
          reflections: taskReflections
        })
        
      } catch (error) {
        task.status = 'failed'
        errors.push(`Task ${task.id} failed: ${error}`)
        
        executionTrace.push({
          taskId: task.id,
          agent: task.agentType,
          status: 'failed',
          duration: Date.now() - startTime,
          cost: 0,
          qualityScore: 0,
          reflections: 0
        })
      }
    }
    
    // Synthesize final output
    const finalOutput = this.synthesizePlanOutput(plan)
    
    return {
      planId: plan.id,
      success: errors.length === 0,
      finalOutput,
      executionTrace,
      totalCost,
      totalLatency,
      reflectionsPerformed,
      qualityImprovement,
      errors
    }
  }

  /**
   * Determine execution order based on strategy */
  private determineExecutionOrder(tasks: PlannedTask[], strategy: 'sequential' | 'parallel' | 'hybrid'): string[] {
    if (strategy === 'parallel') {
      // Execute all tasks without dependencies first, then dependent ones
      const independent = tasks.filter(t => t.dependencies.length === 0).map(t => t.id)
      const dependent = tasks.filter(t => t.dependencies.length > 0).map(t => t.id)
      return [...independent, ...dependent]
    }
    
    if (strategy === 'sequential') {
      // Topological sort based on dependencies
      const order: string[] = []
      const visited = new Set<string>()
      
      const visit = (taskId: string) => {
        if (visited.has(taskId)) return
        visited.add(taskId)
        
        const task = tasks.find(t => t.id === taskId)
        if (task) {
          for (const depId of task.dependencies) {
            visit(depId)
          }
          order.push(taskId)
        }
      }
      
      for (const task of tasks) {
        visit(task.id)
      }
      
      return order
    }
    
    // Hybrid: mix of parallel and sequential
    return this.determineExecutionOrder(tasks, 'sequential')
  }

  /**
   * Synthesize final output from completed tasks */
  private synthesizePlanOutput(plan: Plan): string {
    const completedTasks = plan.subTasks.filter(t => t.status === 'completed' || t.status === 'refined')
    
    if (completedTasks.length === 0) {
      return 'Plan execution failed - no tasks completed successfully'
    }
    
    // Find the main generation task output
    const generationTask = completedTasks.find(t => t.type === 'generation')
    if (generationTask && generationTask.output) {
      return generationTask.output as string
    }
    
    // Fall back to synthesis task
    const synthesisTask = completedTasks.find(t => t.type === 'synthesis')
    if (synthesisTask && synthesisTask.output) {
      return synthesisTask.output as string
    }
    
    // Combine all outputs
    return completedTasks.map(t => `${t.type}: ${t.output || 'No output'}`).join('\n\n')
  }

  /**
   * Get plan statistics */
  getPlanStats(plan: Plan): {
    totalTasks: number
    estimatedCost: number
    estimatedLatency: number
    executionStrategy: string
    taskTypes: Record<string, number>
  } {
    const taskTypes: Record<string, number> = {}
    
    plan.subTasks.forEach(task => {
      taskTypes[task.type] = (taskTypes[task.type] || 0) + 1
    })
    
    return {
      totalTasks: plan.subTasks.length,
      estimatedCost: plan.estimatedTotalCost,
      estimatedLatency: plan.estimatedTotalLatency,
      executionStrategy: plan.executionStrategy,
      taskTypes
    }
  }
}

// Singleton instance
export const planningModule = new PlanningModule()
