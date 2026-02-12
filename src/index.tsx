import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  OPENAI_API_KEY: string
  OPENAI_BASE_URL: string
}

const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors())

// ============================================================
// Health check
// ============================================================
app.get('/api/health', (c) =>
  c.json({ status: 'ok', service: 'MedRep KOL Targeting', version: '6.0.0' })
)

// ============================================================
// AI 프롬프트 1: 의약품 → KOL 타겟 리스트 (내림차순 랭킹)
// ============================================================
const DRUG_TO_KOL_PROMPT = `당신은 한국 제약 영업 현장에서 20년 이상 활동한 최고의 전략가이자, PubMed·학회·병원 공개정보에 정통한 KOL 인텔리전스 전문가입니다.

[핵심 임무]
사용자가 의약품명(성분명 또는 상품명)을 입력하면, 당신은 반드시:
1. 해당 약물의 약리학적 분류, 적응증, 작용기전, 관련 치료영역을 정확히 파악
2. 그 치료영역에서 활발히 활동하는 한국 내 KOL을 **반드시 6~8명** 선정하여 kols 배열에 포함
3. relevanceScore(100점 만점) 기준으로 내림차순 정렬

⚠️ 절대 빈 kols 배열을 반환하지 마세요. 반드시 6~8명의 KOL을 포함해야 합니다.
⚠️ 추가 정보가 필요하다는 안내 메시지를 넣지 마세요. 당신의 학습 데이터를 바탕으로 최선의 결과를 제시하세요.

[KOL 선정 기준]
당신의 학습 데이터에 포함된 한국 의료진 정보를 기반으로, 아래 기준에 해당하는 실존 교수/의사를 제시하세요:
• 해당 약물 적응증 관련 진료과의 주요 대학병원/상급종합병원 교수 (서울대, 연세대, 삼성서울, 서울아산, 고려대, 가톨릭대, 성균관대 등)
• 관련 학회 임원, 가이드라인 저자, 학술위원
• PubMed에서 해당 약물 성분명 또는 적응증 키워드로 논문을 발표한 한국인 저자
• YouTube, 방송, 학회 강연 등 미디어 활동이 확인되는 의사
• 해당 약물 또는 동일 계열 약물의 임상시험 참여 PI

당신이 알고 있는 정보를 최대한 활용하세요. 확실하지 않은 세부사항(정확한 논문 수, H-index 등)은 "추정"이라고 표기하면 됩니다.

[relevanceScore 산출]
- 처방 관련성(30%): 해당 약물을 직접 처방할 가능성
- 연구 관련성(25%): PubMed 논문, 임상시험 참여
- 학회 영향력(20%): 학회 직책, 가이드라인 저자
- 미디어 활동(15%): 유튜브, 방송, 공개 강연
- 교육 영향력(10%): 수련의/전공의 교육, 교과서 저술

[금지 사항]
- 경쟁사 제품명이나 경쟁사 관련 정보 언급 금지
- 불확실한 정보는 "추정" 표기

[응답 형식 - 반드시 아래 JSON만 응답, 다른 텍스트 불가]
{
  "drugInfo": {
    "inputName": "사용자 입력 약물명",
    "genericName": "성분명(INN)",
    "brandExamples": "대표 상품명 1~2개",
    "drugClass": "약물 분류",
    "indication": "주요 적응증",
    "mechanism": "작용기전 1~2문장",
    "relatedTherapyArea": "관련 치료영역",
    "keyBenefits": "이 약물의 차별적 장점 1~2문장"
  },
  "kols": [
    {
      "rank": 1,
      "relevanceScore": 95,
      "name": "실명",
      "hospital": "실제 소속 병원",
      "department": "진료과",
      "position": "직위",
      "specialtyTags": ["전문분야1", "전문분야2"],
      "whyTarget": "이 KOL을 타겟해야 하는 이유 2~3문장. 해당 약물과의 구체적 관련성 포함",
      "prescriptionLikelihood": "High/Medium/Low",
      "researchConnection": "해당 약물 관련 연구/논문 활동 구체적 기술",
      "societyRole": "관련 학회 직책",
      "mediaActivity": "유튜브/방송/학회 강연 활동 요약",
      "estimatedPublications": "관련 분야 논문 수 (추정 포함)",
      "kolTier": "A/B/C",
      "approachTip": "이 KOL에게 접근할 때 핵심 팁 1~2문장",
      "sourceHint": "정보 확인 가능 경로 (예: 병원 홈페이지, PubMed '키워드' 검색 등)"
    }
  ]
}`

