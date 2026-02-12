# MedRep KOL Targeting v6.0

## 서비스 개요
의약품명을 입력하면 AI가 해당 약물의 치료 영역에서 핵심 타겟 KOL(Key Opinion Leader)을 분석하여 우선순위로 제시하는 서비스.

## 핵심 기능
1. **약품 검색 → KOL 타겟 랭킹**: 약품명 입력 시 6~8명의 KOL을 relevanceScore 기준 내림차순 제시
2. **KOL 상세 프로파일**: 클릭하면 프로필, 진료일정, 치료성향, 연구/학술, 미디어, 접근전략 확인
3. **실전 접근 전략**: Do/Don't 리스트, 대화 포인트, 방문 전 체크리스트 제공

## 3단계 UI 흐름
1. **Stage 1** - 약품 검색 (홈 화면)
2. **Stage 2** - KOL 랭킹 리스트 (약물 정보 요약 + KOL 카드)
3. **Stage 3** - KOL 상세 (탭: 요약/진료일정/치료성향/연구학술/미디어/접근전략)

## API 엔드포인트
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | 서비스 상태 확인 |
| POST | `/api/drug/analyze` | 약품 → KOL 타겟 리스트 (body: `{"drug":"약품명"}`) |
| POST | `/api/kol/detail` | KOL 상세 프로파일 (body: `{"name","hospital","department","drug","drugInfo"}`) |

## 기술 스택
- **Backend**: Hono (Cloudflare Workers)
- **AI**: GPT-5-mini via GenSpark Proxy
- **Frontend**: Tailwind CSS, Font Awesome (inline HTML)
- **Deployment**: Cloudflare Pages

## URLs
- **프로덕션**: https://medrep-intelligence.pages.dev
- **GitHub**: https://github.com/hansaempark87/Medrep

## 데이터 아키텍처
- DB 사용하지 않음 (순수 AI 기반)
- AI가 학습 데이터를 기반으로 KOL 정보 생성
- 불확실한 정보는 "추정" 표기

## 빠른 검색 예시
피타바스타틴, 엠파글리플로진, 리나글립틴, 엔잘루타마이드, 미라베그론, 펨브롤리주맙

## 사용법
1. 약품명을 검색창에 입력하거나 빠른 검색 칩 클릭
2. AI가 관련 KOL 6~8명을 랭킹으로 제시
3. KOL 카드를 클릭하면 상세 프로필과 접근 전략 확인

## 배포 상태
- **Platform**: Cloudflare Pages
- **Status**: ✅ Active
- **Last Updated**: 2026-02-12
