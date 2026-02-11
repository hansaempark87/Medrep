import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  OPENAI_API_KEY: string
  OPENAI_BASE_URL: string
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', service: 'MedRep Intelligence', version: '2.0.0' })
})

// ============================================================
// KOL AI 분석 API
// ============================================================
const SYSTEM_PROMPT = `너는 "MedRep Intelligence"라는 제약영업 AI 어시스턴트다.
12년차 제약회사 영업 팀장의 실전 노하우를 학습했으며, 한국 제약업계의 KOL(핵심 오피니언 리더) 분석 전문가다.

너의 역할:
1. 주어진 KOL(교수)에 대해 영업 팀이 바로 활용할 수 있는 실전 인텔리전스를 제공한다.
2. 해당 교수의 전공, 소속 병원, 진료과를 바탕으로 현실적이고 구체적인 분석을 한다.
3. 제약영업 현장에서 바로 쓸 수 있는 수준의 구체적인 전략과 팁을 제공한다.

분석 시 반드시 고려할 사항:
- 해당 진료과의 최신 치료 트렌드와 핵심 약물
- 한국 의료 환경의 특수성 (건강보험, 급여기준, 학회 구조 등)
- 경쟁사 포지셔닝과 위협도
- 방문 전략, 최적 시간대, 주의사항
- 학회 활동, 연구 동향, 처방 패턴

반드시 아래 JSON 형식으로만 응답해라. 다른 텍스트는 절대 포함하지 마라:
{
  "name": "OOO 교수",
  "hospital": "소속병원 정식명칭",
  "position": "직위 추정 (예: OO과 교수 / OO센터장)",
  "specialty": "진료과",
  "publications": 숫자(추정),
  "hIndex": 숫자(추정),
  "clinicalTrials": 숫자(추정),
  "influence": 1~100 숫자,
  "accessibility": 1~100 숫자,
  "prescriptionPower": 1~100 숫자,
  "trends": [
    {"keyword": "핵심 연구 키워드1", "desc": "구체적 설명 2~3문장"},
    {"keyword": "핵심 연구 키워드2", "desc": "구체적 설명 2~3문장"},
    {"keyword": "핵심 연구 키워드3", "desc": "구체적 설명 2~3문장"}
  ],
  "strategy": {
    "approach": "추천 접근 전략 한 줄 요약",
    "tips": [
      {"icon": "fa-lightbulb", "title": "접근 전략", "text": "구체적 접근 방법 3~4문장"},
      {"icon": "fa-clock", "title": "최적 방문 시간", "text": "요일, 시간대, 이유 포함 2~3문장"},
      {"icon": "fa-exclamation-triangle", "title": "주의사항", "text": "경쟁사 동향, 금기사항 등 2~3문장"},
      {"icon": "fa-handshake", "title": "관계 구축 포인트", "text": "학회, 연구지원 등 2~3문장"}
    ],
    "competitors": [
      {"company": "제약사명", "product": "제품명", "status": "처방 현황", "threat": "high 또는 medium 또는 low"},
      {"company": "제약사명", "product": "제품명", "status": "처방 현황", "threat": "high 또는 medium 또는 low"},
      {"company": "제약사명", "product": "제품명", "status": "처방 현황", "threat": "high 또는 medium 또는 low"}
    ]
  },
  "recentActivities": [
    {"date": "2024.01.XX", "type": "학회발표", "detail": "구체적 내용"},
    {"date": "2024.01.XX", "type": "논문발표", "detail": "구체적 내용"},
    {"date": "2023.12.XX", "type": "임상시험", "detail": "구체적 내용"},
    {"date": "2023.12.XX", "type": "자문위원", "detail": "구체적 내용"}
  ]
}`

