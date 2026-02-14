# 명의 평가 시스템 명세서

## 1. 프로젝트 개요
**목표:** 일반인 대상 질환별 명의 찾기 서비스의 객관적 평가 엔진  
**핵심 철학:** "Doctor's Doctor" - 다른 의사들이 배우러 가는 의사 발견  
**기술 스택:** TypeScript + Hono + Cloudflare Workers + 정적 JSON 데이터

## 2. 평가 원칙
1. **투명성**: 모든 점수 산출 과정 공개
2. **객관성**: 공공 데이터만 사용, 광고비 무관
3. **안전성**: 의료사고 이력 필터링 (Kill Switch)
4. **공정성**: 대형병원 편향 최소화

## 3. 3축 평가 모델
**최종 점수 = 0.45 × 권위성 + 0.35 × 전문성 + 0.20 × 신뢰성**

### 권위성 (Authority) 0-100점
**진료 가이드라인 역할 (최대 50점)**
- 주저자(First Author): 50점
- 교신저자(Corresponding Author): 45점
- 공동저자(Co-author): 35점
- 위원장(Committee Chair): 40점
- 위원(Committee Member): 25점

**학회 리더십 (최대 30점)**
- 이사장(President): 30점
- 부이사장(Vice President): 25점
- 이사(Director): 18점
- 위원장(Committee Chair): 15점
- 위원(Committee Member): 8점

**정부 자문 (최대 20점)**
- 복지부/질병청: 20점
- 심평원(건강보험심사평가원): 15점
- 식약처: 12점
- 지자체: 8점

### 전문성 (Expertise) 0-100점
**임상시험 PI (최대 40점)**
- 공식: `PI 건수 × 4점` (상한 40점)
- 예: PI 10건 = 40점, PI 5건 = 20점

**질환 특화도 (최대 35점)**
- 공식: `(질환 관련 논문 수 / 전체 논문 수) × 35점`
- 예: 100편 중 80편이 해당 질환 → 28점

**학술 영향력 (최대 25점)**
- 공식: `min(H-index / 2, 25점)`
- 예: H-index 50 → 25점, H-index 30 → 15점

### 신뢰성 (Trust) 0-100점
**기관 등급 (최대 40점)**
- 상급종합병원: 40점
- 종합병원: 30점
- 전문병원: 25점
- 병원: 18점
- 의원: 10점

**진료 경력 (최대 30점)**
- 공식: `min(전문의 연수 × 2, 30점)`
- 예: 15년 경력 → 30점, 10년 경력 → 20점

**지속 학습 (최대 30점)**
- 국제학회 연자(Speaker): 10점
- 국제학회 참석: 5점
- 최근 3년 논문 1편 이상: 10점
- 보수교육 이수: 5점

## 4. 안전장치 (Kill Switch - 필수)
**다음 이력이 있으면 점수 무관 평가 대상 제외:**
- 중대 의료분쟁 3건 이상
- 면허정지 이력
- 허위광고 적발
- 보험사기 적발
- 형사처벌 이력 (의료 관련)

## 5. 등급 기준
| 등급 | 점수 범위 | 설명 | 비율 |
|------|----------|------|------|
| **S등급** | 90점 이상 | 세계적 명의 | 상위 5% |
| **A등급** | 80-89점 | 국내 최고 수준 | 상위 20% |
| **B등급** | 70-79점 | 우수 명의 | 상위 50% |
| **C등급** | 60-69점 | 양호 | 상위 80% |
| **D등급** | 60점 미만 | 기본 | - |

## 6. 배지 시스템
**점수 기반이 아닌 조건 기반 배지 부여:**

| 배지 | 조건 | 설명 |
|------|------|------|
| 🏆 **가이드라인 저자** | 진료 가이드라인 역할 있음 | 국가/학회 가이드라인 집필 참여 |
| 🧪 **신약 연구 리더** | PI 5건 이상 | 임상시험 책임연구자로 신약 개발 주도 |
| 🎯 **한 우물 전문가** | 질환 특화도 70% 이상 | 특정 질환에만 집중 연구 |
| ✅ **무사고 진료** | 안전성 통과 + 15년 이상 | 15년 이상 중대 의료사고 없음 |
| 📚 **평생 학습자** | 지속학습 점수 80% 이상 (24점/30점) | 꾸준한 학술 활동 및 보수교육 |

## 7. 데이터 소스
### 공공 데이터
- **PubMed**: 논문 데이터, H-index
- **ClinicalTrials.gov**: 임상시험 PI 정보
- **대한의학회/전문학회**: 가이드라인, 학회 임원진
- **의료기관평가인증원**: 병원 등급
- **건강보험심사평가원**: 진료 실적

