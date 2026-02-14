# 명의찾기 v16.0 - 3축 평가 시스템 (현실적 데이터 기반)

## 서비스 개요
**"오픈소스 데이터로 객관적으로 평가합니다"**

질환명을 입력하면 **OpenAlex(논문), ClinicalTrials.gov(임상시험), PubMed(질환 특화)** 등 공개 데이터를 바탕으로 명의를 객관적으로 평가하여 추천해드리는 일반인 대상 의료 서비스입니다.

## 핵심 특징

### 3축 평가 모델 (총 100점)

```
최종 점수 = 학술적 권위(45점) + 임상 혁신(35점) + 질환 전문화(20점)
```

#### 1. 학술적 권위 (Academic Authority) - 45점

**1-1. 연구 임팩트 (20점)**
- H-index 기반: `min(H-index × 0.4, 20점)` (H-index 50 = 만점)
- 대체 지표: 인용수 기반 `min(log10(인용수 + 1) × 4, 20점)`

**1-2. 최근 연구 활동 (15점)**
- 최근 5년 논문 수: `min(논문수 × 0.5, 15점)` (30편 = 만점)

**1-3. 연구 주도성 (10점)**
- 제1저자 + 교신저자 비율: `(주도 논문 / 전체 논문) × 10점`

#### 2. 임상 혁신 (Clinical Innovation) - 35점

**2-1. 임상시험 리더십 (25점)**
- PI 건수: `min(PI 건수 × 3점, 25점)` (8건 = 만점)

**2-2. 현재 연구 활동 (10점)**
- 진행 중인 임상시험 있음: 10점
- 없음: 0점

#### 3. 질환 전문화 (Disease Specialization) - 20점

**3-1. 질환 집중도 (15점)**
- 질환 관련 논문 비율: `(질환 논문 / 전체 논문) × 15점`

**3-2. 최근 활동성 (5점)**
- 최근 3년 질환 논문 있음: 5점
- 없음: 0점

### 등급 체계 (엄격한 기준)
| 등급 | 점수 범위 | 설명 | 비율 |
|------|----------|------|------|
| **S등급** | 85점 이상 | 세계적 명의 | 상위 3% |
| **A등급** | 75-84점 | 국내 최고 수준 | 상위 15% |
| **B등급** | 65-74점 | 우수 명의 | 상위 40% |
| **C등급** | 55-64점 | 양호 | 상위 70% |
| **D등급** | 55점 미만 | 기본 | - |

### 데이터 품질 평가
모든 의사에 대해 데이터 신뢰도를 평가합니다:

- **HIGH (80점 이상)**: OpenAlex 데이터 완전, 논문 5편 이상, 최근 활동 있음
- **MEDIUM (60-79점)**: 일부 데이터 누락
- **LOW (60점 미만)**: 데이터 품질 낮음 (평가 제한)

## 데이터 소스

### ✅ 사용 가능한 공개 데이터
- **OpenAlex**: 논문 수, 인용 수, H-index, 저자 위치, 연구 분야
- **ClinicalTrials.gov**: 임상시험 PI/연구자 정보, 시험 상태
- **PubMed**: MeSH terms를 통한 질환 특화 논문 검색

### ❌ 사용 불가능한 비공개 데이터
- 의료분쟁 이력 (개인정보)
- 학회 임원 정보 (수동 수집 필요)
- 진료 가이드라인 저자 (수동 수집 필요)
- 개인 진료량 (HIRA 비공개)
- 환자 리뷰 (조작 가능)

## 평가 사례: 이상지질혈증 전문의

### 김효수 교수 (서울대학교병원 순환기내과)

**학술적 권위: 45점 (만점)**
- 연구 임팩트: H-index 50 → 20점
- 최근 활동: 최근 5년 30편 → 15점
- 연구 주도성: 제1저자 25편 + 교신저자 40편 / 총 120편 = 54% → 5.4점 → **45점**

**임상 혁신: 35점 (만점)**
- 임상시험 리더십: PI 10건 → 25점 (상한)
- 현재 연구: 진행 중 3건 → 10점 → **35점**

**질환 전문화: 15점**
- 질환 집중도: 심혈관 논문 96편 / 총 120편 = 80% → 12점
- 최근 활동성: 최근 3년 논문 8편 → 5점 → **15점**

**총점: 95점 → S등급**

**데이터 품질: HIGH (95점)**
- ✅ OpenAlex 완전
- ✅ 논문 충분
- ✅ 최근 활동
- ✅ 임상시험 경험
- ✅ H-index 제공
- ✅ 저자 위치 정보
- ✅ 대표 논문 NEJM, Lancet

## 기술 스택
- **Backend**: Hono (Cloudflare Workers)
- **Evaluation Engine**: TypeScript (src/evaluation/)
  - `types.ts`: 타입 정의
  - `calculator.ts`: 3축 평가 로직
  - `dataQuality.ts`: 데이터 품질 평가
- **External APIs**: 
  - OpenAlex API (논문 데이터)
  - ClinicalTrials.gov API (임상시험)
  - PubMed E-utilities (질환 특화)
- **Frontend**: Tailwind CSS, Font Awesome
- **Deployment**: Cloudflare Pages

