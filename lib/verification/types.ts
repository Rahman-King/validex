/**
 * Verification System Types
 * Three-stage verification architecture for data validation
 * Suggestion-based system where multiple AI models provide suggestions
 */

export type TaskMode = 
  | "general" 
  | "math" 
  | "code" 
  | "reasoning" 
  | "factual" 
  | "sentiment" 
  | "summarization" 
  | "ner"

export type VerificationStage = "structural" | "content" | "anomaly"

export type VerificationStatus = "pending" | "valid" | "invalid" | "warning"

export interface ModelSuggestion {
  source: "bohr" | "gemini" | "local"
  valid: boolean
  confidence: number
  analysis: string
  issues: string[]
  reasoning?: string
  metadata?: Record<string, any>
}

export interface ValidationResult {
  stage: VerificationStage
  status: VerificationStatus
  score: number // 0-1 confidence score
  details: string
  issues: string[]
  suggestions: ModelSuggestion[]
  finalDecision: string
  timestamp: number
}

export interface VerificationReport {
  taskId: string
  overallStatus: VerificationStatus
  overallScore: number
  stages: {
    structural: ValidationResult
    content: ValidationResult
    anomaly: ValidationResult
  }
  allSuggestions: ModelSuggestion[]
  finalSynthesis: string
  recommendations: string[]
  verifiedAt: number
}

export interface StructuralValidationConfig {
  requiredFields: string[]
  fieldTypes: Record<string, "string" | "number" | "boolean" | "date" | "array" | "object">
  fieldConstraints: Record<string, {
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    pattern?: string
    enum?: string[]
  }>
}

export interface ContentVerificationConfig {
  checkPII: boolean
  checkBias: boolean
  checkHallucinations: boolean
  checkFacts: boolean
  enableBohrVerification?: boolean
  enableSuggestionSystem?: boolean
  factCheckSources: string[]
  biasThreshold: number
  hallucinationThreshold: number
}

export interface AnomalyDetectionConfig {
  enableOutlierDetection: boolean
  enableConsistencyChecks: boolean
  outlierThreshold: number // standard deviations
  consistencyRules: Array<{
    field1: string
    field2: string
    rule: "less_than" | "greater_than" | "equal" | "not_equal"
  }>
}

export interface VerificationConfig {
  structural: StructuralValidationConfig
  content: ContentVerificationConfig
  anomaly: AnomalyDetectionConfig
  enabledStages: VerificationStage[]
  localModel?: string // Ollama model for final synthesis
}

export interface OnlineResearchConfig {
  enabled: boolean
  sources: Array<"google" | "arxiv" | "wikipedia" | "scholar">
  maxResults: number
  timeoutMs: number
}

export interface VerificationRequest {
  data: any
  taskMode: TaskMode
  config?: Partial<VerificationConfig>
  enableOnlineResearch?: boolean
}

export interface VerificationResponse {
  success: boolean
  report: VerificationReport
  originalData: any
  verifiedData?: any
}
