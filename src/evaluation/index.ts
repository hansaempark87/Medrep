/**
 * 명의 평가 시스템 Entry Point
 */

// Types
export * from './types'

// Core evaluation
export { evaluateDoctor, evaluateDoctors } from './calculator'

// Data quality
export {
  assessDataQuality,
  isEvaluable,
  generateQualityWarning,
  renderQualityBadge,
  getMissingDataItems
} from './dataQuality'

// Version
export const EVALUATION_VERSION = '16.0.0'
export const EVALUATION_MODEL = '3-Axis Evaluation (Academic + Clinical + Specialization)'