### 금지 데이터
- 환자 만족도 설문 (조작 가능)
- 언론 보도 (광고성)
- SNS 팔로워 수
- 자체 제출 데이터

## 8. 구현 가이드

### 8.1 데이터 구조
```typescript
interface DoctorEvaluation {
  name: string
  hospital: string
  department: string
  
  // 권위성 (Authority)
  authority: {
    guidelines: {
      role: 'first_author' | 'corresponding' | 'coauthor' | 'chair' | 'member'
      title: string
      year: number
      organization: string
    }[]
    societyLeadership: {
      role: 'president' | 'vice_president' | 'director' | 'chair' | 'member'
      society: string
      period: string
    }[]
    governmentAdvisory: {
      organization: string
      role: string
      year: number
    }[]
    score: number  // 0-100
  }
  
  // 전문성 (Expertise)
  expertise: {
    clinicalTrials: {
      role: 'PI' | 'co-investigator'
      nctId: string
      title: string
      phase: string
    }[]
    specialization: {
      totalPapers: number
      diseasePapers: number
      ratio: number  // 0-1
    }
    academicImpact: {
      hIndex: number
      totalCitations: number
      topPapers: {
        title: string
        journal: string
        year: number
        citations: number
      }[]
    }
    score: number  // 0-100
  }
  
  // 신뢰성 (Trust)
  trust: {
    hospitalTier: 'tertiary' | 'general' | 'specialized' | 'hospital' | 'clinic'
    careerYears: number
    continuousLearning: {
      internationalSpeaker: boolean
      internationalAttendance: boolean
      recentPapers: boolean
      continuingEducation: boolean
    }
    score: number  // 0-100
  }
  
  // 안전장치
  safety: {
    passed: boolean
    medicalDisputes: number
    licenseSuspension: boolean
    falseAdvertising: boolean
    insuranceFraud: boolean
  }
  
  // 최종 점수
  finalScore: number  // 0-100
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  badges: ('guideline_author' | 'trial_leader' | 'specialist' | 'safe_practice' | 'lifelong_learner')[]
}
```

### 8.2 점수 계산 함수
```typescript
function calculateDoctorScore(data: DoctorEvaluation): number {
  // 안전장치 체크
  if (!data.safety.passed) {
    return 0  // 평가 대상 제외
  }
  
  // 권위성 점수 계산
  const authorityScore = calculateAuthority(data.authority)
  
  // 전문성 점수 계산
  const expertiseScore = calculateExpertise(data.expertise)
  
  // 신뢰성 점수 계산
  const trustScore = calculateTrust(data.trust)
  
  // 최종 점수 = 가중 평균
  const finalScore = (
    authorityScore * 0.45 +
    expertiseScore * 0.35 +
    trustScore * 0.20
  )
  
  return Math.round(finalScore)
}
```

### 8.3 등급 산정
```typescript
function assignGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  return 'D'
}
```

### 8.4 배지 부여
```typescript
function assignBadges(data: DoctorEvaluation): string[] {
  const badges: string[] = []
  
  // 가이드라인 저자
  if (data.authority.guidelines.length > 0) {
    badges.push('guideline_author')
  }
  
  // 신약 연구 리더
  const piCount = data.expertise.clinicalTrials.filter(t => t.role === 'PI').length
  if (piCount >= 5) {
    badges.push('trial_leader')
  }
  
  // 한 우물 전문가
  if (data.expertise.specialization.ratio >= 0.7) {
    badges.push('specialist')
  }
  
  // 무사고 진료
  if (data.safety.passed && data.trust.careerYears >= 15) {
    badges.push('safe_practice')
  }
  
  // 평생 학습자
  const learningScore = calculateLearningScore(data.trust.continuousLearning)
  if (learningScore >= 24) {  // 30점 만점 중 24점 이상
    badges.push('lifelong_learner')
  }
  
  return badges
}
```

## 9. UI 표시 가이드

### 9.1 점수 카드
```
┌─────────────────────────────────────┐
│ 김효수 교수                     S등급 │
│ 서울대학교병원 · 순환기내과           │
├─────────────────────────────────────┤
│ 종합 점수: 95점                      │
│ ▓▓▓▓▓▓▓▓▓░ 95/100                   │
├─────────────────────────────────────┤
│ 권위성  45점 ▓▓▓▓▓▓▓▓▓░ (최대 45점)  │
│ 전문성  35점 ▓▓▓▓▓▓▓▓▓░ (최대 35점)  │
│ 신뢰성  15점 ▓▓▓▓▓▓▓░░░ (최대 20점)  │
├─────────────────────────────────────┤
│ 🏆 가이드라인 저자                   │
│ 🧪 신약 연구 리더                    │
│ ✅ 무사고 진료                       │
└─────────────────────────────────────┘
```

