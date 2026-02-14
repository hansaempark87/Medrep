/**
 * 3축 평가 계산 모듈
 * 학술적 권위(45점) + 임상 혁신(35점) + 질환 전문화(20점) = 100점
 */

import type { DoctorProfile, ScoreBreakdown, EvaluationResult, EvaluationOptions } from './types'
import { assessDataQuality } from './dataQuality'

// ============================================================
// 1. 학술적 권위 (Academic Authority) - 45점
// ============================================================

/**
 * 1-1. 연구 임팩트 (20점)
 * H-index 우선, 없으면 인용수로 대체
 */
function calculateResearchImpact(academic: DoctorProfile['academic']): { score: number; detail: string } {
  let score = 0
  let detail = ''
  
  if (academic.hIndex && academic.hIndex > 0) {
    // H-index 기반 계산 (50 = 만점)
    score = Math.min(academic.hIndex * 0.4, 20)
    detail = `H-index ${academic.hIndex} → ${score.toFixed(1)}점`
  } else {
    // 인용수 기반 계산 (log scale)
    const citationScore = Math.min(Math.log10(academic.totalCitations + 1) * 4, 20)
    score = citationScore
    detail = `총 인용 ${academic.totalCitations.toLocaleString()}회 → ${score.toFixed(1)}점`
  }
  
  return { score: Math.round(score * 10) / 10, detail }
}

/**
 * 1-2. 최근 연구 활동 (15점)
 * 최근 5년간 논문 수 (30편 = 만점)
 */
function calculateRecentActivity(academic: DoctorProfile['academic']): { score: number; detail: string } {
  const score = Math.min(academic.recentPapers5y * 0.5, 15)
  const detail = `최근 5년 논문 ${academic.recentPapers5y}편 → ${score.toFixed(1)}점`
  
  return { score: Math.round(score * 10) / 10, detail }
}

/**
 * 1-3. 연구 주도성 (10점)
 * 제1저자 + 교신저자 비율
 */
function calculateResearchLeadership(academic: DoctorProfile['academic']): { score: number; detail: string } {
  const totalPapers = Math.max(academic.totalPapers, 1)
  const leadershipCount = academic.firstAuthorCount + academic.lastAuthorCount
  const leadershipRatio = leadershipCount / totalPapers
  const score = Math.min(leadershipRatio * 10, 10)
  
  const detail = `제1저자 ${academic.firstAuthorCount}편 + 교신저자 ${academic.lastAuthorCount}편 / 총 ${academic.totalPapers}편 = ${(leadershipRatio * 100).toFixed(1)}% → ${score.toFixed(1)}점`
  
  return { score: Math.round(score * 10) / 10, detail }
}

/**
 * 학술적 권위 총점 계산
 */
function calculateAcademicAuthority(academic: DoctorProfile['academic']) {
  const impact = calculateResearchImpact(academic)
  const activity = calculateRecentActivity(academic)
  const leadership = calculateResearchLeadership(academic)
  
  const total = impact.score + activity.score + leadership.score
  
  return {
    researchImpact: impact.score,
    recentActivity: activity.score,
    researchLeadership: leadership.score,
    total: Math.round(total * 10) / 10,
    details: [
      `연구 임팩트: ${impact.detail}`,
      `최근 활동: ${activity.detail}`,
      `연구 주도성: ${leadership.detail}`
    ]
  }
}

// ============================================================
// 2. 임상 혁신 (Clinical Innovation) - 35점
// ============================================================

/**
 * 2-1. 임상시험 리더십 (25점)
 * PI 건수 × 3점 (8건 = 만점)
 */
function calculateTrialLeadership(clinical: DoctorProfile['clinical']): { score: number; detail: string } {
  const score = Math.min(clinical.piTrialCount * 3, 25)
  const detail = `PI 임상시험 ${clinical.piTrialCount}건 → ${score.toFixed(1)}점`
  
  return { score: Math.round(score * 10) / 10, detail }
}

/**
 * 2-2. 현재 연구 활동 (10점)
 * 현재 진행 중인 임상시험 여부 (Binary)
 */
function calculateActiveResearch(clinical: DoctorProfile['clinical']): { score: number; detail: string } {
  const score = clinical.activeTrialCount > 0 ? 10 : 0
  const detail = clinical.activeTrialCount > 0
    ? `현재 진행 중인 임상시험 ${clinical.activeTrialCount}건 → 10점`
    : '현재 진행 중인 임상시험 없음 → 0점'
  
  return { score, detail }
}

/**
 * 임상 혁신 총점 계산
 */
