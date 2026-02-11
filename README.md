# MedRep Intelligence

## AI-Powered Pharma Sales Intelligence Platform

> 12년차 제약회사 영업 팀장의 실전 노하우를 AI로 구현한 KOL 인텔리전스 B2B SaaS 플랫폼

---

## URLs
- **Production**: https://medrep-intelligence.pages.dev
- **API Health Check**: https://medrep-intelligence.pages.dev/api/health

## Project Overview
- **Name**: MedRep Intelligence (MedRepAI)
- **Goal**: 제약업계 영업 팀의 KOL(핵심 오피니언 리더) 관리, 병원 약사위원회(P&T) 전략 수립, 팀 성과 관리를 AI 기반으로 지원하는 올인원 플랫폼
- **Target Users**: 제약회사 영업 팀장, MR(Medical Representative), MSL(Medical Science Liaison)
- **Tech Stack**: Hono + React (CDN) + Tailwind CSS (CDN) + Chart.js + Cloudflare Pages

## Key Features

### 1. Dashboard (대시보드)
- **상단 통계 카드**: 이번 달 KOL 분석 건수, 팀 활동 현황, 긴급 일정 알림
- **월별 성과 차트**: 2024년 팀 성과 추이 막대그래프 (Chart.js)
- **다가오는 일정**: P&T 위원회, 학술대회 등 D-day 관리
- **최근 분석 KOL**: 최근 분석한 KOL 카드 및 태그
- **팀원 현황**: 팀원별 활동 상태 및 목표 달성률

### 2. KOL Intelligence (KOL 인텔리전스) - 핵심 기능
- **AI 기반 KOL 검색/분석**: 교수명+소속으로 검색
- **빠른 검색**: 서울대 김내분, 세브란스 박순환, 아산병원 이종양
- **분석 결과 4개 탭**:
  - **연구 동향**: 최신 연구 키워드, 학회 발표, 논문 트렌드
  - **접근 전략**: 최적 방문 시간, 접근법, 주의사항, 관계 구축 포인트
  - **경쟁사 현황**: 경쟁 제품 포지셔닝 및 위협도 분석
  - **최근 활동 타임라인**: 학회발표, 논문, 임상시험, 자문위원 활동 등
- **KOL 프로필**: 논문 수, H-Index, 임상시험 수, 영향력/접근성/처방 영향력 지수

### 3. P&T Strategy Planner (P&T 전략 플래너)
- **병원별 약사위원회 관리**: 삼성서울병원, 서울아산병원 등
- **위원회 구성원 분석**: 각 위원의 영향력, 입장(우호/중립/부정), 공략 노트
- **D-Day 카운터**: 회의까지 남은 기간 시각화
- **준비 서류 체크리스트**: 진행 상태 관리
- **AI 추천 액션 플랜**: 위원별 맞춤 전략

## Mock Data (실전 데이터)
- **KOL 3명**: 내분비내과(김내분), 순환기내과(박순환), 종양내과(이종양)
- **각 KOL별**: 연구 동향 3개, 접근 전략 4개, 경쟁사 3개, 최근 활동 4개
- **병원 P&T**: 삼성서울병원(D-3), 서울아산병원(D-24)
- **팀원**: 6명 (수도권 1~3팀, 경인지역, 충청지역, MSL)

## Data Architecture
- **현재**: 프론트엔드 내장 Mock Data (하드코딩)
- **향후 확장**: Cloudflare D1 (KOL 데이터베이스), KV (사용자 설정), R2 (분석 리포트)
- **AI 연동 계획**: OpenAI API를 통한 실시간 KOL 분석 및 전략 생성

## User Guide

### 대시보드
1. 로그인 후 자동으로 대시보드 화면 표시
2. 상단 카드에서 주요 지표 확인
3. 차트에서 월별 팀 성과 추이 확인
4. 하단에서 최근 분석 KOL 및 팀원 현황 확인

### KOL 인텔리전스
1. 좌측 메뉴에서 "KOL 인텔리전스" 클릭
2. 검색창에 교수 이름 입력 또는 빠른 검색 버튼 클릭
3. AI 분석 로딩 후 결과 확인
4. 탭을 전환하며 연구 동향, 접근 전략, 경쟁사 현황, 최근 활동 확인

### P&T 전략 플래너
1. 좌측 메뉴에서 "P&T 전략" 클릭
2. 상단에서 병원 선택
3. 위원회 구성원 분석, 준비 서류 상태, D-Day 카운터 확인
4. AI 추천 액션 플랜에 따라 준비 진행

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: Active
- **Tech Stack**: Hono + React (CDN) + Tailwind CSS (CDN) + Chart.js
- **Build Tool**: Vite
- **Last Updated**: 2026-02-11

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Local development
npm run dev:sandbox

# Deploy to Cloudflare Pages
npm run deploy
```

## Project Structure
```
webapp/
├── src/
│   └── index.tsx          # Hono API endpoints
├── public/
│   └── index.html         # Single-page React application
├── ecosystem.config.cjs   # PM2 configuration
├── vite.config.ts         # Vite + Hono build config
├── wrangler.jsonc         # Cloudflare configuration
└── package.json
```

## Future Roadmap
- [ ] OpenAI API 연동: 실시간 KOL 논문 분석 및 전략 자동 생성
- [ ] 사용자 인증 시스템 (팀원별 로그인)
- [ ] Cloudflare D1 데이터베이스 연동 (KOL 데이터 영구 저장)
- [ ] 실시간 PubMed/ClinicalTrials.gov 데이터 크롤링
- [ ] 팀원별 방문 일정 관리 및 캘린더 연동
- [ ] PDF 리포트 자동 생성 및 공유
- [ ] 모바일 반응형 최적화
- [ ] 결제/구독 시스템 (SaaS 수익 모델)

---

*Built with Hono + React + Tailwind CSS on Cloudflare Pages*
