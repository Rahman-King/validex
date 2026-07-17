/**
 * Manager-Worker Pattern for Multi-Agent Orchestration
 * Decomposes complex requests into sub-tasks assigned to specialized agents
 * Enables solving complex, multi-step problems through coordinated agent collaboration
 */

export interface Agent {
  id: string
  name: string
  specialization: 'general' | 'coding' | 'math' | 'reasoning' | 'creative' | 'factual' | 'verification'
  capabilities: string[]
  model: string
  tier: number
}

export interface SubTask {
  id: string
  parentId?: string
  description: string
  type: string
  specialization: string
  assignedAgent?: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  input: any
  output?: any
  dependencies: string[]
  priority: number
  estimatedCost: number
  estimatedLatency: number
}

export interface TaskGraph {
  rootTask: SubTask
  subTasks: Map<string, SubTask>
  executionOrder: string[]
}

export interface OrchestrationResult {
  success: boolean
  finalOutput: string
  executionTrace: {
    taskId: string
    agent: string
    status: string
    duration: number
    cost: number
  }[]
  totalCost: number
  totalLatency: number
  errors: string[]
}

// Available specialized agents
const AVAILABLE_AGENTS: Agent[] = [
  {
    id: 'agent-general',
    name: 'General Assistant',
    specialization: 'general',
    capabilities: ['text_generation', 'summarization', 'explanation'],
    model: 'accounts/fireworks/models/llama-v3-8b-instruct',
    tier: 1
  },
  {
    id: 'agent-coding',
    name: 'Code Expert',
    specialization: 'coding',
    capabilities: ['code_generation', 'debugging', 'code_review', 'documentation'],
    model: 'accounts/fireworks/models/codestral-22b-v0_1',
    tier: 2
  },
  {
    id: 'agent-math',
    name: 'Math Specialist',
    specialization: 'math',
    capabilities: ['calculation', 'problem_solving', 'analysis'],
    model: 'accounts/fireworks/models/llama-v3-70b-instruct',
    tier: 2
  },
  {
    id: 'agent-reasoning',
    name: 'Reasoning Expert',
    specialization: 'reasoning',
    capabilities: ['logical_analysis', 'inference', 'deduction'],
    model: 'accounts/fireworks/models/deepseek-r1',
    tier: 2
  },
  {
    id: 'agent-creative',
    name: 'Creative Writer',
    specialization: 'creative',
    capabilities: ['creative_writing', 'storytelling', 'ideation'],
    model: 'accounts/fireworks/models/llama-v3-8b-instruct',
    tier: 1
  },
  {
    id: 'agent-factual',
    name: 'Fact Checker',
    specialization: 'factual',
    capabilities: ['fact_verification', 'research', 'cross_reference'],
    model: 'accounts/fireworks/models/llama-v3-70b-instruct',
    tier: 2
  },
  {
    id: 'agent-verification',
    name: 'Quality Assurance',
    specialization: 'verification',
    capabilities: ['quality_check', 'validation', 'error_detection'],
    model: 'accounts/fireworks/models/llama-v3-8b-instruct',
    tier: 1
  }
]

class ManagerWorkerOrchestrator {
  private agents: Agent[] = AVAILABLE_AGENTS

  /**
   * Analyze request complexity and determine if multi-agent orchestration is needed */
  shouldOrchestrate(request: string, complexity: number): boolean {
    // Use multi-agent for complex requests (complexity > 70)
    if (complexity > 70) return true
    
    // Use multi-agent for requests with multiple distinct requirements
    const hasMultipleRequirements = 
      request.includes('and') || 
      request.includes('also') ||
      request.includes('plus') ||
      request.includes('then')
    
    if (hasMultipleRequirements) return true
    
    // Use multi-agent for coding tasks that might need verification
    const isCodingTask = request.toLowerCase().includes('code') || 
                        request.toLowerCase().includes('function') ||
                        request.toLowerCase().includes('debug')
    
    if (isCodingTask) return true
    
    return false
  }

