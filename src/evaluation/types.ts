/**
 * 명의 평가 시스템 타입 정의
 * 데이터 소스: OpenAlex, ClinicalTrials.gov, PubMed
 */

// ============================================================
// CORE TYPES
// ============================================================

/**
 * 기관 등급
 */
export type InstitutionTier = 'TERTIARY' | 'GENERAL' | 'SPECIALIZED' | 'HOSPITAL' | 'CLINIC'

/**
 * 데이터 신뢰도
 */
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW'

/**
 * 의사 프로필 (오픈소스 데이터 기반)
 */
export interface DoctorProfile {
  // 기본 정보
  openalexId: string
  name: string
  nameEn?: string
  institution: {
    name: string
    tier: InstitutionTier
  }
  department: string
  
  // 학술적 권위 (Academic Authority) - OpenAlex
  academic: {
    hIndex?: number                    // H-index (우선)
    totalCitations: number             // 총 인용 횟수
    totalPapers: number                // 총 논문 수
    recentPapers5y: number             // 최근 5년 논문 수
    firstAuthorCount: number           // 제1저자 논문 수
    lastAuthorCount: number            // 교신저자 논문 수
    concepts: string[]                 // 연구 분야 키워드
    topPapers: {
      title: string
      journal: string
      year: number
      citations: number
      doi?: string
    }[]
  }
  
  // 임상 혁신 (Clinical Innovation) - ClinicalTrials.gov
  clinical: {
    totalTrials: number                // 총 임상시험 참여 수
    piTrialCount: number               // PI(Principal Investigator) 수
    activeTrialCount: number           // 현재 진행 중인 시험 수
    trials: {
      nctId: string
      title: string
      role: 'PI' | 'INVESTIGATOR'
      status: string
      phase?: string
    }[]
  }
  
  // 질환 전문화 (Disease Specialization) - PubMed + OpenAlex
  specialization?: {
    disease: string                    // 대상 질환
    diseaseSpecificPapers: number      // 해당 질환 논문 수
    recentDiseasePapers3y: number      // 최근 3년 질환 논문 수
    focusRate: number                  // 질환 집중도 (0-1)
  }
  
  // 데이터 품질
  dataQuality: {
    confidenceLevel: ConfidenceLevel
    score: number                      // 0-100
    warnings: string[]
    lastUpdated: string
  }
}

// ============================================================
// EVALUATION TYPES
// ============================================================

/**
 * 평가 점수 분해
 */
export interface ScoreBreakdown {
  // 학술적 권위 (45점)
  academicAuthority: {
    researchImpact: number             // 연구 임팩트 (20점)
    recentActivity: number             // 최근 연구 활동 (15점)
    researchLeadership: number         // 연구 주도성 (10점)
    total: number                      // 소계 (45점)
    details: string[]                  // 계산 근거
  }
  
  // 임상 혁신 (35점)
  clinicalInnovation: {
    trialLeadership: number            // 임상시험 리더십 (25점)
    activeResearch: number             // 현재 연구 활동 (10점)
    total: number                      // 소계 (35점)
    details: string[]                  // 계산 근거
  }
  
  // 질환 전문화 (20점)
  diseaseSpecialization: {
    focusScore: number                 // 질환 집중도 (15점)
    recentActivity: number             // 최근 활동성 (5점)
    total: number                      // 소계 (20점)
    details: string[]                  // 계산 근거
  }
  
  // 최종 점수
  finalScore: number                   // 총점 (100점)
}

/**
 * 평가 결과
 */
export interface EvaluationResult {
  profile: DoctorProfile
  score: ScoreBreakdown
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  percentile?: number                  // 백분위 (optional)
  
  // 평가 메타데이터
  evaluatedAt: string
  dataQuality: ConfidenceLevel
  warnings: string[]
}

// ============================================================
// DATA QUALITY TYPES
// ============================================================

/**
 * 데이터 품질 평가
 */
export interface QualityAssessment {
  score: number                        // 0-100
  confidenceLevel: ConfidenceLevel
  warnings: string[]
  
  // 세부 평가
  details: {
    hasOpenAlexData: boolean
    hasClinicalTrialsData: boolean
    minimumPapers: boolean             // 최소 5편 이상
    recentActivity: boolean            // 최근 5년 활동
    dataCompleteness: number           // 0-100
  }
}

// ============================================================
// EXTERNAL API TYPES
// ============================================================

/**
 * OpenAlex 작가 정보
 */
export interface OpenAlexAuthor {
  id: string
  display_name: string
  works_count: number
  cited_by_count: number
  h_index?: number
  concepts: {
    display_name: string
    score: number
  }[]
  affiliations?: {
    institution: {
      display_name: string
    }
  }[]
}

/**
 * OpenAlex 논문 정보
 */
export interface OpenAlexWork {
  id: string
  title: string
  publication_year: number
  cited_by_count: number
  authorships: {
    author_position: 'first' | 'middle' | 'last'
    author: {
      id: string
      display_name: string
    }
  }[]
  primary_location?: {
    source?: {
      display_name: string
    }
  }
  doi?: string
}

/**
 * ClinicalTrials.gov 시험 정보
 */
export interface ClinicalTrial {
  nctId: string
  title: string
  status: string
  phase?: string
  investigators: {
    name: string
    role: 'PRINCIPAL_INVESTIGATOR' | 'SUB_INVESTIGATOR'
  }[]
  conditions: string[]
  startDate?: string
}

// ============================================================
// UTILITY TYPES
// ============================================================

/**
 * 평가 옵션
 */
export interface EvaluationOptions {
  disease?: string                     // 특정 질환 평가
  includeDetails?: boolean             // 상세 점수 분해 포함
  minDataQuality?: ConfidenceLevel     // 최소 데이터 품질
}

/**
 * 비교 결과
 */
export interface ComparisonResult {
  doctors: EvaluationResult[]
  rankings: {
    overall: string[]                  // 종합 순위
    academic: string[]                 // 학술 순위
    clinical: string[]                 // 임상 순위
    specialization: string[]           // 전문화 순위
  }
}
