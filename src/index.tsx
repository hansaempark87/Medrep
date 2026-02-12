import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = { OPENAI_API_KEY: string; OPENAI_BASE_URL: string }
const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors())

app.get('/api/health', (c) => c.json({ status: 'ok', version: '9.0' }))

// ============================================================
// PROMPT 1: 약품 → KOL 타겟 랭킹 (간결화)
// ============================================================
const DRUG_PROMPT = `한국 제약 영업 전략 전문가. 약품명→KOL 6~8명 즉시 JSON 응답.

절대규칙:
- kols 배열 6~8명 필수. 0명 금지
- 서울대/세브란스/삼성서울/아산/서울성모 등 주요 대학병원 교수
- "추정","확인필요","~보임","~수있음" 금지. 단정 서술
- 경쟁사 금지. drugInfo+kols만. 다른 필드/질문/요청 금지

{"drugInfo":{"genericName":"성분명","drugClass":"분류","indication":"적응증(15자)","therapyArea":"영역(5자)"},"kols":[{"rank":1,"score":95,"name":"이름","hospital":"병원","department":"과","tier":"A","reason":"10자","tip":"10자"}]}`

// ============================================================
// PROMPT 2: KOL 상세 (간결화, media/societies/research/sources 제거)
// ============================================================
const KOL_PROMPT = `한국 제약 영업 전략 전문가. KOL 상세 프로필+전략 즉시 JSON 응답.

절대규칙:
- "추정","확인필요","~보임","~수있음" 금지. 단정 서술
- 경쟁사 금지. 질문/요청 금지. JSON만 응답
- 각 필드 10자 이내 간결 서술

{"name":"이름","hospital":"병원","department":"과","position":"직위","tags":["전문1"],"schedule":{"mon":{"am":"외래","pm":"-"},"tue":{"am":"-","pm":"외래"},"wed":{"am":"외래","pm":"-"},"thu":{"am":"-","pm":"-"},"fri":{"am":"외래","pm":"-"},"visitTip":"10자"},"philosophy":"10자","preferences":[{"condition":"질환","approach":"10자"}],"publications":[{"title":"논문제목","journal":"저널","year":"2024"}],"strategy":{"summary":"15자","actions":[{"icon":"clock","title":"방문","text":"10자"},{"icon":"comment","title":"화제","text":"10자"},{"icon":"file","title":"자료","text":"10자"}],"do":["10자"],"dont":["10자"]}}`

// ============================================================
// Utilities
// ============================================================
function parseJSON(content: string): any {
  if (!content?.trim()) return null
  let s = content.trim()
  if (s.includes('```')) { const m = s.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/); if (m) s = m[1].trim() }
  if (!s.startsWith('{') && !s.startsWith('[')) { const i = s.indexOf('{'); if (i >= 0) s = s.substring(i); else return null }
  s = s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
  try { return JSON.parse(s) } catch {}
  // 잘린 JSON 복구: 불완전한 마지막 키-값 제거 후 괄호 닫기
  let r = s
  // 잘린 문자열/값 패턴 제거
  r = r.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/s, '')
    .replace(/,\s*"[^"]*"\s*:\s*\[\s*"[^"]*$/s, '')
    .replace(/,\s*"[^"]*"\s*:\s*\[?\s*$/s, '')
    .replace(/,\s*"[^"]*"\s*:\s*\{[^}]*$/s, '')
    .replace(/,\s*"[^"]*$/s, '')
    .replace(/,\s*$/s, '')
  // 잘린 배열 항목 제거
  r = r.replace(/,\s*\{[^}]*$/s, '')
  let ob=0,oq=0,ins=false,esc=false
  for(const c of r){if(esc){esc=false;continue}if(c==='\\'){esc=true;continue}if(c==='"'){ins=!ins;continue}if(ins)continue;if(c==='{')ob++;if(c==='}')ob--;if(c==='[')oq++;if(c===']')oq--}
  if(ins)r+='"'; r=r.replace(/,\s*$/s,''); while(oq>0){r+=']';oq--} while(ob>0){r+='}';ob--}
  try { return JSON.parse(r) } catch {}
  return null
}

