/**
 * Stage 3: Anomaly Detection (The Watchman)
 * Checks if the data is statistically normal - outlier detection, consistency checks
 */

import type { 
  ValidationResult, 
  VerificationStage, 
  AnomalyDetectionConfig,
  TaskMode 
} from "./types"

// Statistical utilities
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length)
}

function detectOutliers(values: number[], threshold: number = 2): number[] {
  if (values.length < 3) return []
  
  const mean = calculateMean(values)
  const stdDev = calculateStdDev(values, mean)
  
  return values.filter(v => Math.abs(v - mean) > threshold * stdDev)
}

// Consistency checks
function checkConsistency(
  data: any, 
  rules: Array<{ field1: string; field2: string; rule: string }>
): string[] {
  const issues: string[] = []

  for (const rule of rules) {
    const val1 = data[rule.field1]
    const val2 = data[rule.field2]

    if (val1 === undefined || val2 === undefined) continue

    switch (rule.rule) {
      case "less_than":
        if (val1 >= val2) {
          issues.push(`${rule.field1} (${val1}) should be less than ${rule.field2} (${val2})`)
        }
        break
      case "greater_than":
        if (val1 <= val2) {
          issues.push(`${rule.field1} (${val1}) should be greater than ${rule.field2} (${val2})`)
        }
        break
      case "equal":
        if (val1 !== val2) {
          issues.push(`${rule.field1} (${val1}) should equal ${rule.field2} (${val2})`)
        }
        break
      case "not_equal":
        if (val1 === val2) {
          issues.push(`${rule.field1} (${val1}) should not equal ${rule.field2} (${val2})`)
        }
        break
    }
  }

  return issues
}

// Range-based anomaly detection
function checkRanges(data: any, taskMode: TaskMode): string[] {
  const issues: string[] = []

  // Check answer length
  const answerLength = data.answer?.length || 0
  const promptLength = data.prompt?.length || 0

  switch (taskMode) {
    case "math":
      if (answerLength > 500) {
        issues.push(`Math answer unusually long: ${answerLength} chars`)
      }
      if (answerLength < 1) {
        issues.push(`Math answer too short`)
      }
      break
    
    case "code":
      if (answerLength > 3000) {
        issues.push(`Code answer unusually long: ${answerLength} chars`)
      }
      if (answerLength < 20) {
        issues.push(`Code answer too short`)
      }
      break
    
    case "sentiment":
      if (answerLength > 200) {
        issues.push(`Sentiment answer unusually long: ${answerLength} chars`)
      }
      break
    
    case "summarization":
      if (answerLength > promptLength) {
        issues.push(`Summary longer than original text`)
      }
      if (answerLength < 20) {
        issues.push(`Summary too short`)
      }
      break
    
    case "ner":
      if (answerLength > 500) {
        issues.push(`NER answer unusually long: ${answerLength} chars`)
      }
      break
    
    default:
      if (answerLength > 2000) {
        issues.push(`Answer unusually long: ${answerLength} chars`)
      }
  }

  return issues
}

// Statistical anomaly detection for numerical data
function detectNumericalAnomalies(data: any): string[] {
  const issues: string[] = []
  const numericalValues: number[] = []

  // Extract numerical values from the data
  const extractNumbers = (obj: any): void => {
    if (typeof obj === 'number' && !isNaN(obj)) {
      numericalValues.push(obj)
    } else if (Array.isArray(obj)) {
      obj.forEach(extractNumbers)
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(extractNumbers)
    }
  }

  extractNumbers(data)

  if (numericalValues.length > 3) {
    const outliers = detectOutliers(numericalValues, 2)
    if (outliers.length > 0) {
      issues.push(`Detected ${outliers.length} numerical outlier(s): ${outliers.join(", ")}`)
    }
  }

  return issues
}