// ============================================================
// AI 프롬프트 2: 개별 KOL 상세 프로파일링 + 접근 전략
// ============================================================
const KOL_DETAIL_PROMPT = `당신은 한국 제약 영업 최고 전략가이자 KOL 프로파일링 전문가입니다.
의료진 공개정보, PubMed 논문, YouTube 강연, 학회 활동 등을 종합 분석하여
실전에서 바로 사용 가능한 KOL 상세 프로필과 접근 전략을 제공합니다.

[정보 수집 기반 - 각 출처별로 구체적으로 기술]
1. 병원 홈페이지: 진료 분야, 학력, 경력, 주간 진료일정(요일별 오전/오후)
2. PubMed/학술DB: 대표 논문 제목, 연구 주제, H-Index, 임상시험 참여
3. YouTube/방송: 강연 제목, 핵심 발언, 치료에 대한 관점
4. 학회 공개정보: 직책, 가이드라인 참여, 학술활동

[핵심 원칙]
1. 확인된 공개정보 기반 작성. 불확실한 내용은 반드시 "추정" 표기
2. 경쟁사 제품명/정보 언급 절대 금지
3. 해당 약물에 대한 실전 접근 전략에 초점
4. 진료일정은 요일별 오전/오후로 구체적으로 작성 (확인 가능 시)
5. 치료 철학과 선호 치료전략을 구체적으로 파악하여 영업 접근 포인트와 연결

[응답 형식 - 반드시 아래 JSON만 응답]
{
  "profile": {
    "name": "이름",
    "hospital": "병원명",
    "department": "진료과",
    "position": "직위",
    "photoHint": "병원 홈페이지 프로필 사진 확인 경로",
    "specialtyTags": ["전문분야1", "전문분야2", "전문분야3"],
    "education": [
      {"period": "기간", "detail": "학력 정보"}
    ],
    "career": [
      {"period": "기간", "detail": "경력 정보"}
    ],
    "awards": ["수상 정보"],
    "clinicSchedule": {
      "monday": {"am": "오전 진료 여부/내용", "pm": "오후 진료/수술 여부"},
      "tuesday": {"am": "오전", "pm": "오후"},
      "wednesday": {"am": "오전", "pm": "오후"},
      "thursday": {"am": "오전", "pm": "오후"},
      "friday": {"am": "오전", "pm": "오후"},
      "note": "진료일정 관련 참고사항",
      "bestVisitTime": "방문 최적 시점과 이유"
    },
    "treatmentPhilosophy": "이 교수의 치료 철학/성향 3~4문장. 환자 접근법, 치료 우선순위 등",
    "treatmentPreferences": [
      {
        "condition": "질환/적응증명",
        "approach": "이 교수가 선호하는 치료 전략 상세 기술",
        "drugRelevance": "타겟 약물과의 관련성"
      }
    ],
    "researchFocus": "핵심 연구 관심사 3~4문장. 현재 진행중인 연구, 관심 분야",
    "keyPublications": [
      {"title": "논문 제목", "journal": "저널명", "year": "연도", "summary": "핵심 내용 1문장"}
    ],
    "booksAndPatents": ["저서/특허 정보"],
    "mediaAppearances": [
      {
        "type": "YouTube/방송/학회강연",
        "title": "제목",
        "keyStatements": ["핵심 발언1", "핵심 발언2"],
        "implication": "영업적 시사점"
      }
    ],
    "societyRoles": [
      {"society": "학회명", "role": "직책", "significance": "영업적 의미"}
    ]
  },
  "drugStrategy": {
    "relevanceSummary": "이 KOL과 해당 약물의 관련성 요약 3문장",
    "oneLiner": "이 KOL을 한 마디로 정의하는 문장 (영업 관점)",
    "keyInsights": [
      "영업 담당자가 반드시 알아야 할 핵심 인사이트 1",
      "핵심 인사이트 2",
      "핵심 인사이트 3"
    ],
    "approachStrategy": "핵심 접근 전략 3~4문장",
    "actionItems": [
      {"icon": "fa-calendar-check", "title": "최적 방문 시점", "detail": "구체적 설명"},
      {"icon": "fa-comments", "title": "대화 시작 주제", "detail": "구체적 설명"},
      {"icon": "fa-file-medical", "title": "준비할 자료", "detail": "구체적 설명"},
      {"icon": "fa-handshake", "title": "관계 구축 방법", "detail": "구체적 설명"}
    ],
    "talkingPoints": ["대화 포인트1", "대화 포인트2", "대화 포인트3"],
    "doList": ["실행 사항1", "실행 사항2", "실행 사항3"],
    "dontList": ["금지 사항1", "금지 사항2", "금지 사항3"],
    "preparationChecklist": ["방문 전 준비1", "방문 전 준비2", "방문 전 준비3"]
  },
  "dataSources": [
    {"type": "병원 홈페이지/PubMed/YouTube 등", "detail": "구체적 출처 설명", "url": "확인 가능 URL 또는 검색 경로"}
  ],
  "confidenceNote": "이 프로필의 신뢰도. 어떤 정보가 확인되었고, 어떤 것이 추정인지 명시"
}`

// ============================================================
// Utility: Safe JSON parser
// ============================================================
function safeParseJSON(content: string) {
  try {
    let s = content.trim()
    // Remove markdown code blocks
    if (s.includes('```')) {
      const m = s.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
      if (m) s = m[1].trim()
    }
    // Find first { if not starting with it
    if (!s.startsWith('{')) {
      const i = s.indexOf('{')
      if (i !== -1) s = s.substring(i)
    }
    // Remove control characters
    s = s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
    try {
      return JSON.parse(s)
    } catch {
      // Try to fix truncated JSON
      let r = s
      let openBrace = 0, openBracket = 0, inStr = false, escaped = false
      for (const ch of r) {
        if (escaped) { escaped = false; continue }
        if (ch === '\\') { escaped = true; continue }
        if (ch === '"') { inStr = !inStr; continue }
        if (inStr) continue
        if (ch === '{') openBrace++
        if (ch === '}') openBrace--
        if (ch === '[') openBracket++
        if (ch === ']') openBracket--
      }
      if (inStr) r += '"'
      while (openBracket > 0) { r += ']'; openBracket-- }
      while (openBrace > 0) { r += '}'; openBrace-- }
      return JSON.parse(r)
    }
  } catch {
    return null
  }
}

// ============================================================
// Utility: AI API call
// ============================================================
async function callAI(env: any, systemPrompt: string, userMessage: string, maxTokens = 5000) {
  const apiKey = env?.OPENAI_API_KEY || ''
  const baseURL = env?.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  if (!apiKey) return null

  const resp = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: maxTokens,
      temperature: 0.5,
      response_format: { type: 'json_object' }
    })
  })

  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(`AI API error ${resp.status}: ${errText}`)
  }

  const d: any = await resp.json()
  const content = d.choices?.[0]?.message?.content
  if (!content) throw new Error('No AI response content')
  return safeParseJSON(content)
}

// ============================================================
// POST /api/drug/analyze — 의약품 입력 → KOL 타겟 리스트 (내림차순)
// ============================================================
app.post('/api/drug/analyze', async (c) => {
  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }
  
  const { drug } = body
  if (!drug || typeof drug !== 'string' || drug.trim().length < 2) {
    return c.json({ error: '의약품명을 2글자 이상 입력해주세요.' }, 400)
  }

  try {
    const result = await callAI(
      c.env,
      DRUG_TO_KOL_PROMPT,
      `다음 의약품에 대해 한국 내 핵심 KOL 타겟 리스트를 내림차순(relevanceScore 기준)으로 생성해줘: "${drug.trim()}"`,
      6000
    )
    if (!result) return c.json({ error: 'AI API 키가 설정되지 않았습니다.' }, 500)

    // Ensure kols are sorted by relevanceScore desc
    if (result.kols && Array.isArray(result.kols)) {
      result.kols.sort((a: any, b: any) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      result.kols.forEach((k: any, i: number) => { k.rank = i + 1 })
    }

    return c.json({ success: true, data: result })
  } catch (err: any) {
    console.error('Drug analyze error:', err.message)
    return c.json({ error: `분석 실패: ${err.message}` }, 500)
  }
})

