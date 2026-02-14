# 명의찾기 v13.0

## 서비스 개요
**"TV에 나오는 유명인이 아닌, 실제로 연구하고 논문을 발표하는 진짜 전문의를 찾아드립니다"**

질환명을 입력하면 **실시간 논문·인용·임상시험 데이터**를 기반으로 객관적으로 평가된 전문의 목록을 제공하는 일반인 대상 의료 서비스입니다.

## 핵심 특징

### 실시간 데이터 소스
1. **OpenAlex** - 논문 수, 인용 횟수, H-index 계산
2. **PubMed** - 최근 5년 연구 활동, 질환별 논문
3. **ClinicalTrials.gov** - 임상시험 참여 이력

### 객관적 점수 산정 (100점 만점)
- **논문 수** (30점): 총 발표 논문 수 (로그 스케일)
- **인용 수** (25점): 총 인용 횟수 (로그 스케일)
- **H-index** (20점): 학술 영향력 지표
- **최근 활동** (15점): 최근 5년 연구 논문 수
- **임상시험** (10점): 임상시험 참여 건수

### 등급 체계
- **S등급** (85점 이상): 세계적 연구 리더
- **A등급** (70-84점): 국내 최고 수준
- **B등급** (55-69점): 우수 연구자
- **C등급** (40-54점): 활발한 연구자
- **D등급** (40점 미만): 초기 연구자

## API 엔드포인트
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | 서비스 상태 확인 |
| POST | `/api/disease/analyze` | 질환 → 실시간 KOL 스코어링 (body: `{"disease":"질환명"}`) |
| POST | `/api/kol/detail` | KOL 상세 프로파일 |

## 지원 질환 목록
### 심혈관/대사질환
- 고콜레스테롤혈증, 이상지질혈증, 심부전

### 내분비/대사질환
- 제2형당뇨병, 당뇨병, 만성신장질환

### 종양
- 비소세포폐암, 폐암, 위암, 대장암

### 비뇨기 질환
- 전립선암, 과민성방광, 방광암

### 골대사 질환
- 골다공증

### 자가면역 질환
- 류마티스관절염

## 기술 스택
- **Backend**: Hono (Cloudflare Workers)
- **External APIs**: 
  - OpenAlex API (논문 데이터)
  - PubMed E-utilities (연구 데이터)
  - ClinicalTrials.gov API (임상시험)
- **AI**: GPT-5-mini (전략 분석)
- **Frontend**: Tailwind CSS, Font Awesome
- **Deployment**: Cloudflare Pages

## URLs
- **프로덕션**: https://medrep-intelligence.pages.dev
- **GitHub**: https://github.com/hansaempark87/Medrep

## 환경 변수 (.dev.vars)
```bash
# OpenAI API
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=https://api.genspark.ai/v1

# External Research APIs
OPENALEX_API_KEY=fYbUihvp4sW9jWZqoe8eLo
PUBMED_API_KEY=c99e77f35b8b407dcab9b43564ce1a924408

# HIRA (건강보험심사평가원)
HIRA_API_KEY_DECODED=rlfzIHbybI5v+ypYADNAxtC46zk1mRAKiF6YPhUceBOockNojmmwChYJz9aLz2lw8IfDuAijDCkjdt9PwK+k7g==
```

## 사용법
1. 질환명을 검색창에 입력 (예: 이상지질혈증)
2. 실시간으로 OpenAlex, PubMed, ClinicalTrials 데이터 수집
3. 객관적 점수 기반 KOL 순위 확인
4. 상세 연구 데이터 및 전략 분석 확인

## 배포 상태
- **Platform**: Cloudflare Pages
- **Status**: ✅ Active
- **Production URL**: https://medrep-intelligence.pages.dev
- **Sandbox URL**: https://3000-ii8z59j4vky73afgyytd4-8f57ffe2.sandbox.novita.ai
- **Last Updated**: 2026-02-14

## 알려진 이슈
### Cloudflare Pages에서 OpenAlex API Rate Limit
- **문제**: Cloudflare Workers 환경에서 OpenAlex API가 HTTP 429 에러 반환 (Insufficient credits)
- **원인**: Cloudflare Workers가 요청마다 다른 IP를 사용하여 OpenAlex의 polite pool (mailto) 인증이 불안정
- **로컬 환경**: 정상 작동 ✅ (샌드박스 URL에서 확인 가능)
  - 김효수: 1,153편, 7,347회 인용, H-index 43 → 85점 (S등급)
  - 최동훈: 4,255편, 35,466회 인용, H-index 50 → 85점 (S등급)
  - 박성하: 10,309편, 63,313회 인용, H-index 50 → 85점 (S등급)
- **해결 방안**:
  1. **KOL 데이터 캐싱** (Cloudflare KV Storage 활용)
  2. **OpenAlex 유료 플랜** 가입 (무제한 API 호출)
  3. **로컬 샌드박스 사용** (현재 정상 작동)

## 변경 이력
### v13.0 (2026-02-14)
- **일반인 대상 UI/UX 전면 개편**
- 현대적이고 깔끔한 화이트 카드 기반 디자인
- 퍼플 그라데이션 테마로 신뢰감 있는 브랜딩
- 친절하고 이해하기 쉬운 언어로 전체 문구 개선
- 전략 탭 제거 (B2C 서비스로 피벗팅)
- 전문 분야 탭 강화 (학회 활동, 전문 분야, 참고 자료)
- 진료 일정 테이블 개선 (더 직관적인 시각화)
- 연구 실적 통계 카드 (아이콘 + 숫자)
- 모바일 반응형 개선
- 등급 뱃지 디자인 개선 (Gold/Silver/Bronze 스타일)

### v12.0 (2026-02-14)
- **실시간 연구 데이터 기반 평가 시스템 구축**
- OpenAlex API 연동 (논문, 인용, H-index)
- PubMed API 연동 (최근 5년 활동)
- ClinicalTrials.gov API 연동 (임상시험)
- 다차원 객관적 스코어링 알고리즘 (100점 만점)
- 5단계 등급 체계 (S/A/B/C/D)
- 실시간 데이터 시각화 UI
- 순차적 API 호출 + 재시도 로직으로 rate limit 최소화

### v11.0 (2026-02-14)
- 약품명 검색 → 질환명 검색으로 피벗팅

### v10.1 (2026-02-12)
- DB 기반 KOL, AI 전략 분석
