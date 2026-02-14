# 질환별 KOL Targeting v11.0

## 서비스 개요
질환명을 입력하면 AI가 해당 질환의 치료 영역에서 핵심 타겟 KOL(Key Opinion Leader)을 분석하여 우선순위로 제시하는 서비스.

## 핵심 기능
1. **질환 검색 → KOL 타겟 랭킹**: 질환명 입력 시 6~8명의 KOL을 relevanceScore 기준 내림차순 제시
2. **KOL 상세 프로파일**: 클릭하면 프로필, 진료일정, 치료성향, 연구/학술, 미디어, 접근전략 확인
3. **실전 접근 전략**: Do/Don't 리스트, 대화 포인트, 방문 전 체크리스트 제공

## 3단계 UI 흐름
1. **Stage 1** - 질환 검색 (홈 화면)
2. **Stage 2** - KOL 랭킹 리스트 (질환 정보 요약 + KOL 카드)
3. **Stage 3** - KOL 상세 (탭: 요약/진료일정/치료성향/연구학술/미디어/접근전략)

## API 엔드포인트
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | 서비스 상태 확인 |
| POST | `/api/disease/analyze` | 질환 → KOL 타겟 리스트 (body: `{"disease":"질환명"}`) |
| POST | `/api/kol/detail` | KOL 상세 프로파일 (body: `{"name","hospital","department","disease","diseaseInfo"}`) |

## 지원 질환 목록
### 심혈관/대사질환
- 고콜레스테롤혈증
- 이상지질혈증
- 심부전

### 내분비/대사질환
- 제2형당뇨병
- 당뇨병
- 만성신장질환

### 종양
- 비소세포폐암
- 폐암
- 위암
- 대장암

### 비뇨기 질환
- 전립선암
- 과민성방광
- 방광암

### 골대사 질환
- 골다공증

### 자가면역 질환
- 류마티스관절염

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
이상지질혈증, 제2형당뇨병, 비소세포폐암, 전립선암, 과민성방광, 골다공증

## 사용법
1. 질환명을 검색창에 입력하거나 빠른 검색 칩 클릭
2. AI가 관련 KOL 6~8명을 랭킹으로 제시
3. KOL 카드를 클릭하면 상세 프로필과 접근 전략 확인

## 배포 상태
- **Platform**: Cloudflare Pages
- **Status**: ✅ Active
- **Last Updated**: 2026-02-14

## 변경 이력
### v11.0 (2026-02-14)
- 약품명 검색 → 질환명 검색으로 피벗팅
- 질환별 KOL 매칭 시스템으로 전환
- UI/UX를 질환 중심으로 개선