// ============================================================
// POST /api/kol/detail — KOL 상세 프로파일 + 접근 전략
// ============================================================
app.post('/api/kol/detail', async (c) => {
  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }
  
  const { name, hospital, department, drug, drugInfo } = body
  if (!name) return c.json({ error: 'KOL 이름이 필요합니다.' }, 400)

  // Build drug context
  let drugContext = ''
  if (drugInfo) {
    drugContext = `
타겟 약물 정보:
- 약물명: ${drugInfo.inputName || drug || ''}
- 성분명: ${drugInfo.genericName || ''}
- 분류: ${drugInfo.drugClass || ''}
- 적응증: ${drugInfo.indication || ''}
- 작용기전: ${drugInfo.mechanism || ''}
- 치료영역: ${drugInfo.relatedTherapyArea || ''}
- 차별적 장점: ${drugInfo.keyBenefits || ''}`
  } else if (drug) {
    drugContext = `\n타겟 약물: ${drug}`
  }

  try {
    const result = await callAI(
      c.env,
      KOL_DETAIL_PROMPT,
      `다음 KOL의 상세 프로필과 실전 접근 전략을 생성해줘:

KOL 정보:
- 이름: ${name}
- 소속: ${hospital || '확인 필요'}
- 진료과: ${department || '확인 필요'}
${drugContext}

참고: 병원 홈페이지, PubMed, YouTube 등 공개 정보를 기반으로 최대한 구체적이고 정확한 정보를 제공해줘.
진료일정은 요일별 오전/오후로, 치료 선호도는 질환별로 구체적으로 작성해줘.`,
      6000
    )
    if (!result) return c.json({ error: 'AI API 키가 설정되지 않았습니다.' }, 500)
    return c.json({ success: true, data: result })
  } catch (err: any) {
    console.error('KOL detail error:', err.message)
    return c.json({ error: `분석 실패: ${err.message}` }, 500)
  }
})