  /**
   * Decompose complex request into sub-tasks */
  decomposeRequest(request: string, complexity: number): TaskGraph {
    const rootTaskId = `task-${Date.now()}-root`
    const subTasks = new Map<string, SubTask>()
    
    // Create root task
    const rootTask: SubTask = {
      id: rootTaskId,
      description: request,
      type: 'root',
      specialization: 'general',
      status: 'pending',
      input: { request },
      dependencies: [],
      priority: 1,
      estimatedCost: 0,
      estimatedLatency: 0
    }
    
    subTasks.set(rootTaskId, rootTask)
    
    // Analyze request to identify sub-components
    const subTaskComponents = this.identifySubComponents(request)
    
    let taskIndex = 0
    subTaskComponents.forEach((component, index) => {
      const taskId = `task-${Date.now()}-${index}`
      const subTask: SubTask = {
        id: taskId,
        parentId: rootTaskId,
        description: component.description,
        type: component.type,
        specialization: component.specialization,
        status: 'pending',
        input: { request: component.description },
        dependencies: [],
        priority: index + 2,
        estimatedCost: this.estimateCost(component.specialization),
        estimatedLatency: this.estimateLatency(component.specialization)
      }
      
      subTasks.set(taskId, subTask)
      rootTask.dependencies.push(taskId)
    })
    
    // Determine execution order (topological sort)
    const executionOrder = this.determineExecutionOrder(subTasks)
    
    return {
      rootTask,
      subTasks,
      executionOrder
    }
  }

  /**
   * Identify sub-components of a complex request */
  private identifySubComponents(request: string): Array<{
    description: string
    type: string
    specialization: string
  }> {
    const components: Array<{
      description: string
      type: string
      specialization: string
    }> = []
    
    // Coding task decomposition
    if (request.toLowerCase().includes('code') || request.toLowerCase().includes('function')) {
      components.push({
        description: `Generate code for: ${request}`,
        type: 'code_generation',
        specialization: 'coding'
      })
      components.push({
        description: 'Review and verify the generated code',
        type: 'verification',
        specialization: 'verification'
      })
    }
    
    // Multi-part request decomposition
    if (request.includes('and') || request.includes('also')) {
      const parts = request.split(/\s+(?:and|also|plus|then)\s+/i)
      parts.forEach((part, index) => {
        const specialization = this.determineSpecialization(part)
        components.push({
          description: part.trim(),
          type: 'sub_task',
          specialization
        })
      })
    }
    
    // Research and analysis decomposition
    if (request.toLowerCase().includes('research') || request.toLowerCase().includes('analyze')) {
      components.push({
        description: `Research and analyze: ${request}`,
        type: 'research',
        specialization: 'factual'
      })
      components.push({
        description: 'Synthesize findings into coherent response',
        type: 'synthesis',
        specialization: 'general'
      })
    }
    
    // Default: single task
    if (components.length === 0) {
      const specialization = this.determineSpecialization(request)
      components.push({
        description: request,
        type: 'single_task',
        specialization
      })
    }
    
    return components
  }

  /**
   * Determine appropriate specialization for a request */
  private determineSpecialization(request: string): string {
    const lowerRequest = request.toLowerCase()
    
    if (lowerRequest.includes('code') || lowerRequest.includes('function') || lowerRequest.includes('debug')) {
      return 'coding'
    }
    if (lowerRequest.includes('math') || lowerRequest.includes('calculate') || lowerRequest.includes('number')) {
      return 'math'
    }
    if (lowerRequest.includes('reason') || lowerRequest.includes('logic') || lowerRequest.includes('analyze')) {
      return 'reasoning'
    }
    if (lowerRequest.includes('write') || lowerRequest.includes('story') || lowerRequest.includes('creative')) {
      return 'creative'
    }
    if (lowerRequest.includes('fact') || lowerRequest.includes('verify') || lowerRequest.includes('check')) {
      return 'factual'
    }
    
    return 'general'
  }

  /**
   * Assign agents to sub-tasks based on specialization */
  assignAgents(taskGraph: TaskGraph): void {
    for (const [taskId, task] of taskGraph.subTasks) {
      if (task.type === 'root') continue
      
      const suitableAgents = this.agents.filter(
        agent => agent.specialization === task.specialization
      )
      
      if (suitableAgents.length > 0) {
        // Select the best agent (could be enhanced with performance metrics)
        task.assignedAgent = suitableAgents[0].id
      }
    }
  }

