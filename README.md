# MedRep Intelligence v4.0

## Project Overview
- **Name**: MedRep Intelligence
- **Goal**: 한국 제약/의료기기 영업팀을 위한 AI 기반 KOL 인텔리전스 플랫폼
- **핵심 컨셉**: DB 등록 데이터 우선 → AI 접근 전략 보강 | 미등록 KOL은 AI 추정(정확도 제한 표시)

## URLs
- **Production**: https://medrep-intelligence.pages.dev
- **Sandbox**: https://3000-ii8z59j4vky73afgyytd4-8f57ffe2.sandbox.novita.ai
- **GitHub**: https://github.com/hansaempark87/Medrep

## v4.0 주요 변경 사항

### 백엔드 재설계
- AI 프롬프트 전면 재작성: 경쟁사 정보 완전 제거, 순수 접근 전략에 집중
- 새로운 AI 전략 필드: `oneLiner`, `keyInsights`, `preparationChecklist` 추가
- `actionItems` 구조 개선: 방문 시점, 대화 주제, 준비 자료, 관계 유지 4가지 핵심 축
- Do/Don't 리스트: 영업 담당자가 즉시 참고할 수 있는 행동 가이드
- 모델: gpt-5-mini (GenSpark LLM Proxy)

### 프론트엔드 재설계
- KOL 프로필 카드: Tier A/B/C/D 직접 표시 (100점 스케일 제거)
- 탭 구조: 요약 → 치료 성향 → 연구·학술 → 미디어 → 접근 전략
- AI 전략 섹션: 한 마디 요약, 핵심 인사이트, 실행 가이드, 대화 포인트, Do/Don't, 방문 전 체크리스트
- DB vs AI 소스 구분 배지 개선

### 데이터 모델
- `influence` (1-100) → `kolTier` (A/B/C/D) 직접 표시
- `prescriptionPower` (1-100) → `prescriptionPattern` (High Adopter/Moderate/Conservative)
- 경쟁사 관련 필드 제거

## Data Architecture
- **Database**: Cloudflare D1 (SQLite)
- **Tables**: `kol_profiles` (KOL 프로필), `kol_analyses` (분석 이력)
- **Seed Data**: 정성진 교수 (분당서울대학교병원 비뇨의학과)

### KOL 프로필 필드
| 필드 | 설명 |
|------|------|
| name, hospital, department, position | 기본 정보 |
| specialty_tags | 전문 분야 (JSON array) |
| kol_tier | KOL 등급: A/B/C/D |
| persona | Champion/Advocate/Supporter/Neutral/Non-Adopter |
| prescription_pattern | High Adopter/Moderate/Conservative |
| clinic_schedule | 주간 진료 일정 (요일별 오전/오후) |
| treatment_philosophy | 치료 철학/성향 |
| treatment_preferences | 질환별 치료 선호도 (JSON array) |
| media_appearances | 방송/유튜브/인터뷰 (JSON array) |
| research_focus | 핵심 연구 관심사 |
| education, career, awards | 학력/경력/수상 |
| key_publications | 주요 논문 |
| society_roles | 학회 직책 |
| books_patents | 저서/가이드라인 |
| strategy_memo, visit_notes | 영업 전략 메모 |
| source_urls | 출처 URL |

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/health | 서비스 상태 확인 |
| GET | /api/kol/profiles | KOL 목록 조회 |
| GET | /api/kol/profiles/:id | KOL 상세 조회 |
| POST | /api/kol/profiles | 새 KOL 등록 |
| PUT | /api/kol/profiles/:id | KOL 수정 |
| DELETE | /api/kol/profiles/:id | KOL 삭제 |
| POST | /api/kol/analyze | KOL 분석 (DB 우선 → AI 보강) |
| GET | /api/kol/history | 분석 이력 조회 (최근 20건) |

## User Guide

### KOL 검색
1. **KOL 인텔리전스** 탭에서 교수명 검색
2. DB 등록 KOL → 녹색 배지 + 실데이터 기반 분석 + AI 접근 전략
3. 미등록 KOL → 주황 배지 + AI 추정 (정확도 제한)

### KOL 등록/관리
1. **KOL 데이터베이스** 탭에서 "새 KOL 등록" 클릭
2. 기본 정보(이름/병원/진료과) 필수 입력
3. Tier, Persona, 치료 철학, 연구 관심사 등 추가 정보 입력
4. 수정/삭제 가능

### 시드 데이터
- **정성진 교수** (분당서울대학교병원 비뇨의학과)
  - 출처: [의료진 소개페이지](https://www.snubh.org/medical/drIntroduce.do?DP_TP=O&DP_CD=UR&grp_val=Y&sDpCdDtl=UR&sDrSid=1000935&sDrStfNo=65424&sDpTp=O)
  - 출처: [YouTube 건강강좌 1](https://youtube.com/watch?v=FkjAHj2j5z4)
  - 출처: [YouTube 건강강좌 2](https://youtube.com/watch?v=Tn8_UjFhV10)

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: Active
- **Tech Stack**: Hono + TypeScript + Tailwind CSS + React (CDN) + D1
- **Last Updated**: 2026-02-11

## 향후 확장 방향
- [ ] KOL 프로필 상세 편집 UI (학력/경력/논문/미디어 개별 관리)
- [ ] CSV/Excel 일괄 업로드 기능
- [ ] KOL별 방문 이력 관리 및 타임라인
- [ ] PubMed API 연동으로 논문 자동 업데이트
- [ ] 병원 홈페이지 크롤링으로 진료일정 자동 업데이트
- [ ] 프로덕션 D1 데이터베이스 연동
