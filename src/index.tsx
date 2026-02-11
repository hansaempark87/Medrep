import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  OPENAI_API_KEY: string
  OPENAI_BASE_URL: string
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors())

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', service: 'MedRep Intelligence', version: '4.0.0' })
})

// ============================================================
// KOL 프로필 CRUD API
// ============================================================
app.get('/api/kol/profiles', async (c) => {
  const db = c.env?.DB
  if (!db) return c.json({ data: [] })
  try {
    const results = await db.prepare(
      'SELECT id, name, hospital, department, position, kol_tier, persona, prescription_pattern, specialty_tags, publications_count, h_index, clinical_trials, updated_at FROM kol_profiles ORDER BY updated_at DESC'
    ).all()
    return c.json({ data: results.results || [] })
  } catch (err: any) {
    return c.json({ data: [], error: err.message })
  }
})

app.get('/api/kol/profiles/:id', async (c) => {
  const db = c.env?.DB
  if (!db) return c.json({ error: 'DB not available' }, 500)
  try {
    const result = await db.prepare('SELECT * FROM kol_profiles WHERE id = ?').bind(c.req.param('id')).first()
    if (!result) return c.json({ error: 'KOL not found' }, 404)
    return c.json({ data: result })
  } catch (err: any) { return c.json({ error: err.message }, 500) }
})