### 9.2 상세 점수 분해
**권위성 45점 (최대 45점)**
- 가이드라인 주저자: 50점 → 45점 (가중치 0.45)
  * 대한심장학회 이상지질혈증 가이드라인 (2023)
- 학회 회장: 30점 → 13.5점 (가중치 0.45)
  * 대한심장학회 회장 (2021-2022)

**전문성 35점 (최대 35점)**
- 임상시험 PI: 40점 → 14점 (가중치 0.35)
  * 10건의 PI 경험
- 질환 특화도: 28점 → 9.8점 (가중치 0.35)
  * 심혈관 논문 80/100편 (80%)
- H-index: 25점 → 8.75점 (가중치 0.35)
  * H-index 50

**신뢰성 15점 (최대 20점)**
- 상급종합병원: 40점 → 8점 (가중치 0.20)
- 진료경력 30년: 30점 → 6점 (가중치 0.20)
- 지속학습 24점: 24점 → 4.8점 (가중치 0.20)

## 10. 주의사항
1. **개인정보 보호**: 의료사고 이력 등 민감 정보는 공개하지 않음 (내부 필터링만 사용)
2. **정기 업데이트**: 매년 1월 데이터 갱신
3. **투명성 보장**: 점수 산출 로직 GitHub 공개
4. **이의제기 프로세스**: contact@medrep-intelligence.pages.dev
5. **면책조항**: "본 평가는 참고용이며, 실제 진료 선택은 환자 본인 판단"

## 11. 로드맵

### ✅ Phase 1 (v15.0 - 완료)
- ✅ 기본 평가 시스템 구축
- ✅ 대표 논문 저널 기반 평가
- ✅ 학회 임원진 평가 (수동 데이터)
- ✅ 수상 경력 평가 (수동 데이터)

### ✅ Phase 2 (v16.0 - 현재, 일부 완료)
- ✅ 3축 평가 모델 적용 (학술적 권위, 임상 혁신, 질환 전문화)
- ✅ 타입 정의 완성 (src/evaluation/types.ts)
- ✅ 평가 계산 로직 구현 (src/evaluation/calculator.ts)
- ✅ 데이터 품질 평가 (src/evaluation/dataQuality.ts)
- ⏳ OpenAlex API 통합 (계획)
- ⏳ ClinicalTrials.gov API 통합 (계획)
- ❌ 안전장치 구현 (공개 데이터 없음 - 보류)

### Phase 3 (v16.1 - 계획)
- [ ] OpenAlex 자동 데이터 수집
- [ ] ClinicalTrials.gov 자동 데이터 수집
- [ ] PubMed MeSH terms 기반 질환 특화 분석
- [ ] UI 업데이트 (3축 점수 시각화)

### Phase 4 (v17.0 - 계획)
- [ ] 배지 시스템 구현
- [ ] 자동 데이터 업데이트 파이프라인
- [ ] 이의제기 프로세스
- [ ] 비교 기능 (최대 3명)

### Phase 5 (v18.0 - 장기 계획)
- [ ] 다국어 지원
- [ ] 지역별 필터링
- [ ] API 공개 (개발자 문서)
- [ ] 모바일 앱

---

**문서 버전**: 1.1 (v16.0 반영)  
**최종 수정**: 2026-02-14  
**작성자**: MedRep Intelligence Team  
**라이선스**: CC BY-NC-SA 4.0 (비상업적 이용, 출처 표시)

## 부록: v16.0 현실적 데이터 제약사항

### 사용 가능한 데이터 소스
✅ **OpenAlex**: 논문/인용/H-index, 저자 위치, 연구 분야  
✅ **ClinicalTrials.gov**: PI 정보, 시험 상태  
✅ **PubMed**: MeSH terms 기반 질환 특화 논문

### 사용 불가능한 데이터 (보류)
❌ **의료분쟁 이력**: 개인정보 보호법  
❌ **학회 임원 정보**: 공개 API 없음 (수동 수집 필요)  
❌ **가이드라인 저자**: 공개 API 없음 (수동 수집 필요)  
❌ **개인 진료량**: HIRA 비공개  
❌ **환자 리뷰**: 조작 가능성

### v16.0 구현 완료 항목
✅ 타입 정의 (src/evaluation/types.ts)  
✅ 3축 평가 계산 (src/evaluation/calculator.ts)  
✅ 데이터 품질 평가 (src/evaluation/dataQuality.ts)  
✅ 모듈 진입점 (src/evaluation/index.ts)

### 향후 통합 예정
⏳ OpenAlex API 자동 수집  
⏳ ClinicalTrials.gov API 자동 수집  
⏳ PubMed MeSH terms 분석  
⏳ UI 3축 점수 시각화
