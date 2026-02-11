import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  OPENAI_API_KEY: string
  OPENAI_BASE_URL: string
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

// ============================================================
// Health check
// ============================================================
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', service: 'MedRep Intelligence', version: '3.0.0' })
})

// ============================================================
// KOL 프로필 CRUD API
// ============================================================

// GET /api/kol/profiles - 전체 KOL 목록 조회
app.get('/api/kol/profiles', async (c) => {
  const db = c.env?.DB
  if (!db) return c.json({ data: [] })
  try {
    const results = await db.prepare(
      'SELECT id, name, hospital, department, position, kol_tier, persona, prescription_pattern, specialty_tags, publications_count, h_index, clinical_trials, updated_at FROM kol_profiles ORDER BY updated_at DESC'
    ).all()
    return c.json({ data: results.results || [] })
  } catch (err: any) {
    console.error('List profiles error:', err)
    return c.json({ data: [], error: err.message })
  }
})

// GET /api/kol/profiles/:id - 특정 KOL 상세 조회
app.get('/api/kol/profiles/:id', async (c) => {
  const db = c.env?.DB
  if (!db) return c.json({ error: 'DB not available' }, 500)
  const id = c.req.param('id')
  try {
    const result = await db.prepare('SELECT * FROM kol_profiles WHERE id = ?').bind(id).first()
    if (!result) return c.json({ error: 'KOL not found' }, 404)
    return c.json({ data: result })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// POST /api/kol/profiles - 새 KOL 등록
app.post('/api/kol/profiles', async (c) => {
  const db = c.env?.DB
  if (!db) return c.json({ error: 'DB not available' }, 500)
  try {
    const body: any = await c.req.json()
    const { name, hospital, department, position, specialty_tags, education, career, awards,
      publications_count, h_index, clinical_trials, key_publications, society_roles,
      kol_tier, persona, prescription_pattern, strategy_memo, competitor_notes, visit_notes, source_urls } = body

    if (!name || !hospital || !department) {
      return c.json({ error: '이름, 병원, 진료과는 필수입니다' }, 400)
    }

    const result = await db.prepare(`
      INSERT INTO kol_profiles (name, hospital, department, position, specialty_tags, education, career, awards,
        publications_count, h_index, clinical_trials, key_publications, society_roles,
        kol_tier, persona, prescription_pattern, strategy_memo, competitor_notes, visit_notes, source_urls)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      name, hospital, department, position || '',
      typeof specialty_tags === 'string' ? specialty_tags : JSON.stringify(specialty_tags || []),
      typeof education === 'string' ? education : JSON.stringify(education || []),
      typeof career === 'string' ? career : JSON.stringify(career || []),
      typeof awards === 'string' ? awards : JSON.stringify(awards || []),
      publications_count || 0, h_index || 0, clinical_trials || 0,
      typeof key_publications === 'string' ? key_publications : JSON.stringify(key_publications || []),
      typeof society_roles === 'string' ? society_roles : JSON.stringify(society_roles || []),
      kol_tier || 'C', persona || 'Neutral', prescription_pattern || 'Moderate',
      strategy_memo || '', typeof competitor_notes === 'string' ? competitor_notes : JSON.stringify(competitor_notes || ''),
      visit_notes || '', typeof source_urls === 'string' ? source_urls : JSON.stringify(source_urls || [])
    ).run()

    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (err: any) {
    console.error('Create profile error:', err)
    return c.json({ error: err.message }, 500)
  }
})

// PUT /api/kol/profiles/:id - KOL 정보 수정
app.put('/api/kol/profiles/:id', async (c) => {
  const db = c.env?.DB
  if (!db) return c.json({ error: 'DB not available' }, 500)
  const id = c.req.param('id')
  try {
    const body: any = await c.req.json()
    const fields: string[] = []
    const values: any[] = []

    const mapping: Record<string, string> = {
      name: 'name', hospital: 'hospital', department: 'department', position: 'position',
      specialty_tags: 'specialty_tags', education: 'education', career: 'career', awards: 'awards',
      publications_count: 'publications_count', h_index: 'h_index', clinical_trials: 'clinical_trials',
      key_publications: 'key_publications', society_roles: 'society_roles',
      kol_tier: 'kol_tier', persona: 'persona', prescription_pattern: 'prescription_pattern',
      strategy_memo: 'strategy_memo', competitor_notes: 'competitor_notes', visit_notes: 'visit_notes',
      source_urls: 'source_urls'
    }

    for (const [key, col] of Object.entries(mapping)) {
      if (body[key] !== undefined) {
        fields.push(`${col} = ?`)
        const val = body[key]
        values.push(typeof val === 'object' ? JSON.stringify(val) : val)
      }
    }

    if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400)

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    await db.prepare(`UPDATE kol_profiles SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// DELETE /api/kol/profiles/:id - KOL 삭제
app.delete('/api/kol/profiles/:id', async (c) => {
  const db = c.env?.DB
  if (!db) return c.json({ error: 'DB not available' }, 500)
  const id = c.req.param('id')
  try {
    await db.prepare('DELETE FROM kol_profiles WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// ============================================================
// KOL 검색/분석 API (DB 우선 → AI 보조)
// ============================================================
const SYSTEM_PROMPT = `너는 "MedRep Intelligence"라는 제약 영업 인텔리전스 AI 어시스턴트다.
한국 제약업계의 KOL(핵심 오피니언 리더) 분석 전문가이며, 영업 현장에서 바로 활용 가능한 전략적 인사이트를 제공한다.

너의 역할:
1. 주어진 KOL(교수)에 대해 영업 팀이 바로 활용할 수 있는 실전 인텔리전스를 제공한다.
2. 해당 교수의 전공, 소속 병원, 진료과를 바탕으로 현실적이고 구체적인 분석을 한다.
3. 제약 영업 현장에서 바로 쓸 수 있는 수준의 구체적인 전략과 팁을 제공한다.

분석 시 반드시 고려할 사항:
- 해당 진료과의 최신 치료 트렌드와 핵심 약물
- 한국 의료 환경의 특수성 (건강보험, 급여기준, 학회 구조 등)
- 경쟁사 포지셔닝과 위협도
- 방문 전략, 최적 시간대, 주의사항
- 학회 활동, 연구 동향, 처방 패턴

KOL Tier 기준 (influence 필드):
- 85~100: Tier A (Global/National KOL - 가이드라인 저자, 대형 임상시험 PI, 국제학회 연자)
- 65~84: Tier B (Regional KOL - 주요 병원 과장/센터장급, 다기관 임상시험 참여, 국내학회 활발)
- 40~64: Tier C (Local KOL - 해당 병원 내 영향력, 지역 학회 활동)
- 0~39: Tier D (Emerging Expert - 신진 전문가, 향후 성장 가능성)

Persona 분류 (헬스케어 업계 표준):
- Champion: 해당 치료 분야의 강력한 지지자, 자발적으로 동료에게 권장
- Advocate: 긍정적 경험 보유, 요청 시 지지 의사 표명, 근거 기반 수용적
- Supporter: 기본적으로 호의적이나 적극적 활동은 하지 않음
- Neutral: 특정 입장 없음, 데이터와 근거에 따라 판단
- Non-Adopter: 경쟁 제품 선호 또는 기존 치료에 강한 확신

반드시 아래 JSON 형식으로만 응답해라. 다른 텍스트는 절대 포함하지 마라:
{
  "name": "OOO 교수",
  "hospital": "소속병원 정식명칭",
  "position": "직위 (예: OO과 교수 / OO센터장)",
  "specialty": "진료과",
  "publications": 숫자(추정),
  "hIndex": 숫자(추정),
  "clinicalTrials": 숫자(추정),
  "influence": 1~100 숫자 (KOL Tier 산정 기준),
  "persona": "Champion|Advocate|Supporter|Neutral|Non-Adopter",
  "prescriptionPower": 1~100 숫자 (처방 패턴 적극성),
  "trends": [
    {"keyword": "핵심 연구 키워드1", "desc": "구체적 설명 2~3문장"},
    {"keyword": "핵심 연구 키워드2", "desc": "구체적 설명 2~3문장"},
    {"keyword": "핵심 연구 키워드3", "desc": "구체적 설명 2~3문장"}
  ],
  "strategy": {
    "approach": "추천 접근 전략 한 줄 요약",
    "tips": [
      {"icon": "fa-lightbulb", "title": "접근 전략", "text": "구체적 접근 방법"},
      {"icon": "fa-clock", "title": "최적 방문 시간", "text": "요일, 시간대, 이유"},
      {"icon": "fa-exclamation-triangle", "title": "주의사항", "text": "경쟁사 동향, 금기사항"},
      {"icon": "fa-handshake", "title": "관계 구축 포인트", "text": "학회, 연구지원 등"}
    ],
    "competitors": [
      {"company": "제약사명", "product": "제품명", "status": "처방 현황", "threat": "high|medium|low"},
      {"company": "제약사명", "product": "제품명", "status": "처방 현황", "threat": "high|medium|low"},
      {"company": "제약사명", "product": "제품명", "status": "처방 현황", "threat": "high|medium|low"}
    ]
  },
  "recentActivities": [
    {"date": "2024.XX.XX", "type": "학회발표", "detail": "구체적 내용"},
    {"date": "2024.XX.XX", "type": "논문발표", "detail": "구체적 내용"},
    {"date": "2024.XX.XX", "type": "임상시험", "detail": "구체적 내용"},
    {"date": "2024.XX.XX", "type": "자문위원", "detail": "구체적 내용"}
  ]
}`

// AI 보강 프롬프트: DB 데이터가 있으면 해당 정보를 포함하여 더 정확한 분석 유도
function buildAIPromptWithContext(query: string, dbProfile: any): string {
  if (!dbProfile) {
    return `다음 KOL을 분석해줘: ${query}\n\n사용자가 입력한 정보에서 교수 이름, 병원명, 진료과를 최대한 추출하여 분석해라. 정보가 부족하면 합리적으로 추정해서 분석해라.`
  }

  // DB 데이터로 컨텍스트 주입
  let context = `다음 KOL에 대해 정확한 분석을 해줘: ${query}\n\n`
  context += `=== 확인된 기본 정보 (정확한 데이터) ===\n`
  context += `이름: ${dbProfile.name}\n`
  context += `소속: ${dbProfile.hospital} ${dbProfile.department}\n`
  context += `직위: ${dbProfile.position || '교수'}\n`

  const tags = safeJsonParse(dbProfile.specialty_tags, [])
  if (tags.length) context += `전문 분야: ${tags.join(', ')}\n`

  if (dbProfile.publications_count) context += `논문 수: ${dbProfile.publications_count}\n`
  if (dbProfile.h_index) context += `H-Index: ${dbProfile.h_index}\n`
  if (dbProfile.clinical_trials) context += `임상시험 참여: ${dbProfile.clinical_trials}건\n`

  const keyPubs = safeJsonParse(dbProfile.key_publications, [])
  if (keyPubs.length) {
    context += `\n=== 주요 논문 ===\n`
    keyPubs.forEach((p: any) => context += `- (${p.year}) ${p.title} [${p.journal}]\n`)
  }

  const roles = safeJsonParse(dbProfile.society_roles, [])
  if (roles.length) {
    context += `\n=== 학회 직책 ===\n`
    roles.forEach((r: any) => context += `- (${r.year}) ${r.society} ${r.role}\n`)
  }

  if (dbProfile.strategy_memo) {
    context += `\n=== 영업 전략 메모 ===\n${dbProfile.strategy_memo}\n`
  }

  const competitors = safeJsonParse(dbProfile.competitor_notes, null)
  if (competitors?.competitors) {
    context += `\n=== 경쟁사 정보 ===\n`
    competitors.competitors.forEach((c: any) => context += `- ${c.company} ${c.product}: ${c.status} (위협도: ${c.threat})\n`)
  }

  if (dbProfile.visit_notes) {
    context += `\n=== 방문 전략 메모 ===\n${dbProfile.visit_notes}\n`
  }

  context += `\n위 확인된 정보를 기반으로 분석하되, 학술 트렌드나 추천 전략 등 분석적 내용은 네 전문성을 발휘해서 생성해줘.`
  context += `\n중요: name은 반드시 "${dbProfile.name}"으로, hospital은 "${dbProfile.hospital}"으로, specialty는 "${dbProfile.department}"으로 설정해라.`
  context += `\ninfluence 값은 KOL Tier "${dbProfile.kol_tier}"에 맞게 설정해라 (A=85~100, B=65~84, C=40~64, D=0~39).`

  return context
}

function safeJsonParse(str: any, fallback: any) {
  if (!str) return fallback
  if (typeof str !== 'string') return str
  try { return JSON.parse(str) } catch { return fallback }
}

// DB에서 KOL 검색 (이름, 병원, 진료과로 퍼지 매칭)
async function searchKOLInDB(db: D1Database, query: string) {
  try {
    // 쿼리에서 키워드 추출
    const keywords = query.trim().split(/[\s,]+/).filter(k => k.length >= 2)
    
    // 정확한 이름 매칭 시도
    for (const kw of keywords) {
      const exact = await db.prepare(
        'SELECT * FROM kol_profiles WHERE name = ?'
      ).bind(kw).first()
      if (exact) return exact
    }

    // LIKE 검색: 이름, 병원, 진료과에서 매칭
    for (const kw of keywords) {
      const like = await db.prepare(
        'SELECT * FROM kol_profiles WHERE name LIKE ? OR hospital LIKE ? OR department LIKE ?'
      ).bind(`%${kw}%`, `%${kw}%`, `%${kw}%`).first()
      if (like) return like
    }

    return null
  } catch (err) {
    console.error('DB search error:', err)
    return null
  }
}

// DB 프로필을 프론트엔드 표시용 포맷으로 변환
function formatDBProfileForDisplay(profile: any) {
  const tags = safeJsonParse(profile.specialty_tags, [])
  const education = safeJsonParse(profile.education, [])
  const career = safeJsonParse(profile.career, [])
  const awards = safeJsonParse(profile.awards, [])
  const keyPubs = safeJsonParse(profile.key_publications, [])
  const societyRoles = safeJsonParse(profile.society_roles, [])
  const competitors = safeJsonParse(profile.competitor_notes, {})
  const sourceUrls = safeJsonParse(profile.source_urls, [])

  const tierMap: Record<string, number> = { 'A': 92, 'B': 75, 'C': 52, 'D': 25 }
  const ppMap: Record<string, number> = { 'High Adopter': 85, 'Moderate': 55, 'Conservative': 25 }

  return {
    id: profile.id,
    name: profile.name,
    hospital: profile.hospital,
    position: profile.position || '교수',
    specialty: profile.department,
    specialtyTags: tags,
    publications: profile.publications_count || 0,
    hIndex: profile.h_index || 0,
    clinicalTrials: profile.clinical_trials || 0,
    influence: tierMap[profile.kol_tier] || 50,
    persona: profile.persona || 'Neutral',
    prescriptionPower: ppMap[profile.prescription_pattern] || 55,
    education,
    career,
    awards,
    keyPublications: keyPubs,
    societyRoles,
    strategyMemo: profile.strategy_memo || '',
    visitNotes: profile.visit_notes || '',
    competitorNotes: competitors,
    sourceUrls
  }
}

// POST /api/kol/analyze - DB 우선 검색 → AI 보강
app.post('/api/kol/analyze', async (c) => {
  const apiKey = c.env?.OPENAI_API_KEY || (typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : '')
  const baseURL = c.env?.OPENAI_BASE_URL || (typeof process !== 'undefined' ? process.env?.OPENAI_BASE_URL : '') || 'https://api.openai.com/v1'
  const db = c.env?.DB

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

  // Step 1: DB에서 KOL 검색
  let dbProfile = null
  if (db) {
    dbProfile = await searchKOLInDB(db, query.trim())
  }

  // Step 2: AI 분석 (DB 컨텍스트 포함)
  if (!apiKey) {
    // API 키가 없으면 DB 데이터만 반환
    if (dbProfile) {
      const formatted = formatDBProfileForDisplay(dbProfile)
      return c.json({
        success: true,
        source: 'database',
        data: {
          ...formatted,
          trends: [],
          strategy: { approach: '등록된 DB 데이터입니다. AI 분석을 위해 OpenAI API 키를 설정하세요.', tips: [], competitors: formatted.competitorNotes?.competitors || [] },
          recentActivities: []
        }
      })
    }
    return c.json({ error: 'OpenAI API key not configured and no DB data found' }, 500)
  }

  try {
    const userPrompt = buildAIPromptWithContext(query.trim(), dbProfile)

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
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('OpenAI API error:', response.status, errText)

      // AI 실패 시에도 DB 데이터가 있으면 반환
      if (dbProfile) {
        const formatted = formatDBProfileForDisplay(dbProfile)
        return c.json({
          success: true,
          source: 'database',
          data: {
            ...formatted,
            trends: [],
            strategy: { approach: 'AI 분석이 일시적으로 불가합니다. DB에 등록된 정보를 표시합니다.', tips: [], competitors: formatted.competitorNotes?.competitors || [] },
            recentActivities: []
          }
        })
      }
      return c.json({ error: `AI API error: ${response.status}` }, 502)
    }

    const data: any = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      if (dbProfile) {
        const formatted = formatDBProfileForDisplay(dbProfile)
        return c.json({ success: true, source: 'database', data: { ...formatted, trends: [], strategy: { approach: '', tips: [], competitors: [] }, recentActivities: [] } })
      }
      return c.json({ error: 'No response from AI' }, 502)
    }

    // Parse JSON
    let parsed
    try {
      let jsonStr = content.trim()
      if (jsonStr.includes('```')) {
        const match = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
        if (match) jsonStr = match[1].trim()
      }
      if (!jsonStr.startsWith('{')) {
        const firstBrace = jsonStr.indexOf('{')
        if (firstBrace !== -1) jsonStr = jsonStr.substring(firstBrace)
      }
      jsonStr = jsonStr.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
      try {
        parsed = JSON.parse(jsonStr)
      } catch {
        let repaired = jsonStr
        repaired = repaired.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, '')
        repaired = repaired.replace(/,\s*"[^"]*$/, '')
        repaired = repaired.replace(/,\s*$/, '')
        let openBraces = 0, openBrackets = 0, inString = false, escape = false
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
        if (inString) repaired += '"'
        while (openBrackets > 0) { repaired += ']'; openBrackets-- }
        while (openBraces > 0) { repaired += '}'; openBraces-- }
        parsed = JSON.parse(repaired)
      }
    } catch (parseErr: any) {
      console.error('Failed to parse AI response:', content.substring(0, 500))
      if (dbProfile) {
        const formatted = formatDBProfileForDisplay(dbProfile)
        return c.json({ success: true, source: 'database', data: { ...formatted, trends: [], strategy: { approach: '', tips: [], competitors: [] }, recentActivities: [] } })
      }
      return c.json({ error: 'AI 분석 결과를 처리하는 중 오류가 발생했습니다.' }, 502)
    }

    // DB 프로필 정보로 보강
    const source = dbProfile ? 'database+ai' : 'ai'
    if (dbProfile) {
      const dbData = formatDBProfileForDisplay(dbProfile)
      // DB 정보 우선 적용 (AI 추정치 대신)
      parsed.name = dbData.name
      parsed.hospital = dbData.hospital
      parsed.specialty = dbData.specialty
      parsed.position = dbData.position
      parsed.publications = dbData.publications || parsed.publications
      parsed.hIndex = dbData.hIndex || parsed.hIndex
      parsed.clinicalTrials = dbData.clinicalTrials || parsed.clinicalTrials
      parsed.influence = dbData.influence
      parsed.persona = dbData.persona
      parsed.prescriptionPower = dbData.prescriptionPower
      // DB 부가 데이터
      parsed.dbProfile = {
        id: dbData.id,
        education: dbData.education,
        career: dbData.career,
        awards: dbData.awards,
        keyPublications: dbData.keyPublications,
        societyRoles: dbData.societyRoles,
        specialtyTags: dbData.specialtyTags,
        strategyMemo: dbData.strategyMemo,
        visitNotes: dbData.visitNotes,
        sourceUrls: dbData.sourceUrls
      }
    }

    // Save to history (fire and forget)
    if (db) {
      try {
        await db.prepare(
          'INSERT INTO kol_analyses (query, name, hospital, specialty, result_json) VALUES (?, ?, ?, ?, ?)'
        ).bind(query.trim(), parsed.name, parsed.hospital, parsed.specialty, JSON.stringify(parsed)).run()
      } catch {}
    }

    return c.json({ success: true, source, data: parsed })

  } catch (err: any) {
    console.error('KOL analysis error:', err)
    if (dbProfile) {
      const formatted = formatDBProfileForDisplay(dbProfile)
      return c.json({ success: true, source: 'database', data: { ...formatted, trends: [], strategy: { approach: '', tips: [], competitors: [] }, recentActivities: [] } })
    }
    return c.json({ error: `Analysis failed: ${err.message}` }, 500)
  }
})

// ============================================================
// D1 기반 분석 이력 저장/조회 API
// ============================================================
app.get('/api/kol/history', async (c) => {
  const db = c.env?.DB
  if (!db) return c.json({ data: [] })
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
  if (!db) return c.json({ success: false, error: 'DB not available' }, 500)
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