function calculateClinicalInnovation(clinical: DoctorProfile['clinical']) {
  const leadership = calculateTrialLeadership(clinical)
  const active = calculateActiveResearch(clinical)
  
  const total = leadership.score + active.score
  
  return {
    trialLeadership: leadership.score,
    activeResearch: active.score,
    total: Math.round(total * 10) / 10,
    details: [
      `임상시험 리더십: ${leadership.detail}`,
      `현재 연구: ${active.detail}`
    ]
  }
}

// ============================================================
// 3. 질환 전문화 (Disease Specialization) - 20점
// ============================================================

/**
 * 3-1. 질환 집중도 (15점)
 * 해당 질환 관련 논문 비율
 */
function calculateFocusScore(specialization?: DoctorProfile['specialization']): { score: number; detail: string } {
  if (!specialization) {
    return { score: 0, detail: '질환 특화 데이터 없음 → 0점' }
  }
  
  const score = Math.min(specialization.focusRate * 15, 15)
  const detail = `${specialization.disease} 관련 논문 ${specialization.diseaseSpecificPapers}편 / 총 논문 수 = ${(specialization.focusRate * 100).toFixed(1)}% → ${score.toFixed(1)}점`
  
  return { score: Math.round(score * 10) / 10, detail }
}

/**
 * 3-2. 최근 활동성 (5점)
 * 최근 3년간 해당 질환 논문 여부 (Binary)
 */
function calculateRecentDiseaseActivity(specialization?: DoctorProfile['specialization']): { score: number; detail: string } {
  if (!specialization) {
    return { score: 0, detail: '질환 특화 데이터 없음 → 0점' }
  }
  
  const score = specialization.recentDiseasePapers3y > 0 ? 5 : 0
  const detail = specialization.recentDiseasePapers3y > 0
    ? `최근 3년 ${specialization.disease} 논문 ${specialization.recentDiseasePapers3y}편 → 5점`
    : `최근 3년 ${specialization.disease} 논문 없음 → 0점`
  
  return { score, detail }
}

/**
 * 질환 전문화 총점 계산
 */
function calculateDiseaseSpecialization(specialization?: DoctorProfile['specialization']) {
  const focus = calculateFocusScore(specialization)
  const recent = calculateRecentDiseaseActivity(specialization)
  
  const total = focus.score + recent.score
  
  return {
    focusScore: focus.score,
    recentActivity: recent.score,
    total: Math.round(total * 10) / 10,
    details: [
      `질환 집중도: ${focus.detail}`,
      `최근 활동성: ${recent.detail}`
    ]
  }
}

// ============================================================
// 종합 평가
// ============================================================

/**
 * 등급 산정
 * S: 85점 이상 (상위 3%)
 * A: 75-84점 (상위 15%)
 * B: 65-74점 (상위 40%)
 * C: 55-64점 (상위 70%)
 * D: 55점 미만
 */
function assignGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 85) return 'S'
  if (score >= 75) return 'A'
  if (score >= 65) return 'B'
  if (score >= 55) return 'C'
  return 'D'
}

/**
 * 의사 평가 수행
 */
export function evaluateDoctor(
  profile: DoctorProfile,
  options: EvaluationOptions = {}
): EvaluationResult {
  // 데이터 품질 평가
  const quality = assessDataQuality(profile)
  
  // 질환 전문화는 옵션으로 제공된 경우만 평가
  const specializationData = options.disease && profile.specialization?.disease === options.disease
    ? profile.specialization
    : undefined
  
  // 3축 점수 계산
  const academic = calculateAcademicAuthority(profile.academic)
  const clinical = calculateClinicalInnovation(profile.clinical)
  const specialization = calculateDiseaseSpecialization(specializationData)
  
  // 최종 점수
  const finalScore = academic.total + clinical.total + specialization.total
  
  // 점수 분해
  const scoreBreakdown: ScoreBreakdown = {
    academicAuthority: academic,
    clinicalInnovation: clinical,
    diseaseSpecialization: specialization,
    finalScore: Math.round(finalScore * 10) / 10
  }
  
  // 등급 산정
  const grade = assignGrade(finalScore)
  
  // 평가 결과 반환
  return {
    profile,
    score: scoreBreakdown,
    grade,
    evaluatedAt: new Date().toISOString(),
    dataQuality: quality.confidenceLevel,
    warnings: quality.warnings
  }
}

/**
 * 다수 의사 평가 및 정렬
 */
export function evaluateDoctors(
  profiles: DoctorProfile[],
  options: EvaluationOptions = {}
): EvaluationResult[] {
  return profiles
    .map(profile => evaluateDoctor(profile, options))
    .sort((a, b) => b.score.finalScore - a.score.finalScore)
}