async function ai(env: any, sys: string, msg: string, tokens = 5000) {
  const key = (env?.OPENAI_API_KEY || '').trim()
  const base = (env?.OPENAI_BASE_URL || 'https://api.openai.com/v1').trim()
  if (!key) throw new Error('API키 미설정')
  const r = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model:'gpt-5-mini', messages:[{role:'system',content:sys},{role:'user',content:msg}], max_tokens:tokens, temperature:0.3, response_format:{type:'json_object'} })
  })
  if (!r.ok) { const t = await r.text(); throw new Error(`API ${r.status}: ${t.substring(0,200)}`) }
  const d: any = await r.json()
  const c = d.choices?.[0]?.message?.content
  if (!c) throw new Error('응답부족(토큰초과)')
  const p = parseJSON(c)
  if (!p) throw new Error(`분석 실패: JSON 파싱 실패 (응답 길이: ${c.length}자, 시작: ${c.substring(0, 80)}...)`)
  return p
}

// ============================================================
// API Routes
// ============================================================
app.post('/api/drug/analyze', async (c) => {
  let b: any; try { b = await c.req.json() } catch { return c.json({error:'잘못된 요청'},400) }
  const { drug } = b
  if (!drug || drug.trim().length < 2) return c.json({error:'약품명 2글자 이상'},400)
  try {
    const r = await ai(c.env, DRUG_PROMPT, `약품: ${drug.trim()}`, 4000)
    if (r.kols?.length) { r.kols.sort((a:any,b:any)=>(b.score||0)-(a.score||0)); r.kols.forEach((k:any,i:number)=>{k.rank=i+1}) }
    return c.json({success:true, data:r})
  } catch (e:any) { return c.json({error:e.message},500) }
})

app.post('/api/kol/detail', async (c) => {
  let b: any; try { b = await c.req.json() } catch { return c.json({error:'잘못된 요청'},400) }
  const { name, hospital, department, drug, drugInfo } = b
  if (!name) return c.json({error:'이름 필요'},400)
  const ctx = drugInfo ? `\n약물: ${drugInfo.genericName||drug||''} (${drugInfo.drugClass||''}) - ${drugInfo.indication||''}` : drug ? `\n약물: ${drug}` : ''
  try {
    const r = await ai(c.env, KOL_PROMPT, `KOL: ${name}, ${hospital||''}, ${department||''}${ctx}`, 4000)
    return c.json({success:true, data:r})
  } catch (e:any) { return c.json({error:e.message},500) }
})

// ============================================================
// Frontend (간결 UI)
// ============================================================
app.get('/', (c) => c.html(HTML))

const HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KOL Targeting</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap');
*{font-family:'Noto Sans KR',sans-serif;box-sizing:border-box}
body{background:#0f172a;color:#e2e8f0;min-height:100vh;margin:0}
.card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:10px;transition:.15s}
.card:hover{border-color:rgba(59,130,246,.25)}
.chip{display:inline-flex;align-items:center;padding:1px 8px;border-radius:20px;font-size:11px;font-weight:500}
.tier-A{background:#b45309;color:#fef3c7} .tier-B{background:#1d4ed8;color:#dbeafe} .tier-C{background:#4b5563;color:#e5e7eb}
.anim{animation:up .3s ease-out}
@keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.skel{background:linear-gradient(90deg,rgba(255,255,255,.03) 25%,rgba(255,255,255,.07) 50%,rgba(255,255,255,.03) 75%);background-size:200% 100%;animation:sh 1.2s infinite}
@keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
.ring{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0}
.tab{padding:5px 12px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;color:#64748b;transition:.15s}
.tab.on{background:rgba(59,130,246,.15);color:#93c5fd}
.tag{font-size:10px;padding:1px 6px;border-radius:10px;background:rgba(59,130,246,.1);color:#93c5fd}
.tc{display:none}.tc.on{display:block}
.progress{height:3px;background:rgba(59,130,246,.15);border-radius:2px;overflow:hidden;margin-top:8px}
.progress-bar{height:100%;background:#3b82f6;border-radius:2px;animation:prog 20s linear}
@keyframes prog{from{width:0}to{width:100%}}
</style>
</head>
<body>

<header class="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-white/5">
  <div class="max-w-4xl mx-auto px-4 h-11 flex items-center gap-2">
    <div class="w-6 h-6 rounded bg-blue-600 flex items-center justify-center"><i class="fas fa-crosshairs text-white text-[10px]"></i></div>
    <span class="font-bold text-white text-sm cursor-pointer" onclick="goHome()">KOL Targeting</span>
    <div id="bc" class="text-[11px] text-gray-600 ml-1"></div>
  </div>
</header>

<main class="max-w-4xl mx-auto px-4 py-4">

<!-- S1: Search -->
<div id="s1" class="anim">
  <div class="text-center mt-16 mb-6">
    <h2 class="text-2xl font-bold text-white mb-1">약품명으로 KOL 찾기</h2>
    <p class="text-gray-600 text-xs">약품 입력 → 핵심 타겟 KOL 랭킹</p>
  </div>
  <div class="max-w-md mx-auto mb-4">
    <div class="relative">
      <i class="fas fa-pills absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-sm"></i>
      <input id="inp" type="text" placeholder="예: 피타바스타틴" class="w-full pl-9 pr-16 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500" onkeydown="if(event.key==='Enter')go()">
      <button onclick="go()" class="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-500">분석</button>
    </div>
  </div>
  <div class="flex flex-wrap justify-center gap-1.5 mb-16">
    <span class="chip bg-white/5 text-gray-500 cursor-pointer hover:text-blue-300" onclick="q('피타바스타틴')">피타바스타틴</span>
    <span class="chip bg-white/5 text-gray-500 cursor-pointer hover:text-blue-300" onclick="q('엠파글리플로진')">엠파글리플로진</span>
    <span class="chip bg-white/5 text-gray-500 cursor-pointer hover:text-blue-300" onclick="q('엔잘루타마이드')">엔잘루타마이드</span>
    <span class="chip bg-white/5 text-gray-500 cursor-pointer hover:text-blue-300" onclick="q('펨브롤리주맙')">펨브롤리주맙</span>
    <span class="chip bg-white/5 text-gray-500 cursor-pointer hover:text-blue-300" onclick="q('미라베그론')">미라베그론</span>
  </div>
</div>

<!-- S2: KOL List -->
<div id="s2" class="hidden"></div>

<!-- S3: KOL Detail -->
<div id="s3" class="hidden"></div>

</main>

<script>
let D=null,DRUG='';
const $=id=>document.getElementById(id);
function show(n){['s1','s2','s3'].forEach((s,i)=>$(s).classList.toggle('hidden',i!==n-1));window.scrollTo(0,0)}
function goHome(){D=null;DRUG='';show(1);$('bc').innerHTML='';$('inp').value=''}
function goList(){if(D)renderList(D),show(2)}
function q(d){$('inp').value=d;go()}

function skelList(){
  $('s2').innerHTML='<div class="space-y-2 mt-2">'+Array(4).fill(0).map(()=>'<div class="card p-3"><div class="flex gap-2.5"><div class="skel w-9 h-9 rounded-full"></div><div class="flex-1 space-y-1.5"><div class="skel h-3.5 w-32 rounded"></div><div class="skel h-2.5 w-52 rounded"></div></div></div></div>').join('')+'<div class="progress"><div class="progress-bar"></div></div><p class="text-center text-gray-600 text-[11px] mt-2">AI가 KOL을 분석 중...</p></div>';
  show(2);
}
function skelDetail(){
  $('s3').innerHTML='<div class="space-y-3 mt-2"><div class="card p-4"><div class="flex gap-3"><div class="skel w-12 h-12 rounded-lg"></div><div class="flex-1 space-y-1.5"><div class="skel h-4 w-32 rounded"></div><div class="skel h-3 w-48 rounded"></div></div></div></div><div class="card p-4 space-y-2"><div class="skel h-3 w-24 rounded"></div><div class="skel h-2.5 w-full rounded"></div><div class="skel h-2.5 w-3/4 rounded"></div></div><div class="progress"><div class="progress-bar"></div></div><p class="text-center text-gray-600 text-[11px] mt-2">상세 정보 분석 중...</p></div>';
  show(3);
}

async function go(){
  const d=$('inp').value.trim();if(!d||d.length<2)return;
  DRUG=d;skelList();
  $('bc').innerHTML=\`<span class="cursor-pointer hover:text-gray-400" onclick="goHome()">홈</span> › \${d}\`;
  try{
    const r=await(await fetch('/api/drug/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({drug:d})})).json();
    if(!r.success)throw new Error(r.error);
    D=r.data;renderList(r.data);
  }catch(e){$('s2').innerHTML=\`<div class="text-center mt-12"><p class="text-red-400 text-sm">\${e.message}</p><button onclick="goHome()" class="mt-3 text-xs text-gray-500 hover:text-white">다시 시도</button></div>\`}
}

function renderList(data){
  const di=data.drugInfo||{};
  const kols=data.kols||[];
  $('bc').innerHTML=\`<span class="cursor-pointer hover:text-gray-400" onclick="goHome()">홈</span> › \${di.genericName||DRUG}\`;
  $('s2').innerHTML=\`<div class="anim">
    <div class="flex items-center gap-2 mb-3">
      <div class="w-7 h-7 rounded bg-blue-600/20 flex items-center justify-center"><i class="fas fa-pills text-blue-400 text-xs"></i></div>
      <span class="text-white font-semibold text-sm">\${di.genericName||DRUG}</span>
      <span class="text-gray-600 text-xs">\${di.drugClass||''}</span>
      <div class="flex-1"></div>
      <span class="tag">\${di.therapyArea||''}</span>
    </div>
    <p class="text-gray-500 text-[11px] mb-3">\${di.indication||''}</p>
    <div class="text-[11px] text-gray-600 mb-2">KOL \${kols.length}명 · 관련도순</div>
    <div class="space-y-1.5">
    \${kols.map((k,i)=>\`
      <div class="card p-3 cursor-pointer anim" style="animation-delay:\${i*40}ms" onclick='detail(\${JSON.stringify(k).replace(/'/g,"&#39;")})'>
        <div class="flex items-center gap-2.5">
          <div class="ring \${k.score>=85?'bg-green-500/15 text-green-400':k.score>=70?'bg-yellow-500/15 text-yellow-400':'bg-gray-500/15 text-gray-400'}">\${k.score}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-white font-semibold text-[13px]">\${k.name}</span>
              <span class="chip tier-\${k.tier||'C'} text-[9px]">\${k.tier||'?'}</span>
            </div>
            <p class="text-gray-500 text-[11px] truncate">\${k.hospital||''} · \${k.department||''}</p>
          </div>
          <i class="fas fa-chevron-right text-gray-700 text-xs"></i>
        </div>
      </div>
    \`).join('')}
    </div>
  </div>\`;
}

async function detail(kol){
  skelDetail();
  $('bc').innerHTML=\`<span class="cursor-pointer hover:text-gray-400" onclick="goHome()">홈</span> › <span class="cursor-pointer hover:text-gray-400" onclick="goList()">\${D?.drugInfo?.genericName||DRUG}</span> › \${kol.name}\`;
  try{
    const r=await(await fetch('/api/kol/detail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:kol.name,hospital:kol.hospital,department:kol.department,drug:DRUG,drugInfo:D?.drugInfo})})).json();
    if(!r.success)throw new Error(r.error);
    renderDetail(r.data,kol);
  }catch(e){$('s3').innerHTML=\`<div class="text-center mt-12"><p class="text-red-400 text-sm">\${e.message}</p><button onclick="goList()" class="mt-3 text-xs text-gray-500 hover:text-white">목록으로</button></div>\`}
}

function renderDetail(d,lk){
  const sc=d.schedule||{};
  const st=d.strategy||{};
  const days=[['mon','월'],['tue','화'],['wed','수'],['thu','목'],['fri','금']];
  const icons={clock:'fa-clock',comment:'fa-comment-dots',file:'fa-file-alt'};

  $('s3').innerHTML=\`<div class="anim">
  <button onclick="goList()" class="text-gray-600 hover:text-white text-[11px] mb-2"><i class="fas fa-arrow-left mr-1"></i>목록</button>

  <div class="card p-4 mb-3">
    <div class="flex items-center gap-3">
      <div class="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-lg text-white font-bold flex-shrink-0">\${(d.name||lk.name||'?')[0]}</div>
      <div class="min-w-0">
        <div class="flex items-center gap-1.5">
          <span class="text-white font-bold">\${d.name||lk.name}</span>
          <span class="chip tier-\${lk.tier||'C'} text-[9px]">\${lk.tier||'?'}</span>
        </div>
        <p class="text-gray-500 text-[11px]">\${d.hospital||''} · \${d.department||''} · \${d.position||''}</p>
        <div class="flex flex-wrap gap-1 mt-1">\${(d.tags||[]).map(t=>\`<span class="tag">\${t}</span>\`).join('')}</div>
      </div>
    </div>
  </div>

  <div class="flex gap-1 mb-3 overflow-x-auto" id="tabs">
    <div class="tab on" onclick="sw('ov',this)">요약</div>
    <div class="tab" onclick="sw('sc',this)">일정</div>
    <div class="tab" onclick="sw('rs',this)">논문</div>
    <div class="tab" onclick="sw('st',this)">전략</div>
  </div>

  <!-- 요약 -->
  <div id="t-ov" class="tc on">
    \${st.summary?\`<div class="card p-3 mb-2 border-l-2 border-blue-500"><p class="text-blue-300 text-xs">\${st.summary}</p></div>\`:''}
    \${d.philosophy?\`<div class="card p-3 mb-2"><p class="text-[11px] text-gray-500 mb-1">치료 철학</p><p class="text-gray-300 text-xs">\${d.philosophy}</p></div>\`:''}
    \${(d.preferences||[]).length?\`<div class="card p-3"><p class="text-[11px] text-gray-500 mb-1.5">치료 성향</p>\${d.preferences.map(p=>\`<div class="flex gap-2 mb-1 last:mb-0"><span class="tag flex-shrink-0">\${p.condition}</span><span class="text-gray-400 text-xs">\${p.approach}</span></div>\`).join('')}</div>\`:''}
  </div>

  <!-- 일정 -->
  <div id="t-sc" class="tc">
    <div class="card p-3">
      <table class="w-full text-[11px]">
        <tr>\${days.map(([,l])=>\`<th class="py-1.5 text-center text-gray-500 font-medium">\${l}</th>\`).join('')}</tr>
        <tr class="border-t border-white/5">\${days.map(([k])=>{
          const v=sc[k]; if(!v||v==='-')return\`<td class="py-1.5 text-center text-gray-700">-</td>\`;
          if(typeof v==='object'){
            const am=v.am||'-',pm=v.pm||'-';
            const hasAm=am!=='-',hasPm=pm!=='-';
            return\`<td class="py-1.5 text-center">\${hasAm?\`<div class="text-green-400">\${am}</div>\`:\`<div class="text-gray-700">-</div>\`}\${hasPm?\`<div class="text-cyan-400">\${pm}</div>\`:\`<div class="text-gray-700">-</div>\`}</td>\`;
          }
          const ok=typeof v==='string'&&v.includes('외래');
          return\`<td class="py-1.5 text-center \${ok?'text-green-400':'text-gray-500'}">\${v}</td>\`
        }).join('')}</tr>
      </table>
      \${sc.visitTip?\`<div class="mt-2 pt-2 border-t border-white/5 text-blue-300 text-[11px]"><i class="fas fa-clock mr-1 text-[10px]"></i>\${sc.visitTip}</div>\`:''}
    </div>
  </div>

  <!-- 논문 -->
  <div id="t-rs" class="tc">
    \${(d.publications||[]).length?\`<div class="card p-3"><p class="text-[11px] text-gray-500 mb-1.5">대표 논문</p>\${d.publications.map(p=>\`<div class="mb-1.5 last:mb-0"><p class="text-gray-300 text-xs">\${p.title}</p><p class="text-gray-600 text-[10px]">\${p.journal||''} \${p.year?'('+p.year+')':''}</p></div>\`).join('')}</div>\`:'<div class="card p-3"><p class="text-gray-600 text-xs">논문 정보 없음</p></div>'}
  </div>

  <!-- 전략 -->
  <div id="t-st" class="tc">
    \${(st.actions||[]).length?\`<div class="grid gap-1.5 mb-2" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">\${st.actions.map(a=>\`<div class="card p-2.5"><p class="text-[10px] text-gray-500 mb-0.5"><i class="fas \${icons[a.icon]||'fa-info'} mr-1 text-blue-400"></i>\${a.title}</p><p class="text-gray-300 text-xs">\${a.text}</p></div>\`).join('')}</div>\`:''}
    <div class="grid grid-cols-2 gap-1.5">
      \${(st.do||[]).length?\`<div class="card p-2.5"><p class="text-green-400 text-[10px] font-medium mb-1">DO</p>\${st.do.map(x=>\`<p class="text-gray-300 text-[11px] mb-0.5"><i class="fas fa-check text-green-500 text-[9px] mr-1"></i>\${x}</p>\`).join('')}</div>\`:''}
      \${(st.dont||[]).length?\`<div class="card p-2.5"><p class="text-red-400 text-[10px] font-medium mb-1">DON'T</p>\${st.dont.map(x=>\`<p class="text-gray-300 text-[11px] mb-0.5"><i class="fas fa-times text-red-500 text-[9px] mr-1"></i>\${x}</p>\`).join('')}</div>\`:''}
    </div>
  </div>

  </div>\`;
}

function sw(id,el){document.querySelectorAll('.tc').forEach(e=>e.classList.remove('on'));document.querySelectorAll('.tab').forEach(e=>e.classList.remove('on'));$('t-'+id).classList.add('on');el.classList.add('on')}
</script>
</body>
</html>`

export default app