app.post('/api/kol/profiles', async (c) => {
  const db = c.env?.DB
  if (!db) return c.json({ error: 'DB not available' }, 500)
  try {
    const b: any = await c.req.json()
    if (!b.name || !b.hospital || !b.department) return c.json({ error: '이름, 병원, 진료과는 필수입니다' }, 400)
    const s = (v: any) => typeof v === 'object' ? JSON.stringify(v) : (v || '')
    const result = await db.prepare(`
      INSERT INTO kol_profiles (name, hospital, department, position, specialty_tags, education, career, awards,
        publications_count, h_index, clinical_trials, key_publications, society_roles,
        kol_tier, persona, prescription_pattern, strategy_memo, visit_notes, source_urls,
        clinic_schedule, treatment_philosophy, treatment_preferences, media_appearances, research_focus, books_patents)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      b.name, b.hospital, b.department, b.position||'',
      s(b.specialty_tags), s(b.education), s(b.career), s(b.awards),
      b.publications_count||0, b.h_index||0, b.clinical_trials||0,
      s(b.key_publications), s(b.society_roles),
      b.kol_tier||'C', b.persona||'Neutral', b.prescription_pattern||'Moderate',
      b.strategy_memo||'', b.visit_notes||'', s(b.source_urls),
      s(b.clinic_schedule), b.treatment_philosophy||'', s(b.treatment_preferences),
      s(b.media_appearances), b.research_focus||'', s(b.books_patents)
    ).run()
    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (err: any) { return c.json({ error: err.message }, 500) }
})

app.put('/api/kol/profiles/:id', async (c) => {
  const db = c.env?.DB
  if (!db) return c.json({ error: 'DB not available' }, 500)
  try {
    const b: any = await c.req.json()
    const fields: string[] = [], values: any[] = []
    const cols = ['name','hospital','department','position','specialty_tags','education','career','awards',
      'publications_count','h_index','clinical_trials','key_publications','society_roles',
      'kol_tier','persona','prescription_pattern','strategy_memo','visit_notes','source_urls',
      'clinic_schedule','treatment_philosophy','treatment_preferences','media_appearances','research_focus','books_patents']
    for (const col of cols) {
      if (b[col] !== undefined) {
        fields.push(`${col} = ?`)
        values.push(typeof b[col] === 'object' ? JSON.stringify(b[col]) : b[col])
      }
    }
    if (!fields.length) return c.json({ error: 'No fields to update' }, 400)
    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(c.req.param('id'))
    await db.prepare(`UPDATE kol_profiles SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
    return c.json({ success: true })
  } catch (err: any) { return c.json({ error: err.message }, 500) }
})

app.delete('/api/kol/profiles/:id', async (c) => {
  const db = c.env?.DB
  if (!db) return c.json({ error: 'DB not available' }, 500)
  try {
    await db.prepare('DELETE FROM kol_profiles WHERE id = ?').bind(c.req.param('id')).run()
    return c.json({ success: true })
  } catch (err: any) { return c.json({ error: err.message }, 500) }
})

// ============================================================
// 유틸리티
// ============================================================
function jp(str: any, fb: any) {
  if (!str) return fb
  if (typeof str !== 'string') return str
  try { return JSON.parse(str) } catch { return fb }
}

async function searchKOLInDB(db: D1Database, query: string) {
  try {
    const kws = query.trim().split(/[\s,]+/).filter(k => k.length >= 2)
    for (const kw of kws) {
      const r = await db.prepare('SELECT * FROM kol_profiles WHERE name = ?').bind(kw).first()
      if (r) return r
    }
    for (const kw of kws) {
      const r = await db.prepare('SELECT * FROM kol_profiles WHERE name LIKE ? OR hospital LIKE ? OR department LIKE ?')
        .bind(`%${kw}%`, `%${kw}%`, `%${kw}%`).first()
      if (r) return r
    }
    return null
  } catch { return null }
}

function formatProfile(p: any) {
  return {
    id: p.id,
    name: p.name, hospital: p.hospital, position: p.position||'교수', specialty: p.department,
    specialtyTags: jp(p.specialty_tags, []),
    publications: p.publications_count||0, hIndex: p.h_index||0, clinicalTrials: p.clinical_trials||0,
    kolTier: p.kol_tier||'C',
    persona: p.persona||'Neutral',
    prescriptionPattern: p.prescription_pattern||'Moderate',
    education: jp(p.education, []),
    career: jp(p.career, []),
    awards: jp(p.awards, []),
    keyPublications: jp(p.key_publications, []),
    societyRoles: jp(p.society_roles, []),
    strategyMemo: p.strategy_memo||'',
    visitNotes: p.visit_notes||'',
    sourceUrls: jp(p.source_urls, []),
    clinicSchedule: jp(p.clinic_schedule, null),
    treatmentPhilosophy: p.treatment_philosophy||'',
    treatmentPreferences: jp(p.treatment_preferences, []),
    mediaAppearances: jp(p.media_appearances, []),
    researchFocus: p.research_focus||'',
    booksPatents: jp(p.books_patents, [])
  }
}

// ============================================================
// AI 프롬프트: DB 데이터 기반 실전 접근 전략 생성
// ============================================================
const SYSTEM_PROMPT_DB = `너는 한국 제약/의료기기 영업 현장에서 즉시 활용 가능한 실전 접근 전략 생성 AI다.

역할:
- 제공된 KOL의 실제 프로필 데이터(경력, 연구, 치료성향, 진료일정, 미디어 발언 등)를 분석
- 영업 담당자가 이 KOL에게 처음 방문하거나 관계를 유지할 때 바로 쓸 수 있는 전략 도출

핵심 원칙:
1. 제공된 실제 데이터에서만 인사이트를 추출하라. 확인되지 않은 정보 생성 금지.
2. 이 KOL의 치료 성향, 연구 관심사, 미디어 발언에서 영업 접근 포인트를 구체적으로 도출하라.
3. "무엇을 어떻게 말할지" 수준의 액션 아이템으로 제시하라.
4. 경쟁사 정보는 포함하지 마라. 순수하게 이 KOL에 대한 접근법에만 집중하라.

반드시 아래 JSON으로만 응답:
{
  "oneLiner": "이 KOL을 한 마디로 정의 (예: '배뇨장애 분야 가이드라인 저자, 데이터 기반 의사결정자')",
  "approachStrategy": "핵심 접근 전략 2~3문장 요약",
  "keyInsights": [
    "이 KOL에 대해 영업 담당자가 반드시 알아야 할 핵심 인사이트 1",
    "핵심 인사이트 2",
    "핵심 인사이트 3"
  ],
  "actionItems": [
    {"icon":"fa-calendar-check","title":"최적 방문 시점","text":"구체적 설명 2~3문장 (진료일정 기반)"},
    {"icon":"fa-comments","title":"첫 미팅 대화 주제","text":"구체적 설명 (연구/발언 기반)"},
    {"icon":"fa-file-medical","title":"준비할 자료","text":"구체적 설명 (치료성향 기반)"},
    {"icon":"fa-handshake","title":"관계 유지 방법","text":"구체적 설명 (학회/활동 기반)"}
  ],
  "talkingPoints": ["미팅 시 꺼낼 수 있는 구체적 대화 포인트 1","대화 포인트 2","대화 포인트 3"],
  "doList": ["반드시 하세요 1","반드시 하세요 2","반드시 하세요 3"],
  "dontList": ["절대 하지 마세요 1","절대 하지 마세요 2","절대 하지 마세요 3"],
  "preparationChecklist": ["방문 전 준비 체크리스트 1","체크리스트 2","체크리스트 3"]
}`

const SYSTEM_PROMPT_AI_ONLY = `너는 한국 제약 영업 현장의 KOL 초기 프로파일링 AI다.

역할: 사용자가 검색한 KOL에 대해 공개적으로 알려진 정보를 바탕으로 초기 프로필을 생성한다.

중요 원칙:
- 모든 정보가 AI 추정치임을 명확히 하라. 확인되지 않은 정보는 "확인 필요"로 표시.
- 경쟁사 정보 포함 금지.
- 실제 DB에 등록하면 정확한 분석이 가능함을 안내.

반드시 아래 JSON으로만 응답:
{
  "name": "교수명",
  "hospital": "병원명 (확인 필요 시 명시)",
  "position": "직위",
  "specialty": "진료과",
  "specialtyTags": ["전문 분야 추정 1","전문 분야 추정 2"],
  "publications": 0,
  "hIndex": 0,
  "clinicalTrials": 0,
  "kolTier": "C",
  "persona": "Neutral",
  "researchFocus": "주요 연구 관심사 추정 (2~3문장)",
  "treatmentPhilosophy": "추정되는 치료 철학/성향",
  "oneLiner": "이 KOL 한 마디 요약",
  "approachStrategy": "추천 접근 전략 2~3문장",
  "keyInsights": ["핵심 인사이트 추정 1","핵심 인사이트 추정 2"],
  "actionItems": [
    {"icon":"fa-lightbulb","title":"제목","text":"구체적 설명"}
  ],
  "caveat": "이 결과는 AI 추정입니다. KOL 데이터베이스에 실제 정보를 등록하면 진료일정, 치료성향, 논문분석, 미디어 발언 기반의 정확한 접근 전략을 제공합니다."
}`

function buildContextPrompt(query: string, p: any): string {
  let ctx = `다음 KOL의 실제 프로필 데이터를 기반으로 영업 접근 전략을 생성해줘.\n\n`
  ctx += `=== 기본 정보 ===\n이름: ${p.name}\n소속: ${p.hospital} ${p.department}\n직위: ${p.position}\nKOL 등급: Tier ${p.kol_tier}\nPersona: ${p.persona}\n처방 패턴: ${p.prescription_pattern}\n`

  const tags = jp(p.specialty_tags, [])
  if (tags.length) ctx += `전문 분야: ${tags.join(', ')}\n`

  if (p.research_focus) ctx += `\n=== 연구 관심사 ===\n${p.research_focus}\n`
  if (p.treatment_philosophy) ctx += `\n=== 치료 철학/성향 ===\n${p.treatment_philosophy}\n`

  const tp = jp(p.treatment_preferences, [])
  if (tp.length) {
    ctx += `\n=== 치료 선호도 (질환별) ===\n`
    tp.forEach((t: any) => ctx += `[${t.category}] ${t.preference}: ${t.detail}\n`)
  }

  const media = jp(p.media_appearances, [])
  if (media.length) {
    ctx += `\n=== 미디어 출연/발언 (실제 확인된 내용) ===\n`
    media.forEach((m: any) => {
      ctx += `- ${m.type}: "${m.title}"${m.url ? ' ('+m.url+')' : ''}\n`
      if (m.key_points?.length) m.key_points.forEach((kp: string) => ctx += `  • ${kp}\n`)
    })
  }

  const pubs = jp(p.key_publications, [])
  if (pubs.length) {
    ctx += `\n=== 주요 논문 (실제 확인된 내용) ===\n`
    pubs.forEach((pub: any) => ctx += `- (${pub.year}) ${pub.title} [${pub.journal}]${pub.note ? ' — '+pub.note : ''}\n`)
  }

  const roles = jp(p.society_roles, [])
  if (roles.length) {
    ctx += `\n=== 학회 직책 ===\n`
    roles.forEach((r: any) => ctx += `- (${r.year}) ${r.society} ${r.role}\n`)
  }

  const books = jp(p.books_patents, [])
  if (books.length) {
    ctx += `\n=== 저서/가이드라인 ===\n`
    books.forEach((b: any) => ctx += `- (${b.year}) ${b.title} [${b.type}]\n`)
  }

  if (p.strategy_memo) ctx += `\n=== 기존 영업 전략 메모 ===\n${p.strategy_memo}\n`
  if (p.visit_notes) ctx += `\n=== 방문 전략 메모 ===\n${p.visit_notes}\n`

  const sched = jp(p.clinic_schedule, null)
  if (sched) {
    ctx += `\n=== 진료 일정 ===\n`
    const days = ['mon','tue','wed','thu','fri']
    const labels = ['월','화','수','목','금']
    days.forEach((d,i) => {
      const am = sched[`${d}_am`]
      const pm = sched[`${d}_pm`]
      if (am || pm) ctx += `${labels[i]}: 오전 ${am||'없음'} / 오후 ${pm||'없음'}\n`
    })
    if (sched.note) ctx += `참고: ${sched.note}\n`
  }

  const edu = jp(p.education, [])
  if (edu.length) {
    ctx += `\n=== 학력 ===\n`
    edu.forEach((e: any) => ctx += `- ${e.year} ${e.school} ${e.degree}\n`)
  }

  const career = jp(p.career, [])
  if (career.length) {
    ctx += `\n=== 주요 경력 ===\n`
    career.slice(-5).forEach((c: any) => ctx += `- ${c.period} ${c.institution} ${c.role}\n`)
  }

  ctx += `\n위 정보를 종합하여, 이 KOL에게 접근할 때 가장 효과적인 전략을 생성해줘.
특히:
1. 이 교수의 치료 성향과 연구 관심사에 맞는 구체적 접근법
2. 미디어 발언에서 파악된 핵심 가치관을 활용한 대화 전략
3. 진료 일정을 고려한 최적 방문 시점
4. 학회/저서 활동을 활용한 관계 구축 방법
경쟁사 언급 없이, 순수하게 이 KOL 접근에만 집중해라.`
  return ctx
}

// ============================================================
// POST /api/kol/analyze — DB 우선 → AI 접근전략 생성
// ============================================================
app.post('/api/kol/analyze', async (c) => {
  const apiKey = c.env?.OPENAI_API_KEY || (typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : '')
  const baseURL = c.env?.OPENAI_BASE_URL || (typeof process !== 'undefined' ? process.env?.OPENAI_BASE_URL : '') || 'https://api.openai.com/v1'
  const db = c.env?.DB

  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid request body' }, 400) }
  const { query } = body
  if (!query || typeof query !== 'string' || query.trim().length < 2) return c.json({ error: 'Invalid query' }, 400)

  // Step 1: DB 검색
  let dbProfile = null
  if (db) dbProfile = await searchKOLInDB(db, query.trim())

  // DB 데이터 존재 시: DB 프로필 + AI 접근 전략
  if (dbProfile) {
    const formatted = formatProfile(dbProfile)
    let aiStrategy = null

    if (apiKey) {
      try {
        const resp = await fetch(`${baseURL}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-5-mini',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT_DB },
              { role: 'user', content: buildContextPrompt(query.trim(), dbProfile) }
            ],
            max_tokens: 4000, temperature: 0.6, response_format: { type: 'json_object' }
          })
        })
        if (resp.ok) {
          const d: any = await resp.json()
          const content = d.choices?.[0]?.message?.content
          if (content) aiStrategy = safeParseJSON(content)
        }
      } catch (err) { console.error('AI strategy error:', err) }
    }

    // 이력 저장
    if (db) {
      try {
        await db.prepare('INSERT INTO kol_analyses (query, name, hospital, specialty, result_json) VALUES (?,?,?,?,?)')
          .bind(query.trim(), formatted.name, formatted.hospital, formatted.specialty, JSON.stringify({...formatted, aiStrategy})).run()
      } catch {}
    }

    return c.json({ success: true, source: 'database', data: formatted, aiStrategy })
  }

  // DB에 없는 경우: AI 전체 추정
  if (!apiKey) return c.json({ error: 'KOL이 DB에 등록되지 않았고, AI API 키도 없습니다. KOL 데이터베이스에 먼저 등록해주세요.' }, 404)

  try {
    const resp = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_AI_ONLY },
          { role: 'user', content: `다음 KOL을 분석해줘: ${query.trim()}` }
        ],
        max_tokens: 3000, temperature: 0.7, response_format: { type: 'json_object' }
      })
    })
    if (!resp.ok) return c.json({ error: `AI API error: ${resp.status}` }, 502)
    const d: any = await resp.json()
    const content = d.choices?.[0]?.message?.content
    if (!content) return c.json({ error: 'No AI response' }, 502)
    const parsed = safeParseJSON(content)
    if (!parsed) return c.json({ error: 'AI 결과 파싱 실패' }, 502)
    return c.json({ success: true, source: 'ai', data: parsed })
  } catch (err: any) {
    return c.json({ error: `Analysis failed: ${err.message}` }, 500)
  }
})

function safeParseJSON(content: string) {
  try {
    let s = content.trim()
    if (s.includes('```')) { const m = s.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/); if (m) s = m[1].trim() }
    if (!s.startsWith('{')) { const i = s.indexOf('{'); if (i !== -1) s = s.substring(i) }
    s = s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
    try { return JSON.parse(s) } catch {
      let r = s.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, '').replace(/,\s*"[^"]*$/, '').replace(/,\s*$/, '')
      let ob=0,oq=0,ins=false,esc=false
      for (const ch of r) { if(esc){esc=false;continue} if(ch==='\\'){esc=true;continue} if(ch==='"'){ins=!ins;continue} if(ins)continue; if(ch==='{')ob++; if(ch==='}')ob--; if(ch==='[')oq++; if(ch===']')oq-- }
      if(ins) r+='"'; while(oq>0){r+=']';oq--} while(ob>0){r+='}';ob--}
      return JSON.parse(r)
    }
  } catch { return null }
}

// ============================================================
// 분석 이력
// ============================================================
app.get('/api/kol/history', async (c) => {
  const db = c.env?.DB
  if (!db) return c.json({ data: [] })
  try {
    const r = await db.prepare('SELECT * FROM kol_analyses ORDER BY created_at DESC LIMIT 20').all()
    return c.json({ data: r.results || [] })
  } catch { return c.json({ data: [] }) }
})

export default app