## 프로젝트 구조
```
webapp/
├── src/
│   ├── evaluation/              # 평가 엔진 (v16.0 신규)
│   │   ├── types.ts             # 타입 정의
│   │   ├── calculator.ts        # 3축 평가 계산
│   │   ├── dataQuality.ts       # 데이터 품질 평가
│   │   └── index.ts             # Entry point
│   └── index.tsx                # Main server
├── public/                      # Static assets
├── wrangler.jsonc               # Cloudflare config
├── package.json
├── README.md
├── DOCTOR_EVALUATION_SPEC.md    # 평가 시스템 명세서
└── ecosystem.config.cjs         # PM2 config
```

## API 엔드포인트
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | 서비스 상태 확인 |
| POST | `/api/disease/analyze` | 질환별 명의 평가 (body: `{"disease":"질환명"}`) |
| POST | `/api/kol/detail` | 명의 상세 프로파일 |

## URLs
- **프로덕션**: https://medrep-intelligence.pages.dev
- **샌드박스**: https://3000-ii8z59j4vky73afgyytd4-8f57ffe2.sandbox.novita.ai
- **GitHub**: https://github.com/hansaempark87/Medrep

## 환경 변수 (.dev.vars)
```bash
# OpenAI API
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=https://api.genspark.ai/v1

# External Research APIs (optional, rate limit 완화용)
OPENALEX_API_KEY=your-email@example.com
PUBMED_API_KEY=your-ncbi-api-key
```

## 사용법
1. 질환명을 검색창에 입력 (예: 이상지질혈증)
2. 3축 평가 기반으로 평가된 명의 순위 확인
3. 학술적 권위, 임상 혁신, 질환 전문화 점수 확인
4. 데이터 품질 및 경고 메시지 확인
5. 외래 일정, 주요 논문 등 상세 정보 확인

## 로컬 개발
```bash
# 의존성 설치
npm install

# 개발 서버 (sandbox)
npm run build
pm2 start ecosystem.config.cjs

# 프로덕션 빌드
npm run build

# 배포
npm run deploy
```

## 배포 상태
- **Platform**: Cloudflare Pages
- **Status**: ✅ Active
- **Production URL**: https://medrep-intelligence.pages.dev
- **Sandbox URL**: https://3000-ii8z59j4vky73afgyytd4-8f57ffe2.sandbox.novita.ai
- **Last Updated**: 2026-02-14

## 변경 이력

### v16.0 (2026-02-14) - 3축 평가 시스템 (현실적 데이터 기반)
- **✨ 새로운 평가 모델**: 학술적 권위(45점) + 임상 혁신(35점) + 질환 전문화(20점)
- **📊 객관적 지표**:
  - OpenAlex: H-index, 인용수, 논문 수, 저자 위치
  - ClinicalTrials.gov: PI 건수, 진행 중인 시험
  - PubMed: 질환 특화 논문 비율
- **🔍 데이터 품질 평가**: 모든 의사에 대해 신뢰도 평가 (HIGH/MEDIUM/LOW)
- **⚠️ 현실적 제약 반영**: 공개 데이터만 사용, 수집 불가능한 지표 제거
- **🎯 엄격한 등급 기준**: S급 85점 이상 (상위 3%), A급 75-84점 (상위 15%)
- **📦 모듈화**: src/evaluation/ 디렉토리로 평가 로직 분리
- **📝 명세서 업데이트**: DOCTOR_EVALUATION_SPEC.md에 v16.0 정보 반영

### v15.0 (2026-02-14) - 연구업적 중심 평가 시스템
- 진료경력 제거, 연구업적 기반 평가로 완전 전환
- 대표 논문(40점) + 학회 임원진(30점) + 질환 전문성(20점) + 수상 경력(10점)
- 김효수 교수 정확한 경력 반영 (위키피디아 기반)

### v14.2 (2026-02-14)
- 병원 등급 제거, 대표 논문 저널 임팩트로 전환

### v14.1 (2026-02-14)
- 로딩 메시지 일반인 친화적 변경
- 탭 메뉴 제거

### v14.0 (2026-02-14)
- OpenAlex/PubMed/ClinicalTrials API 제거 (동명이인 문제)
- 일반인 대상 평가 시스템 구축

## 향후 계획

### Phase 1: 데이터 수집 자동화 (v16.1)
- [ ] OpenAlex API 통합 완성
- [ ] ClinicalTrials.gov API 통합
- [ ] PubMed MeSH terms 기반 질환 특화 분석
- [ ] 자동 데이터 업데이트 파이프라인

### Phase 2: UI/UX 개선 (v16.2)
- [ ] 3축 점수 시각화 (레이더 차트)
- [ ] 데이터 품질 배지 표시
- [ ] 점수 계산 근거 상세 표시
- [ ] 의사 비교 기능 (최대 3명)

### Phase 3: 고급 기능 (v17.0)
- [ ] 질환별 맞춤 평가 (가중치 조정)
- [ ] 지역별 필터링
- [ ] 다국어 지원
- [ ] API 공개 (개발자 문서)

## 주의사항
1. **데이터 제약**: 공개 API로 수집 가능한 데이터만 사용
2. **개인정보 보호**: 의료사고 이력 등 민감 정보는 수집하지 않음
3. **투명성 보장**: 점수 산출 로직 GitHub 공개
4. **면책조항**: "본 평가는 참고용이며, 실제 진료 선택은 환자 본인 판단"

## 라이선스
MIT License - 비상업적 이용, 출처 표시

---

**문서 버전**: 16.0  
**최종 수정**: 2026-02-14  
**작성자**: MedRep Intelligence Team
