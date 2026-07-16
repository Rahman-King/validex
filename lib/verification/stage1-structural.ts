/**
 * Stage 1: Structural Validation (The Gatekeeper)
 * Checks if the data looks right - schema validation, mandatory fields, data type consistency
 */

import { z } from "zod"
import type { 
  ValidationResult, 
  VerificationStage, 
  StructuralValidationConfig,
  TaskMode 
} from "./types"

// Dynamic schema builder based on task mode
function buildSchemaForMode(mode: TaskMode, config?: StructuralValidationConfig) {
  const baseSchema = z.object({
    task_id: z.string().min(1),
    prompt: z.string().min(1),
    answer: z.string().min(1),
  })

  switch (mode) {
    case "math":
      return baseSchema.extend({
        answer: z.string().refine(
          (val) => /\d+/.test(val),
          "Math answers should contain numerical values"
        ),
      })
    
    case "code":
      return baseSchema.extend({
        answer: z.string().refine(
          (val) => /function|def|class|const|let|var/.test(val),
          "Code answers should contain code constructs"
        ),
      })
    
    case "factual":
      return baseSchema.extend({
        answer: z.string().min(10).max(500),
      })
    
    case "sentiment":
      return baseSchema.extend({
        answer: z.string().refine(
          (val) => /positive|negative|neutral/i.test(val),
          "Sentiment answers should contain sentiment classification"
        ),
      })
    
    case "summarization":
      return baseSchema.extend({
        answer: z.string().min(20).max(300),
      })
    
    case "ner":
      return baseSchema.extend({
        answer: z.string().refine(
          (val) => /[A-Z][a-z]+/.test(val),
          "NER answers should contain named entities"
        ),
      })
    
    default:
      return baseSchema
  }
}

// Custom validation with constraints
function applyCustomConstraints(
  data: any, 
  config?: StructuralValidationConfig
): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  if (!config) return { valid: true, issues }

  // Check required fields
  for (const field of config.requiredFields) {
    if (!(field in data) || data[field] === null || data[field] === undefined) {
      issues.push(`Missing required field: ${field}`)
    }
  }

  // Check field types
  for (const [field, expectedType] of Object.entries(config.fieldTypes)) {
    if (field in data) {
      const actualType = typeof data[field]
      let typeMatch = false

      switch (expectedType) {
        case "string":
          typeMatch = actualType === "string"
          break
        case "number":
          typeMatch = actualType === "number" && !isNaN(data[field])
          break
        case "boolean":
          typeMatch = actualType === "boolean"
          break
        case "date":
          typeMatch = !isNaN(Date.parse(data[field]))
          break
        case "array":
          typeMatch = Array.isArray(data[field])
          break
        case "object":
          typeMatch = actualType === "object" && !Array.isArray(data[field])
          break
      }

      if (!typeMatch) {
        issues.push(`Field ${field} has incorrect type. Expected ${expectedType}, got ${actualType}`)
      }
    }
  }

  // Check field constraints
  for (const [field, constraints] of Object.entries(config.fieldConstraints)) {
    if (field in data && data[field] !== null && data[field] !== undefined) {
      const value = data[field]

      if (constraints.minLength !== undefined && String(value).length < constraints.minLength) {
        issues.push(`Field ${field} is too short (min: ${constraints.minLength})`)
      }

      if (constraints.maxLength !== undefined && String(value).length > constraints.maxLength) {
        issues.push(`Field ${field} is too long (max: ${constraints.maxLength})`)
      }

      if (constraints.min !== undefined && typeof value === "number" && value < constraints.min) {
        issues.push(`Field ${field} is below minimum (min: ${constraints.min})`)
      }

      if (constraints.max !== undefined && typeof value === "number" && value > constraints.max) {
        issues.push(`Field ${field} is above maximum (max: ${constraints.max})`)
      }

      if (constraints.pattern && typeof value === "string" && !new RegExp(constraints.pattern).test(value)) {
        issues.push(`Field ${field} does not match required pattern`)
      }

      if (constraints.enum && !constraints.enum.includes(value)) {
        issues.push(`Field ${field} is not in allowed values: ${constraints.enum.join(", ")}`)
      }
    }
  }

  return { valid: issues.length === 0, issues }
}

