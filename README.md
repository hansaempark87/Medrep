# MedRep Intelligence

## AI-Powered Pharma Sales Intelligence Platform

> 12년차 제약회사 영업 팀장의 실전 노하우를 AI로 구현한 KOL 인텔리전스 B2B SaaS 플랫폼

---

## URLs
- **Production**: https://medrep-intelligence.pages.dev
- **API Health Check**: https://medrep-intelligence.pages.dev/api/health
- **KOL 분석 API**: `POST https://medrep-intelligence.pages.dev/api/kol/analyze`
- **GitHub**: https://github.com/hansaempark87/Medrep

## Project Overview
- **Name**: MedRep Intelligence (MedRepAI)
- **Goal**: 제약업계 영업 팀의 KOL(핵심 오피니언 리더) 관리, 병원 약사위원회(P&T) 전략 수립, 팀 성과 관리를 AI 기반으로 지원하는 올인원 플랫폼
- **Target Users**: 제약회사 영업 팀장, MR(Medical Representative), MSL(Medical Science Liaison)
- **Tech Stack**: Hono + React (CDN) + Tailwind CSS (CDN) + Chart.js + OpenAI GPT + Cloudflare Pages

## Key Features (구현 완료)

### 1. Dashboard (대시보드)
- **상단 통계 카드**: 이번 달 KOL 47명 (전월 대비 23% 증가), 팀 활동 현황 12/15명, 긴급 일정 (D-3)
- **월별 성과 차트**: 2024년 팀 성과 추이 막대그래프 (1월 15건 → 12월 47건)
- **다가오는 일정**: P&T 위원회, 학술대회 등 D-day 관리 (4건)
- **최근 분석 KOL 카드**: 클릭 시 KOL 인텔리전스로 자동 이동 + AI 분석 시작
- **팀원 현황**: 6명 팀원별 활동 상태 및 목표 달성률

### 2. KOL Intelligence (KOL 인텔리전스) - **핵심 기능 (OpenAI GPT 실시간 연동)**
- **실시간 AI 분석**: 아무 교수/병원/진료과를 검색하면 OpenAI GPT가 실시간 분석
- **빠른 검색 3개**: "서울대 김내분", "세브란스 박순환", "아산병원 이종양"
- **프로그레시브 로딩 UX**: PubMed 수집 → 학회 분석 → 전략 생성 단계별 표시
- **분석 결과 4개 탭**:
  - **연구 동향**: 최신 연구 키워드, 학회 발표, 논문 트렌드
  - **접근 전략**: 최적 방문 시간, 접근법, 주의사항, 관계 구축 포인트
  - **경쟁사 현황**: 경쟁 제품 포지셔닝 및 위협도 (high/medium/low)
  - **최근 활동 타임라인**: 학회발표, 논문, 임상시험, 자문위원 활동
- **KOL 프로필**: 논문 수, H-Index, 임상시험 수, 영향력/접근성/처방 영향력 지수 (100점 만점)
- **시스템 프롬프트**: 12년차 제약영업 팀장의 실전 노하우 + 한국 의료환경 특화

### 3. P&T Strategy Planner (P&T 전략 플래너)
- **병원별 약사위원회 관리**: 삼성서울병원 (D-3), 서울아산병원 (D-24)
- **위원회 구성원 분석**: 각 위원의 영향력, 입장(우호/중립/부정), 공략 노트
- **D-Day 카운터**: 회의까지 남은 기간 시각화 (긴급 빨강 표시)
- **준비 서류 체크리스트**: 완료/진행중/검토필요 상태 관리
- **AI 추천 액션 플랜**: 위원별 맞춤 전략 4개

### 4. 구독 플랜 (가격 페이지)
- **Starter**: 월 49,000원 (소규모 팀용, 월 50회 분석)
- **Professional**: 월 149,000원 (영업 팀장용, 월 500회 분석, PubMed 연동)
- **Enterprise**: 별도 문의 (대형 제약사, 무제한, 온프레미스)
- **해커톤 프로젝트 정보**: 기술 스택, 시상 내역, 핵심 차별점

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | 서비스 상태 확인 |
| POST | `/api/kol/analyze` | KOL AI 분석 (OpenAI GPT) |
| GET | `/api/kol/history` | 분석 이력 조회 (D1 연동 시) |
| POST | `/api/kol/history` | 분석 이력 저장 (D1 연동 시) |

## 시연 시나리오 (Demo Flow)
1. **대시보드** → 팀 성과 현황 확인 (통계 카드 + 차트)
2. **최근 KOL 카드 클릭** → KOL 인텔리전스 자동 이동 + AI 분석 시작
3. **빠른 검색 버튼** 클릭 → 실시간 AI 분석 로딩 UX → 결과 표시
4. **4개 탭 전환** → 연구 동향 / 접근 전략 / 경쟁사 현황 / 최근 활동
5. **자유 검색** → 임의의 교수명/병원 입력 → AI가 실시간 분석
6. **P&T 전략** → 삼성서울병원 D-3 긴급 준비 확인
7. **구독 플랜** → 수익 모델 + 해커톤 정보

## Data Architecture
- **프론트엔드**: React (CDN) + Tailwind CSS (CDN) + Chart.js - 단일 HTML 파일
- **백엔드**: Hono Framework (TypeScript) - Cloudflare Workers
- **AI**: OpenAI GPT API (gpt-5-mini) - 실시간 KOL 분석
- **시크릿 관리**: Cloudflare Pages Secrets (OPENAI_API_KEY, OPENAI_BASE_URL)
- **데이터**: Mock Data (대시보드/P&T) + AI 생성 (KOL 분석)

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: ✅ Active
- **Production URL**: https://medrep-intelligence.pages.dev
- **Tech Stack**: Hono + React (CDN) + Tailwind CSS (CDN) + Chart.js + OpenAI GPT
- **Build Tool**: Vite
- **Secrets**: OPENAI_API_KEY, OPENAI_BASE_URL (encrypted)
- **Last Updated**: 2026-02-11

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Local development (with D1)
npm run dev:sandbox

# Deploy to Cloudflare Pages
npm run deploy

# Set production secrets
npx wrangler pages secret put OPENAI_API_KEY --project-name medrep-intelligence
npx wrangler pages secret put OPENAI_BASE_URL --project-name medrep-intelligence
```

## Project Structure
```
webapp/
├── src/
│   └── index.tsx          # Hono API endpoints (KOL 분석 API + OpenAI 연동)
├── public/
│   └── index.html         # Single-page React application (전체 UI)
├── migrations/
│   └── 0001_initial.sql   # D1 database schema
├── ecosystem.config.cjs   # PM2 configuration
├── vite.config.ts         # Vite + Hono build config
├── wrangler.jsonc         # Cloudflare configuration
└── package.json
```

## Future Roadmap
- [x] ~~OpenAI API 연동: 실시간 KOL 분석~~ ✅ 완료
- [x] ~~모바일 반응형 최적화~~ ✅ 완료
- [x] ~~구독/가격 페이지~~ ✅ 완료
- [ ] Cloudflare D1 프로덕션 바인딩 (분석 이력 영구 저장)
- [ ] 실시간 PubMed/ClinicalTrials.gov 데이터 연동
- [ ] 사용자 인증 시스템 (팀원별 로그인)
- [ ] 팀원별 방문 일정 관리 및 캘린더 연동
- [ ] PDF 리포트 자동 생성 및 공유
- [ ] 결제/구독 시스템 (Stripe 연동)

---

*Built with Hono + React + Tailwind CSS + OpenAI GPT on Cloudflare Pages*
*OpenAI Hackathon 2024 참가 프로젝트*