app.post('/api/kol/analyze', async (c) => {
  const apiKey = c.env?.OPENAI_API_KEY || (typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : '')
  const baseURL = c.env?.OPENAI_BASE_URL || (typeof process !== 'undefined' ? process.env?.OPENAI_BASE_URL : '') || 'https://api.openai.com/v1'

  if (!apiKey) {
    return c.json({ error: 'OpenAI API key not configured' }, 500)
  }

  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid request body' }, 400)
  }

  const { query } = body
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return c.json({ error: 'Please provide a valid search query' }, 400)
  }

  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `다음 KOL을 분석해줘: ${query.trim()}\n\n사용자가 입력한 정보에서 교수 이름, 병원명, 진료과를 최대한 추출하여 분석해라. 정보가 부족하면 합리적으로 추정해서 분석해라.` }
        ],
        max_tokens: 4000,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('OpenAI API error:', response.status, errText)
      return c.json({ error: `AI API error: ${response.status}` }, 502)
    }

    const data: any = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return c.json({ error: 'No response from AI' }, 502)
    }

    // Parse JSON from response (robust extraction with truncation recovery)
    let parsed
    try {
      let jsonStr = content.trim()
      // Remove markdown code blocks
      if (jsonStr.includes('```')) {
        const match = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
        if (match) jsonStr = match[1].trim()
      }
      // Extract JSON object
      if (!jsonStr.startsWith('{')) {
        const firstBrace = jsonStr.indexOf('{')
        if (firstBrace !== -1) jsonStr = jsonStr.substring(firstBrace)
      }
      // Remove null bytes or weird characters
      jsonStr = jsonStr.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
      
      // Try direct parse first
      try {
        parsed = JSON.parse(jsonStr)
      } catch {
        // If truncated, try to repair by closing open brackets
        let repaired = jsonStr
        // Remove trailing incomplete string value
        repaired = repaired.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, '')
        repaired = repaired.replace(/,\s*"[^"]*$/, '')
        repaired = repaired.replace(/,\s*$/, '')
        // Count open brackets and close them
        let openBraces = 0, openBrackets = 0
        let inString = false, escape = false
        for (const ch of repaired) {
          if (escape) { escape = false; continue }
          if (ch === '\\') { escape = true; continue }
          if (ch === '"') { inString = !inString; continue }
          if (inString) continue
          if (ch === '{') openBraces++
          if (ch === '}') openBraces--
          if (ch === '[') openBrackets++
          if (ch === ']') openBrackets--
        }
        // If we're still inside a string, close it
        if (inString) repaired += '"'
        // Close remaining brackets
        while (openBrackets > 0) { repaired += ']'; openBrackets-- }
        while (openBraces > 0) { repaired += '}'; openBraces-- }
        parsed = JSON.parse(repaired)
      }
    } catch (parseErr: any) {
      console.error('Failed to parse AI response:', content.substring(0, 500))
      return c.json({ error: 'AI 분석 결과를 처리하는 중 오류가 발생했습니다. 다시 시도해주세요.' }, 502)
    }

    return c.json({ success: true, data: parsed })

  } catch (err: any) {
    console.error('KOL analysis error:', err)
    return c.json({ error: `Analysis failed: ${err.message}` }, 500)
  }
})

// ============================================================
// D1 기반 분석 이력 저장/조회 API
// ============================================================
app.get('/api/kol/history', async (c) => {
  const db = c.env?.DB
  if (!db) {
    return c.json({ data: [] })
  }
  try {
    const results = await db.prepare(
      'SELECT * FROM kol_analyses ORDER BY created_at DESC LIMIT 20'
    ).all()
    return c.json({ data: results.results || [] })
  } catch {
    return c.json({ data: [] })
  }
})

app.post('/api/kol/history', async (c) => {
  const db = c.env?.DB
  if (!db) {
    return c.json({ success: false, error: 'DB not available' }, 500)
  }

  try {
    const body: any = await c.req.json()
    const { query, name, hospital, specialty, result_json } = body

    await db.prepare(
      'INSERT INTO kol_analyses (query, name, hospital, specialty, result_json) VALUES (?, ?, ?, ?, ?)'
    ).bind(query, name, hospital, specialty, JSON.stringify(result_json)).run()

    return c.json({ success: true })
  } catch (err: any) {
    console.error('Save history error:', err)
    return c.json({ success: false, error: err.message }, 500)
  }
})

export default app
