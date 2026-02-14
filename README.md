# 연구기반 KOL 검색 v12.0

## 서비스 개요
질환명을 입력하면 **실시간 논문·인용·임상시험 데이터**를 기반으로 진짜 연구하는 명의(KOL)를 객관적으로 평가하여 제시하는 서비스.

## 핵심 특징
**"티비에 나오는 유명인이 아닌, 실제로 연구하고 공부하는 명의"**

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
- **Last Updated**: 2026-02-14

## 변경 이력
### v12.0 (2026-02-14)
- **실시간 연구 데이터 기반 평가 시스템 구축**
- OpenAlex API 연동 (논문, 인용, H-index)
- PubMed API 연동 (최근 5년 활동)
- ClinicalTrials.gov API 연동 (임상시험)
- 다차원 객관적 스코어링 알고리즘 (100점 만점)
- 5단계 등급 체계 (S/A/B/C/D)
- 실시간 데이터 시각화 UI

### v11.0 (2026-02-14)
- 약품명 검색 → 질환명 검색으로 피벗팅

### v10.1 (2026-02-12)
- DB 기반 KOL, AI 전략 분석