  /**
   * Execute task graph with agent coordination */
  async executeTaskGraph(
    taskGraph: TaskGraph,
    executeAgent: (agentId: string, input: any) => Promise<string>
  ): Promise<OrchestrationResult> {
    const executionTrace: OrchestrationResult['executionTrace'] = []
    const errors: string[] = []
    let totalCost = 0
    let totalLatency = 0
    
    // Execute tasks in order
    for (const taskId of taskGraph.executionOrder) {
      const task = taskGraph.subTasks.get(taskId)
      if (!task || task.type === 'root') continue
      
      const startTime = Date.now()
      task.status = 'in_progress'
      
      try {
        const agent = this.agents.find(a => a.id === task.assignedAgent)
        if (!agent) {
          throw new Error(`No agent assigned to task ${taskId}`)
        }
        
        // Execute agent
        const output = await executeAgent(agent.id, task.input)
        task.output = output
        task.status = 'completed'
        
        const duration = Date.now() - startTime
        totalLatency += duration
        totalCost += task.estimatedCost
        
        executionTrace.push({
          taskId,
          agent: agent.name,
          status: 'completed',
          duration,
          cost: task.estimatedCost
        })
        
      } catch (error) {
        task.status = 'failed'
        errors.push(`Task ${taskId} failed: ${error}`)
        
        executionTrace.push({
          taskId,
          agent: task.assignedAgent || 'unknown',
          status: 'failed',
          duration: Date.now() - startTime,
          cost: 0
        })
      }
    }
    
    // Synthesize final output from completed sub-tasks
    const finalOutput = this.synthesizeOutput(taskGraph)
    
    return {
      success: errors.length === 0,
      finalOutput,
      executionTrace,
      totalCost,
      totalLatency,
      errors
    }
  }

  /**
   * Synthesize final output from sub-task results */
  private synthesizeOutput(taskGraph: TaskGraph): string {
    const completedTasks = Array.from(taskGraph.subTasks.values())
      .filter(task => task.status === 'completed' && task.type !== 'root')
    
    if (completedTasks.length === 0) {
      return 'No tasks completed successfully'
    }
    
    if (completedTasks.length === 1) {
      return completedTasks[0].output || 'No output generated'
    }
    
    // Combine multiple task outputs
    let synthesis = 'Here are the results:\n\n'
    completedTasks.forEach((task, index) => {
      synthesis += `${index + 1}. ${task.description}\n`
      synthesis += `${task.output || 'No output'}\n\n`
    })
    
    return synthesis
  }

  /**
   * Determine execution order using topological sort */
  private determineExecutionOrder(subTasks: Map<string, SubTask>): string[] {
    const order: string[] = []
    const visited = new Set<string>()
    
    const visit = (taskId: string) => {
      if (visited.has(taskId)) return
      visited.add(taskId)
      
      const task = subTasks.get(taskId)
      if (task) {
        for (const depId of task.dependencies) {
          visit(depId)
        }
        order.push(taskId)
      }
    }
    
    for (const taskId of subTasks.keys()) {
      visit(taskId)
    }
    
    return order
  }

  /**
   * Estimate cost for a given specialization */
  private estimateCost(specialization: string): number {
    const agent = this.agents.find(a => a.specialization === specialization)
    if (!agent) return 0.01
    
    // Higher tier = higher cost
    return agent.tier === 2 ? 0.02 : 0.01
  }

  /**
   * Estimate latency for a given specialization */
  private estimateLatency(specialization: string): number {
    const agent = this.agents.find(a => a.specialization === specialization)
    if (!agent) return 1000
    
    // Higher tier = higher latency
    return agent.tier === 2 ? 2000 : 1000
  }

  /**
   * Get available agents */
  getAvailableAgents(): Agent[] {
    return [...this.agents]
  }

  /**
   * Add custom agent */
  addAgent(agent: Agent): void {
    this.agents.push(agent)
  }
}

// Singleton instance
export const orchestrator = new ManagerWorkerOrchestrator()