export async function validateStructure(
  data: any,
  taskMode: TaskMode,
  config?: StructuralValidationConfig
): Promise<ValidationResult> {
  const stage: VerificationStage = "structural"
  const issues: string[] = []

  try {
    // 1. Schema validation using Zod
    const schema = buildSchemaForMode(taskMode, config)
    const schemaResult = schema.safeParse(data)

    if (!schemaResult.success) {
      schemaResult.error.issues.forEach((err: any) => {
        issues.push(`${err.path.join(".")}: ${err.message}`)
      })
    }

    // 2. Custom constraints validation
    const customValidation = applyCustomConstraints(data, config)
    issues.push(...customValidation.issues)

    // 3. JSON structure validation
    try {
      JSON.stringify(data)
    } catch (e) {
      issues.push("Data is not valid JSON-serializable")
    }

    // Calculate score based on issues
    const score = issues.length === 0 ? 1 : Math.max(0, 1 - (issues.length * 0.2))
    const status: "valid" | "invalid" | "warning" = 
      issues.length === 0 ? "valid" : 
      issues.length <= 2 ? "warning" : "invalid"

    return {
      stage,
      status,
      score,
      details: issues.length === 0 
        ? "All structural checks passed" 
        : `Found ${issues.length} structural issue(s)`,
      issues,
      timestamp: Date.now(),
    }
  } catch (error) {
    return {
      stage,
      status: "invalid",
      score: 0,
      details: `Structural validation failed: ${error}`,
      issues: ["Unexpected error during structural validation"],
      timestamp: Date.now(),
    }
  }
}

// Default configurations for different task modes
export const defaultStructuralConfigs: Record<TaskMode, StructuralValidationConfig> = {
  general: {
    requiredFields: ["task_id", "prompt", "answer"],
    fieldTypes: {
      task_id: "string",
      prompt: "string",
      answer: "string",
    },
    fieldConstraints: {
      task_id: { minLength: 1, maxLength: 100 },
      prompt: { minLength: 10, maxLength: 5000 },
      answer: { minLength: 1, maxLength: 2000 },
    },
  },
  math: {
    requiredFields: ["task_id", "prompt", "answer"],
    fieldTypes: {
      task_id: "string",
      prompt: "string",
      answer: "string",
    },
    fieldConstraints: {
      task_id: { minLength: 1, maxLength: 100 },
      prompt: { minLength: 10, maxLength: 1000 },
      answer: { minLength: 1, maxLength: 500 },
    },
  },
  code: {
    requiredFields: ["task_id", "prompt", "answer"],
    fieldTypes: {
      task_id: "string",
      prompt: "string",
      answer: "string",
    },
    fieldConstraints: {
      task_id: { minLength: 1, maxLength: 100 },
      prompt: { minLength: 20, maxLength: 2000 },
      answer: { minLength: 20, maxLength: 3000 },
    },
  },
  reasoning: {
    requiredFields: ["task_id", "prompt", "answer"],
    fieldTypes: {
      task_id: "string",
      prompt: "string",
      answer: "string",
    },
    fieldConstraints: {
      task_id: { minLength: 1, maxLength: 100 },
      prompt: { minLength: 20, maxLength: 1500 },
      answer: { minLength: 10, maxLength: 1000 },
    },
  },
  factual: {
    requiredFields: ["task_id", "prompt", "answer"],
    fieldTypes: {
      task_id: "string",
      prompt: "string",
      answer: "string",
    },
    fieldConstraints: {
      task_id: { minLength: 1, maxLength: 100 },
      prompt: { minLength: 10, maxLength: 500 },
      answer: { minLength: 10, maxLength: 500 },
    },
  },
  sentiment: {
    requiredFields: ["task_id", "prompt", "answer"],
    fieldTypes: {
      task_id: "string",
      prompt: "string",
      answer: "string",
    },
    fieldConstraints: {
      task_id: { minLength: 1, maxLength: 100 },
      prompt: { minLength: 10, maxLength: 1000 },
      answer: { minLength: 5, maxLength: 200 },
    },
  },
  summarization: {
    requiredFields: ["task_id", "prompt", "answer"],
    fieldTypes: {
      task_id: "string",
      prompt: "string",
      answer: "string",
    },
    fieldConstraints: {
      task_id: { minLength: 1, maxLength: 100 },
      prompt: { minLength: 50, maxLength: 5000 },
      answer: { minLength: 20, maxLength: 300 },
    },
  },
  ner: {
    requiredFields: ["task_id", "prompt", "answer"],
    fieldTypes: {
      task_id: "string",
      prompt: "string",
      answer: "string",
    },
    fieldConstraints: {
      task_id: { minLength: 1, maxLength: 100 },
      prompt: { minLength: 20, maxLength: 1000 },
      answer: { minLength: 5, maxLength: 500 },
    },
  },
}