// Pattern-based anomaly detection
function detectPatternAnomalies(data: any, taskMode: TaskMode): string[] {
  const issues: string[] = []
  const answer = data.answer || ""

  switch (taskMode) {
    case "math":
      // Check if math answer contains unexpected text
      if (!/\d+/.test(answer)) {
        issues.push("Math answer contains no numerical values")
      }
      break
    
    case "code":
      // Check if code answer is missing code constructs
      if (!/function|def|class|const|let|var|=>/.test(answer)) {
        issues.push("Code answer missing code constructs")
      }
      break
    
    case "factual":
      // Check if factual answer is too vague
      if (/maybe|probably|perhaps|might be/i.test(answer)) {
        issues.push("Factual answer contains uncertainty language")
      }
      break
    
    case "sentiment":
      // Check if sentiment answer is missing classification
      if (!/positive|negative|neutral/i.test(answer)) {
        issues.push("Sentiment answer missing classification")
      }
      break
    
    case "ner":
      // Check if NER answer contains entity labels
      if (!/PERSON|ORGANIZATION|LOCATION|DATE|person|org|location|date/i.test(answer)) {
        issues.push("NER answer missing entity labels")
      }
      break
  }

  return issues
}

export async function validateAnomalies(
  data: any,
  taskMode: TaskMode,
  config?: AnomalyDetectionConfig
): Promise<ValidationResult> {
  const stage: VerificationStage = "anomaly"
  const issues: string[] = []
  const scores: number[] = []

  const effectiveConfig: AnomalyDetectionConfig = config || {
    enableOutlierDetection: true,
    enableConsistencyChecks: true,
    outlierThreshold: 2,
    consistencyRules: [],
  }

  try {
    // 1. Range-based anomaly detection
    const rangeIssues = checkRanges(data, taskMode)
    issues.push(...rangeIssues)
    scores.push(rangeIssues.length === 0 ? 1 : 0.7)

    // 2. Numerical anomaly detection
    if (effectiveConfig.enableOutlierDetection) {
      const numericalIssues = detectNumericalAnomalies(data)
      issues.push(...numericalIssues)
      scores.push(numericalIssues.length === 0 ? 1 : 0.8)
    }

    // 3. Consistency checks
    if (effectiveConfig.enableConsistencyChecks && effectiveConfig.consistencyRules.length > 0) {
      const consistencyIssues = checkConsistency(data, effectiveConfig.consistencyRules)
      issues.push(...consistencyIssues)
      scores.push(consistencyIssues.length === 0 ? 1 : 0.6)
    }

    // 4. Pattern-based anomaly detection
    const patternIssues = detectPatternAnomalies(data, taskMode)
    issues.push(...patternIssues)
    scores.push(patternIssues.length === 0 ? 1 : 0.7)

    // Calculate overall score
    const overallScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 1

    const status: "valid" | "invalid" | "warning" = 
      overallScore >= 0.8 ? "valid" :
      overallScore >= 0.6 ? "warning" : "invalid"

    return {
      stage,
      status,
      score: overallScore,
      details: issues.length === 0 
        ? "No anomalies detected" 
        : `Found ${issues.length} anomaly/ies`,
      issues,
      timestamp: Date.now(),
    }
  } catch (error) {
    return {
      stage,
      status: "invalid",
      score: 0,
      details: `Anomaly detection failed: ${error}`,
      issues: ["Unexpected error during anomaly detection"],
      timestamp: Date.now(),
    }
  }
}

// Default configurations for different task modes
export const defaultAnomalyConfigs: Record<TaskMode, AnomalyDetectionConfig> = {
  general: {
    enableOutlierDetection: true,
    enableConsistencyChecks: true,
    outlierThreshold: 2,
    consistencyRules: [],
  },
  math: {
    enableOutlierDetection: true,
    enableConsistencyChecks: false,
    outlierThreshold: 2,
    consistencyRules: [],
  },
  code: {
    enableOutlierDetection: false,
    enableConsistencyChecks: false,
    outlierThreshold: 2,
    consistencyRules: [],
  },
  reasoning: {
    enableOutlierDetection: false,
    enableConsistencyChecks: true,
    outlierThreshold: 2,
    consistencyRules: [],
  },
  factual: {
    enableOutlierDetection: false,
    enableConsistencyChecks: false,
    outlierThreshold: 2,
    consistencyRules: [],
  },
  sentiment: {
    enableOutlierDetection: false,
    enableConsistencyChecks: false,
    outlierThreshold: 2,
    consistencyRules: [],
  },
  summarization: {
    enableOutlierDetection: false,
    enableConsistencyChecks: true,
    outlierThreshold: 2,
    consistencyRules: [
      { field1: "answer", field2: "prompt", rule: "less_than" },
    ],
  },
  ner: {
    enableOutlierDetection: false,
    enableConsistencyChecks: false,
    outlierThreshold: 2,
    consistencyRules: [],
  },
}