// ============================================================
// Frontend: Main HTML (single page app — 3-stage UI)
// ============================================================
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MedRep KOL Targeting</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800&display=swap');
  * { font-family: 'Noto Sans KR', sans-serif; }
  body { background: #0f172a; min-height: 100vh; }
  .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
  .glass-light { background: rgba(255,255,255,0.08); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.12); }
  .gradient-text { background: linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .gradient-border { border-image: linear-gradient(135deg, #3b82f6, #8b5cf6) 1; }
  .pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
  @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 20px rgba(59,130,246,0.3); } 50% { box-shadow: 0 0 40px rgba(59,130,246,0.6); } }
  .slide-up { animation: slideUp 0.5s ease-out; }
  @keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
  .fade-in { animation: fadeIn 0.4s ease-out; }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  .kol-card { transition: all 0.3s ease; }
  .kol-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(59,130,246,0.2); }
  .tier-A { background: linear-gradient(135deg, #f59e0b, #d97706); }
  .tier-B { background: linear-gradient(135deg, #3b82f6, #2563eb); }
  .tier-C { background: linear-gradient(135deg, #6b7280, #4b5563); }
  .score-ring { width:56px; height:56px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px; color:#fff; }
  .score-high { background: conic-gradient(#22c55e calc(var(--score)*1%), #1e293b 0); }
  .score-med { background: conic-gradient(#f59e0b calc(var(--score)*1%), #1e293b 0); }
  .score-low { background: conic-gradient(#ef4444 calc(var(--score)*1%), #1e293b 0); }
  .tab-btn { transition: all 0.2s; }
  .tab-btn.active { background: rgba(59,130,246,0.3); border-color: #3b82f6; color: #93c5fd; }
  .spinner { border:3px solid rgba(255,255,255,0.1); border-top:3px solid #60a5fa; border-radius:50%; width:40px; height:40px; animation:spin 0.8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .loading-text { animation: loadingDots 1.5s infinite; }
  @keyframes loadingDots { 0%{ content: '.'; } 33%{ content: '..'; } 66%{ content: '...'; } }
  ::-webkit-scrollbar { width:6px; } ::-webkit-scrollbar-track { background:rgba(255,255,255,0.02); } ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); border-radius:3px; }
  .quick-chip { transition: all 0.2s; cursor:pointer; }
  .quick-chip:hover { background: rgba(59,130,246,0.3); border-color: #3b82f6; }
</style>
</head>
<body class="text-gray-200">

<!-- HEADER -->
<header class="sticky top-0 z-50 glass border-b border-white/10">
  <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
    <div class="flex items-center gap-3 cursor-pointer" onclick="goHome()">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <i class="fas fa-crosshairs text-white text-lg"></i>
      </div>
      <div>
        <h1 class="text-lg font-bold text-white leading-tight">KOL Targeting</h1>
        <p class="text-[10px] text-gray-400 leading-tight">Drug → KOL Intelligence</p>
      </div>
    </div>
    <div id="headerBreadcrumb" class="hidden md:flex items-center gap-2 text-sm text-gray-400">
    </div>
  </div>
</header>

<!-- MAIN CONTENT -->
<main class="max-w-7xl mx-auto px-4 py-6">
  
  <!-- STAGE 1: Drug Search -->
  <div id="stage1" class="slide-up">
    <div class="text-center mb-10 mt-8">
      <h2 class="text-4xl font-extrabold gradient-text mb-3">의약품으로 KOL을 찾으세요</h2>
      <p class="text-gray-400 text-lg">약품명을 입력하면 AI가 핵심 타겟 KOL을 분석하여 우선순위로 제시합니다</p>
    </div>
    
    <!-- Search Box -->
    <div class="max-w-2xl mx-auto mb-8">
      <div class="glass rounded-2xl p-6">
        <div class="relative">
          <i class="fas fa-pills absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 text-lg"></i>
          <input id="drugInput" type="text" placeholder="의약품명을 입력하세요 (예: 피타바스타틴, 엠파글리플로진, 아비라테론...)" 
                 class="w-full pl-12 pr-32 py-4 bg-white/5 border border-white/20 rounded-xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                 onkeydown="if(event.key==='Enter')analyzeDrug()">
          <button onclick="analyzeDrug()" class="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-500 hover:to-purple-500 transition-all">
            <i class="fas fa-search mr-2"></i>분석
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Chips -->
    <div class="max-w-3xl mx-auto mb-12">
      <p class="text-center text-gray-500 text-sm mb-3">빠른 검색</p>
      <div class="flex flex-wrap justify-center gap-2">
        <span class="quick-chip px-4 py-2 glass-light rounded-full text-sm text-gray-300" onclick="quickSearch('피타바스타틴')"><i class="fas fa-heart-pulse mr-1 text-red-400"></i>피타바스타틴</span>
        <span class="quick-chip px-4 py-2 glass-light rounded-full text-sm text-gray-300" onclick="quickSearch('엠파글리플로진')"><i class="fas fa-droplet mr-1 text-blue-400"></i>엠파글리플로진</span>
        <span class="quick-chip px-4 py-2 glass-light rounded-full text-sm text-gray-300" onclick="quickSearch('리나글립틴')"><i class="fas fa-syringe mr-1 text-green-400"></i>리나글립틴</span>
        <span class="quick-chip px-4 py-2 glass-light rounded-full text-sm text-gray-300" onclick="quickSearch('엔잘루타마이드')"><i class="fas fa-shield-virus mr-1 text-purple-400"></i>엔잘루타마이드</span>
        <span class="quick-chip px-4 py-2 glass-light rounded-full text-sm text-gray-300" onclick="quickSearch('미라베그론')"><i class="fas fa-person mr-1 text-yellow-400"></i>미라베그론</span>
        <span class="quick-chip px-4 py-2 glass-light rounded-full text-sm text-gray-300" onclick="quickSearch('펨브롤리주맙')"><i class="fas fa-dna mr-1 text-pink-400"></i>펨브롤리주맙</span>
      </div>
    </div>

    <!-- How It Works -->
    <div class="max-w-4xl mx-auto">
      <div class="grid md:grid-cols-3 gap-6">
        <div class="glass rounded-xl p-6 text-center">
          <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
            <i class="fas fa-pills text-2xl text-blue-400"></i>
          </div>
          <h3 class="font-bold text-white mb-2">1. 약품 입력</h3>
          <p class="text-sm text-gray-400">성분명 또는 상품명을<br>입력하세요</p>
        </div>
        <div class="glass rounded-xl p-6 text-center">
          <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
            <i class="fas fa-ranking-star text-2xl text-purple-400"></i>
          </div>
          <h3 class="font-bold text-white mb-2">2. KOL 랭킹</h3>
          <p class="text-sm text-gray-400">AI가 5~8명의 핵심 KOL을<br>우선순위로 제시합니다</p>
        </div>
        <div class="glass rounded-xl p-6 text-center">
          <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-pink-500/20 flex items-center justify-center">
            <i class="fas fa-user-tie text-2xl text-pink-400"></i>
          </div>
          <h3 class="font-bold text-white mb-2">3. 상세 분석</h3>
          <p class="text-sm text-gray-400">클릭하면 프로필, 진료일정,<br>접근 전략을 확인합니다</p>
        </div>
      </div>
    </div>
  </div>

  <!-- LOADING -->
  <div id="loadingView" class="hidden text-center py-20">
    <div class="spinner mx-auto mb-6"></div>
    <p id="loadingText" class="text-xl text-gray-300 font-medium">AI가 KOL 데이터를 분석하고 있습니다...</p>
    <p class="text-sm text-gray-500 mt-2">PubMed, 병원정보, 학회활동 등을 종합 분석 중</p>
  </div>

  <!-- STAGE 2: KOL Ranking List -->
  <div id="stage2" class="hidden">
    <!-- Drug Info Summary -->
    <div id="drugInfoBar" class="glass rounded-xl p-5 mb-6 slide-up"></div>
    <!-- KOL List -->
    <div id="kolList" class="space-y-4"></div>
  </div>

  <!-- STAGE 3: KOL Detail -->
  <div id="stage3" class="hidden"></div>

</main>

<!-- FOOTER -->
<footer class="text-center py-6 text-gray-600 text-xs border-t border-white/5 mt-10">
  MedRep KOL Targeting v6.0 &middot; AI 분석 결과는 공개 정보 기반이며, 실제 영업 시 추가 확인이 필요합니다.
</footer>

<script>
// ============================================================
// STATE
// ============================================================
let currentDrugData = null;
let currentDrug = '';

// ============================================================
// NAVIGATION
// ============================================================
function goHome() {
  showStage(1);
  currentDrugData = null;
  currentDrug = '';
  updateBreadcrumb([]);
}

function goToList() {
  if (currentDrugData) showStage(2);
}

function showStage(n) {
  document.getElementById('stage1').classList.toggle('hidden', n !== 1);
  document.getElementById('stage2').classList.toggle('hidden', n !== 2);
  document.getElementById('stage3').classList.toggle('hidden', n !== 3);
  document.getElementById('loadingView').classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showLoading(text) {
  document.getElementById('stage1').classList.add('hidden');
  document.getElementById('stage2').classList.add('hidden');
  document.getElementById('stage3').classList.add('hidden');
  document.getElementById('loadingView').classList.remove('hidden');
  document.getElementById('loadingText').textContent = text;
}

function updateBreadcrumb(items) {
  const el = document.getElementById('headerBreadcrumb');
  if (items.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = items.map((item, i) => {
    const isLast = i === items.length - 1;
    const cls = isLast ? 'text-blue-400 font-medium' : 'text-gray-400 cursor-pointer hover:text-gray-200';
    const onclick = item.onclick ? \` onclick="\${item.onclick}"\` : '';
    return \`<span class="\${cls}"\${onclick}>\${item.label}</span>\` + (isLast ? '' : '<i class="fas fa-chevron-right text-xs text-gray-600 mx-1"></i>');
  }).join('');
}

// ============================================================
// QUICK SEARCH
// ============================================================
function quickSearch(drug) {
  document.getElementById('drugInput').value = drug;
  analyzeDrug();
}

// ============================================================
// STAGE 1 → STAGE 2: Drug Analysis
// ============================================================
async function analyzeDrug() {
  const drug = document.getElementById('drugInput').value.trim();
  if (!drug || drug.length < 2) { alert('의약품명을 2글자 이상 입력해주세요.'); return; }

  currentDrug = drug;
  showLoading(\`"\${drug}" 관련 KOL을 분석하고 있습니다...\`);

  try {
    const resp = await fetch('/api/drug/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drug })
    });
    const json = await resp.json();
    if (!json.success) throw new Error(json.error || '분석 실패');
    
    currentDrugData = json.data;
    renderKOLList(json.data);
    showStage(2);
    updateBreadcrumb([
      { label: '홈', onclick: 'goHome()' },
      { label: \`\${json.data.drugInfo?.genericName || drug}\` }
    ]);
  } catch (err) {
    alert(err.message);
    showStage(1);
  }
}

// ============================================================
// RENDER: KOL Ranking List (Stage 2)
// ============================================================
function renderKOLList(data) {
  const di = data.drugInfo || {};
  
  // Drug info bar
  document.getElementById('drugInfoBar').innerHTML = \`
    <div class="flex flex-wrap items-center gap-4">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <i class="fas fa-pills text-white text-xl"></i>
        </div>
        <div>
          <h3 class="text-white font-bold text-lg">\${di.genericName || currentDrug}</h3>
          <p class="text-gray-400 text-sm">\${di.drugClass || ''} · \${di.brandExamples || ''}</p>
        </div>
      </div>
      <div class="flex-1"></div>
      <div class="flex flex-wrap gap-3 text-sm">
        <span class="px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-300"><i class="fas fa-stethoscope mr-1"></i>\${di.indication || ''}</span>
        <span class="px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-300"><i class="fas fa-flask mr-1"></i>\${di.relatedTherapyArea || ''}</span>
      </div>
    </div>
    \${di.mechanism ? \`<p class="text-gray-400 text-sm mt-3"><i class="fas fa-info-circle mr-1 text-blue-400"></i>\${di.mechanism}</p>\` : ''}
    \${di.keyBenefits ? \`<p class="text-gray-400 text-sm mt-1"><i class="fas fa-star mr-1 text-yellow-400"></i>\${di.keyBenefits}</p>\` : ''}
  \`;

  // KOL cards
  const kols = data.kols || [];
  const listEl = document.getElementById('kolList');
  
  if (kols.length === 0) {
    listEl.innerHTML = '<div class="glass rounded-xl p-10 text-center"><i class="fas fa-user-slash text-4xl text-gray-600 mb-4"></i><p class="text-gray-400">관련 KOL을 찾지 못했습니다.</p></div>';
    return;
  }

  listEl.innerHTML = \`
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-white font-bold text-lg"><i class="fas fa-ranking-star mr-2 text-yellow-400"></i>KOL 타겟 랭킹 <span class="text-gray-400 font-normal text-sm ml-2">\${kols.length}명</span></h3>
      <span class="text-xs text-gray-500">relevanceScore 기준 내림차순</span>
    </div>
  \` + kols.map((kol, idx) => \`
    <div class="kol-card glass rounded-xl p-5 cursor-pointer slide-up" style="animation-delay:\${idx*80}ms" onclick='viewKOLDetail(\${JSON.stringify(kol).replace(/'/g,"&#39;")})'>
      <div class="flex items-start gap-4">
        <!-- Rank + Score -->
        <div class="flex flex-col items-center gap-2">
          <div class="w-8 h-8 rounded-full \${idx < 3 ? 'bg-gradient-to-br from-yellow-500 to-orange-500' : 'bg-white/10'} flex items-center justify-center text-white font-bold text-sm">\${kol.rank || idx+1}</div>
          <div class="score-ring \${kol.relevanceScore >= 80 ? 'score-high' : kol.relevanceScore >= 60 ? 'score-med' : 'score-low'}" style="--score:\${kol.relevanceScore || 50}">
            <div class="w-[44px] h-[44px] rounded-full bg-slate-900 flex items-center justify-center text-sm">\${kol.relevanceScore || '—'}</div>
          </div>
        </div>
        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <h4 class="text-white font-bold text-lg">\${kol.name}</h4>
            <span class="px-2 py-0.5 rounded text-xs font-bold text-white \${kol.kolTier === 'A' ? 'tier-A' : kol.kolTier === 'B' ? 'tier-B' : 'tier-C'}">Tier \${kol.kolTier || '?'}</span>
            <span class="px-2 py-0.5 rounded text-xs \${kol.prescriptionLikelihood === 'High' ? 'bg-green-500/20 text-green-300' : kol.prescriptionLikelihood === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-gray-500/20 text-gray-300'}">
              <i class="fas fa-prescription-bottle-medical mr-1"></i>\${kol.prescriptionLikelihood || ''} 처방
            </span>
          </div>
          <p class="text-gray-400 text-sm mb-2">\${kol.hospital || ''} · \${kol.department || ''} · \${kol.position || ''}</p>
          <p class="text-gray-300 text-sm mb-3">\${kol.whyTarget || ''}</p>
          <div class="flex flex-wrap gap-1.5 mb-2">
            \${(kol.specialtyTags || []).map(t => \`<span class="px-2 py-0.5 rounded-full bg-white/5 text-xs text-gray-400">\${t}</span>\`).join('')}
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-500">
            \${kol.researchConnection ? \`<div><i class="fas fa-flask mr-1 text-blue-400"></i>\${kol.researchConnection.substring(0,60)}...</div>\` : ''}
            \${kol.societyRole ? \`<div><i class="fas fa-building-columns mr-1 text-purple-400"></i>\${kol.societyRole}</div>\` : ''}
            \${kol.mediaActivity ? \`<div><i class="fas fa-video mr-1 text-red-400"></i>\${kol.mediaActivity.substring(0,60)}...</div>\` : ''}
          </div>
        </div>
        <!-- Arrow -->
        <div class="flex-shrink-0 mt-4">
          <i class="fas fa-chevron-right text-gray-600 text-lg"></i>
        </div>
      </div>
      \${kol.approachTip ? \`<div class="mt-3 pt-3 border-t border-white/5 text-sm text-blue-300"><i class="fas fa-lightbulb mr-1 text-yellow-400"></i>\${kol.approachTip}</div>\` : ''}
    </div>
  \`).join('');
}

// ============================================================
// STAGE 2 → STAGE 3: KOL Detail
// ============================================================
async function viewKOLDetail(kol) {
  showLoading(\`\${kol.name} 교수의 상세 프로필을 분석하고 있습니다...\`);
  
  updateBreadcrumb([
    { label: '홈', onclick: 'goHome()' },
    { label: currentDrugData?.drugInfo?.genericName || currentDrug, onclick: 'goToList()' },
    { label: kol.name }
  ]);

  try {
    const resp = await fetch('/api/kol/detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: kol.name,
        hospital: kol.hospital,
        department: kol.department,
        drug: currentDrug,
        drugInfo: currentDrugData?.drugInfo
      })
    });
    const json = await resp.json();
    if (!json.success) throw new Error(json.error || '분석 실패');

    renderKOLDetail(json.data, kol);
    showStage(3);
  } catch (err) {
    alert(err.message);
    showStage(2);
  }
}

// ============================================================
// RENDER: KOL Detail (Stage 3)
// ============================================================
function renderKOLDetail(data, listKol) {
  const p = data.profile || {};
  const s = data.drugStrategy || {};
  const el = document.getElementById('stage3');

  el.innerHTML = \`
    <div class="slide-up">
    <!-- Back + KOL Header -->
    <button onclick="goToList()" class="mb-4 text-gray-400 hover:text-white transition text-sm"><i class="fas fa-arrow-left mr-2"></i>목록으로 돌아가기</button>
    
    <div class="glass rounded-2xl p-6 mb-6">
      <div class="flex flex-wrap items-start gap-5">
        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl text-white font-bold">
          \${(p.name || listKol.name || '?').charAt(0)}
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-1 flex-wrap">
            <h2 class="text-2xl font-extrabold text-white">\${p.name || listKol.name}</h2>
            <span class="px-2.5 py-1 rounded text-xs font-bold text-white \${listKol.kolTier === 'A' ? 'tier-A' : listKol.kolTier === 'B' ? 'tier-B' : 'tier-C'}">Tier \${listKol.kolTier || '?'}</span>
          </div>
          <p class="text-gray-400">\${p.hospital || listKol.hospital || ''} · \${p.department || listKol.department || ''} · \${p.position || listKol.position || ''}</p>
          <div class="flex flex-wrap gap-1.5 mt-2">
            \${(p.specialtyTags || listKol.specialtyTags || []).map(t => \`<span class="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 text-xs">\${t}</span>\`).join('')}
          </div>
          \${s.oneLiner ? \`<div class="mt-3 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-l-4 border-blue-500 text-blue-200 text-sm font-medium">\${s.oneLiner}</div>\` : ''}
        </div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      <button class="tab-btn active px-4 py-2 rounded-lg glass-light text-sm font-medium border border-transparent" onclick="switchTab('overview', this)"><i class="fas fa-chart-pie mr-1"></i>요약</button>
      <button class="tab-btn px-4 py-2 rounded-lg glass-light text-sm font-medium border border-transparent text-gray-400" onclick="switchTab('schedule', this)"><i class="fas fa-calendar-days mr-1"></i>진료일정</button>
      <button class="tab-btn px-4 py-2 rounded-lg glass-light text-sm font-medium border border-transparent text-gray-400" onclick="switchTab('treatment', this)"><i class="fas fa-prescription mr-1"></i>치료 성향</button>
      <button class="tab-btn px-4 py-2 rounded-lg glass-light text-sm font-medium border border-transparent text-gray-400" onclick="switchTab('research', this)"><i class="fas fa-flask mr-1"></i>연구·학술</button>
      <button class="tab-btn px-4 py-2 rounded-lg glass-light text-sm font-medium border border-transparent text-gray-400" onclick="switchTab('media', this)"><i class="fas fa-video mr-1"></i>미디어</button>
      <button class="tab-btn px-4 py-2 rounded-lg glass-light text-sm font-medium border border-transparent text-gray-400" onclick="switchTab('strategy', this)"><i class="fas fa-crosshairs mr-1"></i>접근 전략</button>
    </div>

    <!-- TAB: Overview -->
    <div id="tab-overview" class="tab-content fade-in">
      <div class="grid md:grid-cols-2 gap-6">
        <!-- Key Insights -->
        <div class="glass rounded-xl p-5">
          <h3 class="text-white font-bold mb-4"><i class="fas fa-lightbulb mr-2 text-yellow-400"></i>핵심 인사이트</h3>
          <div class="space-y-3">
            \${(s.keyInsights || []).map((ki, i) => \`
              <div class="flex gap-3 items-start">
                <div class="w-7 h-7 rounded-full bg-blue-500/20 flex-shrink-0 flex items-center justify-center text-blue-400 text-xs font-bold">\${i+1}</div>
                <p class="text-gray-300 text-sm">\${ki}</p>
              </div>
            \`).join('')}
          </div>
        </div>
        <!-- Profile Summary -->
        <div class="glass rounded-xl p-5">
          <h3 class="text-white font-bold mb-4"><i class="fas fa-user-doctor mr-2 text-cyan-400"></i>프로필 요약</h3>
          \${p.treatmentPhilosophy ? \`<div class="mb-4"><p class="text-xs text-gray-500 mb-1">치료 철학</p><p class="text-gray-300 text-sm">\${p.treatmentPhilosophy}</p></div>\` : ''}
          \${p.researchFocus ? \`<div class="mb-4"><p class="text-xs text-gray-500 mb-1">연구 초점</p><p class="text-gray-300 text-sm">\${p.researchFocus}</p></div>\` : ''}
          \${s.relevanceSummary ? \`<div><p class="text-xs text-gray-500 mb-1">약물 관련성</p><p class="text-gray-300 text-sm">\${s.relevanceSummary}</p></div>\` : ''}
        </div>
      </div>
      <!-- Education & Career -->
      <div class="grid md:grid-cols-2 gap-6 mt-6">
        \${(p.education && p.education.length) ? \`
        <div class="glass rounded-xl p-5">
          <h3 class="text-white font-bold mb-3"><i class="fas fa-graduation-cap mr-2 text-green-400"></i>학력</h3>
          <div class="space-y-2">\${p.education.map(e => \`<div class="flex gap-2 text-sm"><span class="text-gray-500 flex-shrink-0 w-24">\${e.period || e.year || ''}</span><span class="text-gray-300">\${e.detail}</span></div>\`).join('')}</div>
        </div>\` : ''}
        \${(p.career && p.career.length) ? \`
        <div class="glass rounded-xl p-5">
          <h3 class="text-white font-bold mb-3"><i class="fas fa-briefcase-medical mr-2 text-orange-400"></i>경력</h3>
          <div class="space-y-2">\${p.career.map(c => \`<div class="flex gap-2 text-sm"><span class="text-gray-500 flex-shrink-0 w-24">\${c.period || ''}</span><span class="text-gray-300">\${c.detail}</span></div>\`).join('')}</div>
        </div>\` : ''}
      </div>
    </div>

    <!-- TAB: Clinic Schedule -->
    <div id="tab-schedule" class="tab-content hidden fade-in">
      <div class="glass rounded-xl p-6">
        <h3 class="text-white font-bold mb-4"><i class="fas fa-calendar-days mr-2 text-cyan-400"></i>주간 진료일정</h3>
        \${renderScheduleTable(p.clinicSchedule)}
        \${p.clinicSchedule?.bestVisitTime ? \`<div class="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20"><i class="fas fa-clock mr-2 text-blue-400"></i><span class="text-blue-200 text-sm font-medium">최적 방문 시점:</span> <span class="text-gray-300 text-sm">\${p.clinicSchedule.bestVisitTime}</span></div>\` : ''}
        \${p.clinicSchedule?.note ? \`<p class="text-gray-500 text-xs mt-3"><i class="fas fa-info-circle mr-1"></i>\${p.clinicSchedule.note}</p>\` : ''}
      </div>
    </div>

    <!-- TAB: Treatment Preferences -->
    <div id="tab-treatment" class="tab-content hidden fade-in">
      \${p.treatmentPhilosophy ? \`
      <div class="glass rounded-xl p-5 mb-6">
        <h3 class="text-white font-bold mb-3"><i class="fas fa-heart-pulse mr-2 text-red-400"></i>치료 철학</h3>
        <p class="text-gray-300 text-sm leading-relaxed">\${p.treatmentPhilosophy}</p>
      </div>\` : ''}
      \${(p.treatmentPreferences && p.treatmentPreferences.length) ? \`
      <div class="space-y-4">
        <h3 class="text-white font-bold"><i class="fas fa-prescription mr-2 text-purple-400"></i>질환별 치료 선호도</h3>
        \${p.treatmentPreferences.map(tp => \`
          <div class="glass rounded-xl p-5">
            <div class="flex items-center gap-2 mb-2">
              <span class="px-3 py-1 rounded-lg bg-purple-500/15 text-purple-300 text-sm font-medium">\${tp.condition}</span>
              \${tp.drugRelevance ? \`<span class="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 text-xs"><i class="fas fa-link mr-1"></i>약물 관련</span>\` : ''}
            </div>
            <p class="text-gray-300 text-sm mb-2">\${tp.approach}</p>
            \${tp.drugRelevance ? \`<p class="text-blue-300 text-xs"><i class="fas fa-arrow-right mr-1"></i>\${tp.drugRelevance}</p>\` : ''}
          </div>
        \`).join('')}
      </div>\` : '<p class="text-gray-500 text-center py-10">치료 선호도 정보가 없습니다.</p>'}
    </div>

    <!-- TAB: Research & Publications -->
    <div id="tab-research" class="tab-content hidden fade-in">
      \${p.researchFocus ? \`
      <div class="glass rounded-xl p-5 mb-6">
        <h3 class="text-white font-bold mb-3"><i class="fas fa-microscope mr-2 text-cyan-400"></i>연구 초점</h3>
        <p class="text-gray-300 text-sm leading-relaxed">\${p.researchFocus}</p>
      </div>\` : ''}
      
      <div class="grid md:grid-cols-2 gap-6">
        \${(p.keyPublications && p.keyPublications.length) ? \`
        <div class="glass rounded-xl p-5">
          <h3 class="text-white font-bold mb-4"><i class="fas fa-file-lines mr-2 text-green-400"></i>주요 논문</h3>
          <div class="space-y-3">
            \${p.keyPublications.map(pub => \`
              <div class="p-3 rounded-lg bg-white/3">
                <p class="text-gray-200 text-sm font-medium">\${pub.title}</p>
                <p class="text-gray-500 text-xs mt-1">\${pub.journal || ''} \${pub.year ? '('+pub.year+')' : ''}</p>
                \${pub.summary ? \`<p class="text-gray-400 text-xs mt-1">\${pub.summary}</p>\` : ''}
              </div>
            \`).join('')}
          </div>
        </div>\` : ''}
        
        <div class="space-y-6">
          \${(p.societyRoles && p.societyRoles.length) ? \`
          <div class="glass rounded-xl p-5">
            <h3 class="text-white font-bold mb-3"><i class="fas fa-building-columns mr-2 text-purple-400"></i>학회 활동</h3>
            <div class="space-y-2">
              \${p.societyRoles.map(sr => {
                const society = typeof sr === 'string' ? sr : sr.society;
                const role = typeof sr === 'string' ? '' : sr.role;
                const sig = typeof sr === 'string' ? '' : sr.significance;
                return \`<div class="p-2 rounded-lg bg-white/3"><p class="text-gray-300 text-sm">\${society}\${role ? ' · '+role : ''}</p>\${sig ? '<p class="text-gray-500 text-xs mt-0.5">'+sig+'</p>' : ''}</div>\`;
              }).join('')}
            </div>
          </div>\` : ''}
          
          \${(p.booksAndPatents && p.booksAndPatents.length) ? \`
          <div class="glass rounded-xl p-5">
            <h3 class="text-white font-bold mb-3"><i class="fas fa-book mr-2 text-yellow-400"></i>저서·특허</h3>
            <ul class="space-y-1.5">\${p.booksAndPatents.map(b => \`<li class="text-gray-400 text-sm">· \${b}</li>\`).join('')}</ul>
          </div>\` : ''}
          
          \${(p.awards && p.awards.length) ? \`
          <div class="glass rounded-xl p-5">
            <h3 class="text-white font-bold mb-3"><i class="fas fa-trophy mr-2 text-amber-400"></i>수상</h3>
            <ul class="space-y-1.5">\${p.awards.map(a => \`<li class="text-gray-400 text-sm">🏆 \${a}</li>\`).join('')}</ul>
          </div>\` : ''}
        </div>
      </div>
    </div>

    <!-- TAB: Media -->
    <div id="tab-media" class="tab-content hidden fade-in">
      \${(p.mediaAppearances && p.mediaAppearances.length) ? \`
      <div class="space-y-4">
        \${p.mediaAppearances.map(m => \`
          <div class="glass rounded-xl p-5">
            <div class="flex items-center gap-2 mb-3">
              <span class="px-2.5 py-1 rounded-lg text-xs font-medium \${m.type?.includes('YouTube') || m.type?.includes('유튜브') ? 'bg-red-500/15 text-red-300' : 'bg-blue-500/15 text-blue-300'}">
                <i class="fas \${m.type?.includes('YouTube') || m.type?.includes('유튜브') ? 'fa-youtube' : 'fa-tv'} mr-1"></i>\${m.type || '미디어'}
              </span>
              <h4 class="text-white font-medium text-sm">\${m.title || ''}</h4>
            </div>
            \${(m.keyStatements && m.keyStatements.length) ? \`
            <div class="mb-3">
              <p class="text-xs text-gray-500 mb-2">핵심 발언</p>
              <div class="space-y-1.5">\${m.keyStatements.map(ks => \`<div class="flex gap-2 items-start"><i class="fas fa-quote-left text-gray-600 text-xs mt-1"></i><p class="text-gray-300 text-sm">\${ks}</p></div>\`).join('')}</div>
            </div>\` : ''}
            \${m.implication ? \`<div class="p-3 rounded-lg bg-blue-500/10"><p class="text-blue-300 text-xs"><i class="fas fa-lightbulb mr-1 text-yellow-400"></i>영업적 시사점: \${m.implication}</p></div>\` : ''}
          </div>
        \`).join('')}
      </div>\` : '<p class="text-gray-500 text-center py-10">미디어 활동 정보가 없습니다.</p>'}
    </div>

    <!-- TAB: Approach Strategy -->
    <div id="tab-strategy" class="tab-content hidden fade-in">
      \${s.approachStrategy ? \`
      <div class="glass rounded-xl p-6 mb-6 border-l-4 border-blue-500">
        <h3 class="text-white font-bold mb-3"><i class="fas fa-crosshairs mr-2 text-blue-400"></i>핵심 접근 전략</h3>
        <p class="text-gray-300 leading-relaxed">\${s.approachStrategy}</p>
      </div>\` : ''}

      <!-- Action Items -->
      \${(s.actionItems && s.actionItems.length) ? \`
      <div class="grid md:grid-cols-2 gap-4 mb-6">
        \${s.actionItems.map(ai => \`
          <div class="glass rounded-xl p-5">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center"><i class="fas \${ai.icon || 'fa-check'} text-blue-400"></i></div>
              <h4 class="text-white font-bold text-sm">\${ai.title}</h4>
            </div>
            <p class="text-gray-400 text-sm">\${ai.detail || ai.text || ''}</p>
          </div>
        \`).join('')}
      </div>\` : ''}

      <!-- Talking Points -->
      \${(s.talkingPoints && s.talkingPoints.length) ? \`
      <div class="glass rounded-xl p-5 mb-6">
        <h3 class="text-white font-bold mb-3"><i class="fas fa-comments mr-2 text-cyan-400"></i>대화 포인트</h3>
        <div class="space-y-2">\${s.talkingPoints.map((tp,i) => \`<div class="flex gap-3 items-start"><span class="w-6 h-6 rounded-full bg-cyan-500/20 flex-shrink-0 flex items-center justify-center text-cyan-400 text-xs font-bold">\${i+1}</span><p class="text-gray-300 text-sm">\${tp}</p></div>\`).join('')}</div>
      </div>\` : ''}

      <!-- Do / Don't -->
      <div class="grid md:grid-cols-2 gap-6 mb-6">
        \${(s.doList && s.doList.length) ? \`
        <div class="glass rounded-xl p-5 border-t-2 border-green-500">
          <h3 class="text-green-400 font-bold mb-3"><i class="fas fa-check-circle mr-2"></i>DO (실행 사항)</h3>
          <ul class="space-y-2">\${s.doList.map(d => \`<li class="flex gap-2 items-start text-sm"><i class="fas fa-check text-green-500 mt-0.5"></i><span class="text-gray-300">\${d}</span></li>\`).join('')}</ul>
        </div>\` : ''}
        \${(s.dontList && s.dontList.length) ? \`
        <div class="glass rounded-xl p-5 border-t-2 border-red-500">
          <h3 class="text-red-400 font-bold mb-3"><i class="fas fa-times-circle mr-2"></i>DON'T (금지 사항)</h3>
          <ul class="space-y-2">\${s.dontList.map(d => \`<li class="flex gap-2 items-start text-sm"><i class="fas fa-times text-red-500 mt-0.5"></i><span class="text-gray-300">\${d}</span></li>\`).join('')}</ul>
        </div>\` : ''}
      </div>

      <!-- Preparation Checklist -->
      \${(s.preparationChecklist && s.preparationChecklist.length) ? \`
      <div class="glass rounded-xl p-5 mb-6">
        <h3 class="text-white font-bold mb-3"><i class="fas fa-clipboard-check mr-2 text-amber-400"></i>방문 전 체크리스트</h3>
        <div class="space-y-2">\${s.preparationChecklist.map(pc => \`<label class="flex gap-3 items-start cursor-pointer"><input type="checkbox" class="mt-1 accent-blue-500"><span class="text-gray-300 text-sm">\${pc}</span></label>\`).join('')}</div>
      </div>\` : ''}

      <!-- Data Sources -->
      \${(data.dataSources && data.dataSources.length) ? \`
      <div class="glass rounded-xl p-5">
        <h3 class="text-white font-bold mb-3"><i class="fas fa-database mr-2 text-gray-400"></i>정보 출처</h3>
        <div class="space-y-2">\${data.dataSources.map(ds => {
          const type = typeof ds === 'string' ? '' : ds.type;
          const detail = typeof ds === 'string' ? ds : ds.detail;
          const url = typeof ds === 'string' ? '' : ds.url;
          return \`<div class="flex gap-2 items-start text-sm"><i class="fas fa-external-link text-gray-600 mt-0.5"></i><div><span class="text-gray-400">\${type ? '['+type+'] ' : ''}\${detail}</span>\${url ? '<br><a href="'+url+'" target="_blank" class="text-blue-400 text-xs hover:underline">'+url+'</a>' : ''}</div></div>\`;
        }).join('')}</div>
        \${data.confidenceNote ? \`<p class="text-gray-500 text-xs mt-4 pt-3 border-t border-white/5"><i class="fas fa-shield-check mr-1"></i>\${data.confidenceNote}</p>\` : ''}
      </div>\` : ''}
    </div>
    </div>
  \`;
}

// ============================================================
// Schedule Table Helper
// ============================================================
function renderScheduleTable(schedule) {
  if (!schedule) return '<p class="text-gray-500 text-center py-6">진료일정 정보가 없습니다.</p>';
  
  const days = [
    { key: 'monday', label: '월' },
    { key: 'tuesday', label: '화' },
    { key: 'wednesday', label: '수' },
    { key: 'thursday', label: '목' },
    { key: 'friday', label: '금' }
  ];

  return \`
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr>
            <th class="py-2 px-3 text-left text-gray-500 font-normal"></th>
            \${days.map(d => \`<th class="py-2 px-3 text-center text-gray-300 font-bold">\${d.label}</th>\`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr class="border-t border-white/5">
            <td class="py-3 px-3 text-gray-400 font-medium">오전</td>
            \${days.map(d => {
              const val = schedule[d.key]?.am || '-';
              const isClinic = val !== '-' && !val.includes('없') && !val.includes('휴');
              return \`<td class="py-3 px-3 text-center"><span class="px-2 py-1 rounded text-xs \${isClinic ? 'bg-green-500/15 text-green-300' : 'bg-white/5 text-gray-600'}">\${val}</span></td>\`;
            }).join('')}
          </tr>
          <tr class="border-t border-white/5">
            <td class="py-3 px-3 text-gray-400 font-medium">오후</td>
            \${days.map(d => {
              const val = schedule[d.key]?.pm || '-';
              const isSurgery = val.includes('수술') || val.includes('시술');
              const isClinic = val !== '-' && !val.includes('없') && !val.includes('휴') && !isSurgery;
              return \`<td class="py-3 px-3 text-center"><span class="px-2 py-1 rounded text-xs \${isClinic ? 'bg-green-500/15 text-green-300' : isSurgery ? 'bg-orange-500/15 text-orange-300' : 'bg-white/5 text-gray-600'}">\${val}</span></td>\`;
            }).join('')}
          </tr>
        </tbody>
      </table>
    </div>
  \`;
}

// ============================================================
// Tab Switching
// ============================================================
function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(el => { el.classList.remove('active'); el.classList.add('text-gray-400'); });
  const target = document.getElementById('tab-' + tabId);
  if (target) { target.classList.remove('hidden'); target.classList.add('fade-in'); }
  if (btn) { btn.classList.add('active'); btn.classList.remove('text-gray-400'); }
}
</script>
</body>
</html>`)
})

export default app
