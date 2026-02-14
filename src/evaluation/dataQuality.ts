/**
 * 데이터 품질 평가 모듈
 * 오픈소스 데이터의 신뢰도를 평가합니다.
 */

import type { DoctorProfile, QualityAssessment, ConfidenceLevel } from './types'

/**
 * 데이터 품질 평가
 */
export function assessDataQuality(profile: DoctorProfile): QualityAssessment {
  let score = 100
  const warnings: string[] = []
  
  // 세부 평가 항목
  const details = {
    hasOpenAlexData: false,
    hasClinicalTrialsData: false,
    minimumPapers: false,
    recentActivity: false,
    dataCompleteness: 100
  }
  
  // 1. OpenAlex 데이터 존재 여부 (40점)
  if (!profile.openalexId) {
    score -= 40
    warnings.push('OpenAlex 데이터 없음 - 학술적 평가 불가')
  } else {
    details.hasOpenAlexData = true
  }
  
  // 2. 논문 수 충분성 (20점)
  if (profile.academic.totalPapers < 5) {
    score -= 20
    warnings.push(`논문 수 부족 (${profile.academic.totalPapers}편) - 최소 5편 필요`)
  } else {
    details.minimumPapers = true
  }
  
  // 3. 최근 활동성 (15점)
  if (profile.academic.recentPapers5y === 0) {
    score -= 15
    warnings.push('최근 5년 논문 없음 - 연구 활동 정지 가능성')
  } else {
    details.recentActivity = true
  }
  
  // 4. 임상시험 데이터 (10점)
  if (profile.clinical.totalTrials === 0) {
    score -= 10
    warnings.push('임상시험 경험 없음 - 실질적 임상 연구 경험 부족')
  } else {
    details.hasClinicalTrialsData = true
  }
  
  // 5. H-index 데이터 존재 (5점)
  if (!profile.academic.hIndex) {
    score -= 5
    warnings.push('H-index 데이터 없음 - 인용수로 대체 평가')
  }
  
  // 6. 저자 위치 정보 (5점)
  if (profile.academic.firstAuthorCount === 0 && profile.academic.lastAuthorCount === 0) {
    score -= 5
    warnings.push('제1저자/교신저자 정보 없음 - 연구 주도성 평가 제한')
  }
  
  // 7. 상위 논문 정보 (5점)
  if (profile.academic.topPapers.length === 0) {
    score -= 5
    warnings.push('대표 논문 정보 없음 - 연구 품질 평가 제한')
  }
  
  // 데이터 완전성 계산 (0-100)
  const completenessItems = [
    profile.openalexId ? 1 : 0,
    profile.academic.totalPapers >= 5 ? 1 : 0,
    profile.academic.recentPapers5y > 0 ? 1 : 0,
    profile.clinical.totalTrials > 0 ? 1 : 0,
    profile.academic.hIndex ? 1 : 0,
    profile.academic.firstAuthorCount > 0 || profile.academic.lastAuthorCount > 0 ? 1 : 0,
    profile.academic.topPapers.length > 0 ? 1 : 0
  ]
  details.dataCompleteness = Math.round((completenessItems.reduce((a, b) => a + b, 0) / completenessItems.length) * 100)
  
  // 신뢰도 레벨 결정
  let confidenceLevel: ConfidenceLevel
  if (score >= 80) {
    confidenceLevel = 'HIGH'
  } else if (score >= 60) {
    confidenceLevel = 'MEDIUM'
  } else {
    confidenceLevel = 'LOW'
  }
  
  return {
    score: Math.max(0, score),
    confidenceLevel,
    warnings,
    details
  }
}

/**
 * 평가 가능 여부 판단
 */
export function isEvaluable(profile: DoctorProfile, minQuality: ConfidenceLevel = 'LOW'): boolean {
  const quality = assessDataQuality(profile)
  
  // 최소 품질 기준 충족 여부
  const qualityThresholds = {
    'HIGH': 80,
    'MEDIUM': 60,
    'LOW': 0
  }
  
  return quality.score >= qualityThresholds[minQuality]
}

/**
 * 데이터 품질 경고 메시지 생성
 */
export function generateQualityWarning(profile: DoctorProfile): string | null {
  const quality = assessDataQuality(profile)
  
  if (quality.confidenceLevel === 'HIGH') {
    return null
  }
  
  if (quality.confidenceLevel === 'LOW') {
    return `⚠️ 데이터 품질이 낮아 평가 신뢰도가 제한됩니다. ${quality.warnings.slice(0, 2).join(', ')}`
  }
  
  // MEDIUM
  return `ℹ️ 일부 데이터 누락: ${quality.warnings[0] || '정보 제한'}`
}

/**
 * 데이터 품질 점수 HTML 생성
 */
export function renderQualityBadge(confidenceLevel: ConfidenceLevel): string {
  const badges = {
    'HIGH': '<span class="badge bg-green-100 text-green-700">데이터 신뢰도 높음</span>',
    'MEDIUM': '<span class="badge bg-yellow-100 text-yellow-700">데이터 신뢰도 보통</span>',
    'LOW': '<span class="badge bg-red-100 text-red-700">데이터 신뢰도 낮음</span>'
  }
  
  return badges[confidenceLevel]
}

/**
 * 누락 데이터 항목 반환
 */
export function getMissingDataItems(profile: DoctorProfile): string[] {
  const missing: string[] = []
  
  if (!profile.openalexId) {
    missing.push('OpenAlex 프로필')
  }
  
  if (profile.academic.totalPapers < 5) {
    missing.push('충분한 논문 수')
  }
  
  if (profile.academic.recentPapers5y === 0) {
    missing.push('최근 5년 연구 활동')
  }
  
  if (profile.clinical.totalTrials === 0) {
    missing.push('임상시험 경험')
  }
  
  if (!profile.academic.hIndex) {
    missing.push('H-index')
  }
  
  if (profile.academic.firstAuthorCount === 0 && profile.academic.lastAuthorCount === 0) {
    missing.push('제1저자/교신저자 정보')
  }
  
  return missing
}
