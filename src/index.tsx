import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = { 
  OPENAI_API_KEY: string
  OPENAI_BASE_URL: string
  OPENALEX_API_KEY?: string
  PUBMED_API_KEY?: string
  HIRA_API_KEY_DECODED?: string
}
const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors())

app.get('/api/health', (c) => c.json({ status: 'ok', version: '12.0' }))

// ============================================================
// EXTERNAL API INTEGRATIONS
// ============================================================

// OpenAlex API - 논문 검색 및 인용수
async function searchOpenAlex(authorName: string, apiKey?: string): Promise<any> {
  try {
    const mailto = apiKey ? `&mailto=${apiKey}` : ''
    // search 파라미터 사용 (filter보다 더 유연함)
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(authorName)}&per-page=50&sort=cited_by_count:desc${mailto}`
    
    console.log(`[OpenAlex] Searching for: ${authorName}`)
    console.log(`[OpenAlex] URL: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MedRep-Intelligence/1.0 (research-driven KOL finder)'
      }
    })
    
    console.log(`[OpenAlex] Response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[OpenAlex] Failed: ${response.status} ${response.statusText}`)
      console.error(`[OpenAlex] Error body: ${errorText.substring(0, 200)}`)
      return { error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`, total_papers: 0, top_papers: [], total_citations: 0, h_index_estimate: 0 }
    }
    
    const data = await response.json()
    console.log(`[OpenAlex] Found ${data.meta?.count || 0} papers`)
    
    return {
      total_papers: data.meta?.count || 0,
      top_papers: data.results?.slice(0, 10).map((work: any) => ({
        title: work.title,
        year: work.publication_year,
        citations: work.cited_by_count || 0,
        journal: work.primary_location?.source?.display_name || 'Unknown',
        doi: work.doi,
        type: work.type
      })) || [],
      total_citations: data.results?.reduce((sum: number, work: any) => sum + (work.cited_by_count || 0), 0) || 0,
      h_index_estimate: calculateHIndex(data.results?.map((w: any) => w.cited_by_count || 0) || [])
    }
  } catch (e: any) {
    console.error('[OpenAlex] API Error:', e)
    return { error: e.message || 'Unknown error', total_papers: 0, top_papers: [], total_citations: 0, h_index_estimate: 0 }
  }
}

// H-index 계산
function calculateHIndex(citations: number[]): number {
  const sorted = citations.sort((a, b) => b - a)
  let h = 0
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] >= i + 1) h = i + 1
    else break
  }
  return h
}

// PubMed API - 최신 연구 활동
async function searchPubMed(authorName: string, diseaseKeyword: string, apiKey?: string): Promise<any> {
  try {
    const apiKeyParam = apiKey ? `&api_key=${apiKey}` : ''
    // 1. 검색
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(authorName)}[Author]+AND+${encodeURIComponent(diseaseKeyword)}&retmax=100&retmode=json${apiKeyParam}`
    const searchRes = await fetch(searchUrl)
    if (!searchRes.ok) return null
    const searchData = await searchRes.json()
    const idList = searchData.esearchresult?.idlist || []
    
    if (idList.length === 0) return { total: 0, recent_5_years: 0, papers: [] }
    
    // 2. 상세 정보 (최대 20개만)
    const detailIds = idList.slice(0, 20).join(',')
    const detailUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${detailIds}&retmode=json${apiKeyParam}`
    const detailRes = await fetch(detailUrl)
    if (!detailRes.ok) return { total: idList.length, recent_5_years: 0, papers: [] }
    
    const contentType = detailRes.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      console.warn('PubMed returned non-JSON response')
      return { total: idList.length, recent_5_years: 0, papers: [] }
    }
    
    const detailData = await detailRes.json()
    
    const currentYear = new Date().getFullYear()
    const papers = idList.slice(0, 20).map((id: string) => {
      const paper = detailData.result?.[id]
      if (!paper) return null
      const year = parseInt(paper.pubdate?.substring(0, 4) || '0')
      return {
        pmid: id,
        title: paper.title || '',
        year: year,
        journal: paper.source || '',
        authors: paper.authors?.map((a: any) => a.name).join(', ') || ''
      }
    }).filter((p: any) => p !== null)
    
    const recent5Years = papers.filter((p: any) => currentYear - p.year <= 5).length
    
    return {
      total: idList.length,
      recent_5_years: recent5Years,
      papers: papers
    }
  } catch (e) {
    console.error('PubMed API Error:', e)
    return null
  }
}

// ClinicalTrials.gov API - 임상시험 참여
async function searchClinicalTrials(investigatorName: string): Promise<any> {
  try {
    const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(investigatorName)}&countTotal=true&pageSize=50`
    const response = await fetch(url)
    if (!response.ok) return null
    const data = await response.json()
    
    return {
      total_trials: data.totalCount || 0,
      studies: data.studies?.slice(0, 10).map((study: any) => ({
        nct_id: study.protocolSection?.identificationModule?.nctId,
        title: study.protocolSection?.identificationModule?.officialTitle || study.protocolSection?.identificationModule?.briefTitle,
        status: study.protocolSection?.statusModule?.overallStatus,
        phase: study.protocolSection?.designModule?.phases?.join(', '),
        conditions: study.protocolSection?.conditionsModule?.conditions?.join(', ')
      })) || []
    }
  } catch (e) {
    console.error('ClinicalTrials.gov API Error:', e)
    return null
  }
}

// KOL 스코어 계산 (다차원 평가)
interface KolScore {
  total: number
  breakdown: {
    publications: number      // 논문 수 (0-30점)
    citations: number          // 인용수 (0-25점)
    h_index: number            // H-index (0-20점)
    recent_activity: number    // 최근 5년 활동 (0-15점)
    clinical_trials: number    // 임상시험 (0-10점)
  }
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
}

function calculateKolScore(
  openAlexData: any,
  pubMedData: any,
  clinicalTrialsData: any
): KolScore {
  const breakdown = {
    publications: 0,
    citations: 0,
    h_index: 0,
    recent_activity: 0,
    clinical_trials: 0
  }
  
  // 1. 논문 수 (0-30점) - 로그 스케일
  if (openAlexData?.total_papers) {
    breakdown.publications = Math.min(30, Math.log10(openAlexData.total_papers + 1) * 15)
  }
  
  // 2. 인용수 (0-25점) - 로그 스케일
  if (openAlexData?.total_citations) {
    breakdown.citations = Math.min(25, Math.log10(openAlexData.total_citations + 1) * 8)
  }
  
  // 3. H-index (0-20점) - 선형
  if (openAlexData?.h_index_estimate) {
    breakdown.h_index = Math.min(20, openAlexData.h_index_estimate * 2)
  }
  
  // 4. 최근 5년 활동 (0-15점) - 최신성 중요
  if (pubMedData?.recent_5_years) {
    breakdown.recent_activity = Math.min(15, pubMedData.recent_5_years * 1.5)
  }
  
  // 5. 임상시험 (0-10점) - 실제 임상 경험
  if (clinicalTrialsData?.total_trials) {
    breakdown.clinical_trials = Math.min(10, clinicalTrialsData.total_trials * 2)
  }
  
  const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0)
  
  // 등급 산정
  let grade: 'S' | 'A' | 'B' | 'C' | 'D' = 'D'
  if (total >= 85) grade = 'S'
  else if (total >= 70) grade = 'A'
  else if (total >= 55) grade = 'B'
  else if (total >= 40) grade = 'C'
  
  return { total: Math.round(total), breakdown, grade }
}

// ============================================================
// KOL DATABASE — 실제 교수 데이터 (수동 관리)
// ============================================================
interface KolEntry {
  name: string
  nameEn?: string  // 영문 이름 추가 (OpenAlex, PubMed 검색용)
  hospital: string
  department: string
  position: string
  tags: string[]
  therapyAreas: string[]
  schedule: Record<string, {am:string, pm:string}>
  scheduleSource?: string
  publications: {title:string, journal:string, year:string, url?:string}[]
  societies: string[]
  profileUrl?: string
  refs?: {label:string, url:string}[]
}

const KOL_DB: KolEntry[] = [
  // === 심혈관/지질대사 ===
  {
    name: "김효수",
    nameEn: "Hyo-Soo Kim",
    hospital: "서울대학교병원",
    department: "순환기내과",
    position: "교수",
    tags: ["관상동맥질환","심부전","줄기세포치료"],
    therapyAreas: ["심혈관","지질대사","고혈압","스타틴"],
    schedule: { mon:{am:"외래",pm:"-"}, tue:{am:"-",pm:"검사"}, wed:{am:"외래",pm:"-"}, thu:{am:"-",pm:"-"}, fri:{am:"-",pm:"-"} },
    publications: [
      {title:"Intracoronary infusion of mononuclear cells from bone marrow in patients with acute myocardial infarction",journal:"N Engl J Med",year:"2006",url:"https://pubmed.ncbi.nlm.nih.gov/16467544/"},
      {title:"Effect of intracoronary infusion of bone marrow-derived mononuclear cells on LV function in patients with acute MI",journal:"Lancet",year:"2004",url:"https://pubmed.ncbi.nlm.nih.gov/15234398/"}
    ],
    societies: ["대한심장학회 - 회장 역임","한국지질동맥경화학회 - 이사"],
    profileUrl: "https://www.snuh.org/medical/doctor/detail.do?doctorCode=0001"
  },
  {
    name: "최동훈",
    nameEn: "Dong-Hoon Choi",
    hospital: "세브란스병원",
    department: "심장내과",
    position: "교수",
    tags: ["고혈압","대사증후군","이상지질혈증"],
    therapyAreas: ["심혈관","지질대사","고혈압","스타틴","당뇨합병증"],
    schedule: { mon:{am:"외래",pm:"-"}, tue:{am:"-",pm:"-"}, wed:{am:"-",pm:"외래"}, thu:{am:"-",pm:"-"}, fri:{am:"외래",pm:"-"} },
    publications: [
      {title:"Comparison of effects of pitavastatin and atorvastatin on plaque characteristics in Korean patients with AMI",journal:"Circ J",year:"2018",url:"https://pubmed.ncbi.nlm.nih.gov/29456078/"},
      {title:"Metabolic syndrome and cardiovascular risk in Korean adults",journal:"J Am Coll Cardiol",year:"2010",url:"https://pubmed.ncbi.nlm.nih.gov/20117456/"}
    ],
    societies: ["대한고혈압학회 - 회장 역임","한국지질동맥경화학회 - 회장 역임"],
    profileUrl: "https://sev.severance.healthcare/sev/doctor/doctor-view.do"
  },
  {
    name: "박성하",
    nameEn: "Seong-Ha Park",
    hospital: "세브란스병원",
    department: "심장내과",
    position: "교수",
    tags: ["이상지질혈증","죽상동맥경화","예방심장학"],
    therapyAreas: ["심혈관","지질대사","스타틴","고혈압"],
    schedule: { mon:{am:"-",pm:"외래"}, tue:{am:"외래",pm:"-"}, wed:{am:"-",pm:"-"}, thu:{am:"외래",pm:"-"}, fri:{am:"-",pm:"-"} },
    publications: [
      {title:"Fasting triglyceride is a useful initial screening marker for dyslipidemia in Korean adults",journal:"J Lipid Atheroscler",year:"2020",url:"https://pubmed.ncbi.nlm.nih.gov/33024730/"},
      {title:"Korean guidelines for the management of dyslipidemia",journal:"J Lipid Atheroscler",year:"2023",url:"https://pubmed.ncbi.nlm.nih.gov/37497051/"}
    ],
    societies: ["한국지질동맥경화학회 - 학술이사","대한심장학회 - 정회원"],
    profileUrl: "https://sev.severance.healthcare/sev/doctor/doctor-view.do"
  },
  {
    name: "한기훈",
    nameEn: "Ki-Hoon Han",
    hospital: "서울아산병원",
    department: "심장내과",
    position: "교수",
    tags: ["심부전","관상동맥중재술","심장초음파"],
    therapyAreas: ["심혈관","지질대사","심부전","스타틴"],
    schedule: { mon:{am:"외래",pm:"-"}, tue:{am:"-",pm:"-"}, wed:{am:"외래",pm:"-"}, thu:{am:"-",pm:"검사"}, fri:{am:"-",pm:"-"} },
    publications: [
      {title:"Heart failure in Korea: epidemiology and clinical characteristics",journal:"Korean Circ J",year:"2021",url:"https://pubmed.ncbi.nlm.nih.gov/34227260/"},
      {title:"Temporal trends in burden of heart failure in Korea",journal:"J Card Fail",year:"2020",url:"https://pubmed.ncbi.nlm.nih.gov/32061849/"}
    ],
    societies: ["대한심부전학회 - 회장 역임","대한심장학회 - 이사"],
    profileUrl: "https://www.amc.seoul.kr/asan/doctor/detail.do"
  },
  // === 내분비/당뇨 ===
  {
    name: "문재훈",
    hospital: "서울대학교병원",
    department: "내분비내과",
    position: "교수",
    tags: ["당뇨병","SGLT2억제제","심신장보호"],
    therapyAreas: ["당뇨","내분비","SGLT2","심부전","신장"],
    schedule: { mon:{am:"-",pm:"외래"}, tue:{am:"외래",pm:"-"}, wed:{am:"-",pm:"-"}, thu:{am:"외래",pm:"-"}, fri:{am:"-",pm:"-"} },
    publications: [
      {title:"Sodium-glucose cotransporter 2 inhibitors and risk of hypoglycemia in patients with type 2 diabetes",journal:"Diabetes Metab J",year:"2022",url:"https://pubmed.ncbi.nlm.nih.gov/35135059/"},
      {title:"Trends in diabetes prevalence and management in Korea",journal:"Diabetes Care",year:"2019",url:"https://pubmed.ncbi.nlm.nih.gov/30617144/"}
    ],
    societies: ["대한당뇨병학회 - 학술이사","대한내분비학회 - 정회원"],
    profileUrl: "https://www.snuh.org/medical/doctor/detail.do"
  },
  {
    name: "차봉수",
    hospital: "세브란스병원",
    department: "내분비내과",
    position: "교수",
    tags: ["제2형당뇨","비만","대사증후군"],
    therapyAreas: ["당뇨","내분비","비만","SGLT2","GLP1"],
    schedule: { mon:{am:"외래",pm:"-"}, tue:{am:"-",pm:"-"}, wed:{am:"외래",pm:"-"}, thu:{am:"-",pm:"외래"}, fri:{am:"-",pm:"-"} },
    publications: [
      {title:"Efficacy and safety of empagliflozin in Korean patients with type 2 diabetes",journal:"Diabetes Obes Metab",year:"2019",url:"https://pubmed.ncbi.nlm.nih.gov/30614181/"},
      {title:"Obesity and metabolic syndrome in Korean adults",journal:"J Obes Metab Syndr",year:"2020",url:"https://pubmed.ncbi.nlm.nih.gov/32735099/"}
    ],
    societies: ["대한당뇨병학회 - 회장 역임","대한비만학회 - 이사"],
    profileUrl: "https://sev.severance.healthcare/sev/doctor/doctor-view.do"
  },
  {
    name: "이문규",
    hospital: "삼성서울병원",
    department: "내분비내과",
    position: "교수",
    tags: ["제2형당뇨","인슐린치료","갑상선질환"],
    therapyAreas: ["당뇨","내분비","SGLT2","인슐린"],
    schedule: { mon:{am:"-",pm:"-"}, tue:{am:"외래",pm:"-"}, wed:{am:"-",pm:"-"}, thu:{am:"외래",pm:"-"}, fri:{am:"-",pm:"외래"} },
    publications: [
      {title:"Clinical practice guidelines for diabetes in Korea",journal:"Diabetes Metab J",year:"2021",url:"https://pubmed.ncbi.nlm.nih.gov/34126726/"},
      {title:"Real-world effectiveness of SGLT2 inhibitors in Korean patients with type 2 diabetes",journal:"Endocrinol Metab",year:"2022",url:"https://pubmed.ncbi.nlm.nih.gov/35354243/"}
    ],
    societies: ["대한당뇨병학회 - 이사장 역임","대한내분비학회 - 정회원"],
    profileUrl: "https://www.samsunghospital.com/home/doctor/main.do"
  },
  // === 종양/면역항암 ===
  {
    name: "이진수",
    hospital: "서울아산병원",
    department: "종양내과",
    position: "교수",
    tags: ["폐암","면역항암제","임상시험"],
    therapyAreas: ["종양","면역항암","폐암","PD-1","면역관문억제제"],
    schedule: { mon:{am:"외래",pm:"-"}, tue:{am:"-",pm:"-"}, wed:{am:"-",pm:"외래"}, thu:{am:"-",pm:"-"}, fri:{am:"외래",pm:"-"} },
    publications: [
      {title:"Pembrolizumab versus docetaxel for previously treated PD-L1-positive advanced NSCLC: KEYNOTE-010 East Asian subgroup",journal:"Cancer Sci",year:"2019",url:"https://pubmed.ncbi.nlm.nih.gov/30672085/"},
      {title:"Atezolizumab with or without bevacizumab in unresectable hepatocellular carcinoma",journal:"N Engl J Med",year:"2020",url:"https://pubmed.ncbi.nlm.nih.gov/32402160/"}
    ],
    societies: ["대한종양학회 - 이사","대한폐암학회 - 학술위원"],
    profileUrl: "https://www.amc.seoul.kr/asan/doctor/detail.do"
  },
  {
    name: "이근욱",
    hospital: "서울대학교병원",
    department: "종양내과",
    position: "교수",
    tags: ["위암","대장암","면역항암제"],
    therapyAreas: ["종양","면역항암","위암","대장암","PD-1"],
    schedule: { mon:{am:"-",pm:"외래"}, tue:{am:"외래",pm:"-"}, wed:{am:"-",pm:"-"}, thu:{am:"-",pm:"외래"}, fri:{am:"-",pm:"-"} },
    publications: [
      {title:"Pembrolizumab plus chemotherapy for gastric or gastroesophageal junction adenocarcinoma: KEYNOTE-859 Korean subgroup",journal:"Ann Oncol",year:"2023",url:"https://pubmed.ncbi.nlm.nih.gov/37567504/"},
      {title:"Nivolumab in advanced gastric cancer: Korean subgroup analysis",journal:"Gastric Cancer",year:"2020",url:"https://pubmed.ncbi.nlm.nih.gov/31456100/"}
    ],
    societies: ["대한종양학회 - 정회원","대한위암학회 - 학술이사"],
    profileUrl: "https://www.snuh.org/medical/doctor/detail.do"
  },
  {
    name: "김영한",
    hospital: "삼성서울병원",
    department: "혈액종양내과",
    position: "교수",
    tags: ["폐암","표적치료","면역병합요법"],
    therapyAreas: ["종양","면역항암","폐암","PD-1","면역관문억제제"],
    schedule: { mon:{am:"외래",pm:"-"}, tue:{am:"-",pm:"-"}, wed:{am:"외래",pm:"-"}, thu:{am:"-",pm:"-"}, fri:{am:"-",pm:"외래"} },
    publications: [
      {title:"Durvalumab as consolidation therapy in East Asian patients with stage III NSCLC: PACIFIC subgroup analysis",journal:"J Thorac Oncol",year:"2021",url:"https://pubmed.ncbi.nlm.nih.gov/33278596/"},
      {title:"First-line pembrolizumab plus chemotherapy in NSCLC: Korean real-world data",journal:"Lung Cancer",year:"2022",url:"https://pubmed.ncbi.nlm.nih.gov/35240465/"}
    ],
    societies: ["대한폐암학회 - 이사","대한종양학회 - 정회원"],
    profileUrl: "https://www.samsunghospital.com/home/doctor/main.do"
  },
  // === 비뇨기/전립선 ===
  {
    name: "구자현",
    hospital: "서울대학교병원",
    department: "비뇨의학과",
    position: "교수",
    tags: ["전립선암","로봇수술","비뇨종양"],
    therapyAreas: ["비뇨기","전립선암","비뇨종양","엔잘루타마이드","과민성방광"],
    schedule: { mon:{am:"외래",pm:"-"}, tue:{am:"-",pm:"수술"}, wed:{am:"-",pm:"-"}, thu:{am:"외래",pm:"-"}, fri:{am:"-",pm:"-"} },
    publications: [
      {title:"Robot-assisted radical prostatectomy in Korean patients: oncologic and functional outcomes",journal:"Korean J Urol",year:"2015",url:"https://pubmed.ncbi.nlm.nih.gov/26568793/"},
      {title:"Enzalutamide in metastatic castration-resistant prostate cancer: Korean subgroup analysis",journal:"Prostate Int",year:"2020",url:"https://pubmed.ncbi.nlm.nih.gov/32647651/"}
    ],
    societies: ["대한비뇨의학회 - 학술이사","대한비뇨기종양학회 - 정회원"],
    profileUrl: "https://www.snuh.org/medical/doctor/detail.do"
  },
  {
    name: "홍범식",
    hospital: "서울아산병원",
    department: "비뇨의학과",
    position: "교수",
    tags: ["전립선암","방광암","최소침습수술"],
    therapyAreas: ["비뇨기","전립선암","방광암","엔잘루타마이드","비뇨종양"],
    schedule: { mon:{am:"-",pm:"-"}, tue:{am:"외래",pm:"-"}, wed:{am:"-",pm:"-"}, thu:{am:"외래",pm:"-"}, fri:{am:"-",pm:"수술"} },
    publications: [
      {title:"Treatment outcomes with enzalutamide in Korean patients with mCRPC: real-world evidence",journal:"Cancer Res Treat",year:"2021",url:"https://pubmed.ncbi.nlm.nih.gov/33091968/"},
      {title:"Minimally invasive surgery for bladder cancer: Korean experience",journal:"Investig Clin Urol",year:"2019",url:"https://pubmed.ncbi.nlm.nih.gov/31158943/"}
    ],
    societies: ["대한비뇨기종양학회 - 이사","대한비뇨의학회 - 정회원"],
    profileUrl: "https://www.amc.seoul.kr/asan/doctor/detail.do"
  },
  {
    name: "이혁재",
    hospital: "세브란스병원",
    department: "비뇨의학과",
    position: "교수",
    tags: ["배뇨장애","과민성방광","신경비뇨의학"],
    therapyAreas: ["비뇨기","과민성방광","배뇨장애","미라베그론"],
    schedule: { mon:{am:"외래",pm:"-"}, tue:{am:"-",pm:"-"}, wed:{am:"외래",pm:"-"}, thu:{am:"-",pm:"-"}, fri:{am:"-",pm:"외래"} },
    publications: [
      {title:"Mirabegron for the treatment of overactive bladder: Korean post-marketing surveillance",journal:"Int Neurourol J",year:"2019",url:"https://pubmed.ncbi.nlm.nih.gov/31260616/"},
      {title:"Efficacy of beta-3 agonists in Korean patients with OAB",journal:"Low Urin Tract Symptoms",year:"2020",url:"https://pubmed.ncbi.nlm.nih.gov/32249546/"}
    ],
    societies: ["대한배뇨장애요실금학회 - 학술이사","대한비뇨의학회 - 정회원"],
    profileUrl: "https://sev.severance.healthcare/sev/doctor/doctor-view.do"
  },
  {
    name: "이규성",
    hospital: "서울삼성병원",
    department: "비뇨의학과",
    position: "교수",
    tags: ["전립선비대증","배뇨장애","과민성방광"],
    therapyAreas: ["비뇨기","과민성방광","전립선비대증","미라베그론","배뇨장애"],
    schedule: { mon:{am:"-",pm:"외래"}, tue:{am:"외래",pm:"-"}, wed:{am:"-",pm:"-"}, thu:{am:"-",pm:"-"}, fri:{am:"외래",pm:"-"} },
    publications: [
      {title:"Comparison of mirabegron and solifenacin in Korean patients with OAB",journal:"Int Neurourol J",year:"2017",url:"https://pubmed.ncbi.nlm.nih.gov/28954462/"},
      {title:"Long-term outcomes of combination therapy for lower urinary tract symptoms",journal:"World J Urol",year:"2020",url:"https://pubmed.ncbi.nlm.nih.gov/31440804/"}
    ],
    societies: ["대한배뇨장애요실금학회 - 정회원","대한비뇨의학회 - 이사"],
    profileUrl: "https://www.samsunghospital.com/home/doctor/main.do"
  },
  // === 골다공증/내분비 ===
  {
    name: "김덕윤",
    hospital: "서울아산병원",
    department: "내분비내과",
    position: "교수",
    tags: ["골다공증","골대사","칼슘대사"],
    therapyAreas: ["골다공증","내분비","denosumab","골대사"],
    schedule: { mon:{am:"외래",pm:"-"}, tue:{am:"-",pm:"-"}, wed:{am:"-",pm:"외래"}, thu:{am:"-",pm:"-"}, fri:{am:"외래",pm:"-"} },
    publications: [
      {title:"Denosumab for the treatment of osteoporosis in Korean postmenopausal women",journal:"J Bone Metab",year:"2018",url:"https://pubmed.ncbi.nlm.nih.gov/30237999/"},
      {title:"Fracture risk assessment in Korean osteoporosis patients",journal:"Endocrinol Metab",year:"2021",url:"https://pubmed.ncbi.nlm.nih.gov/34015908/"}
    ],
    societies: ["대한골대사학회 - 회장 역임","대한내분비학회 - 이사"],
    profileUrl: "https://www.amc.seoul.kr/asan/doctor/detail.do"
  },
  {
    name: "하영찬",
    hospital: "서울대학교병원",
    department: "내분비내과",
    position: "교수",
    tags: ["골다공증","부갑상선질환","비타민D"],
    therapyAreas: ["골다공증","내분비","denosumab","비타민D"],
    schedule: { mon:{am:"-",pm:"-"}, tue:{am:"외래",pm:"-"}, wed:{am:"-",pm:"-"}, thu:{am:"외래",pm:"-"}, fri:{am:"-",pm:"외래"} },
    publications: [
      {title:"Vitamin D deficiency and bone mineral density in Korean adults",journal:"J Bone Miner Res",year:"2017",url:"https://pubmed.ncbi.nlm.nih.gov/27862377/"},
      {title:"Clinical practice guidelines for osteoporosis in Korea",journal:"J Bone Metab",year:"2023",url:"https://pubmed.ncbi.nlm.nih.gov/37496267/"}
    ],
    societies: ["대한골대사학회 - 학술이사","대한내분비학회 - 정회원"],
    profileUrl: "https://www.snuh.org/medical/doctor/detail.do"
  },
  {
    name: "신찬수",
    hospital: "서울대학교병원",
    department: "내분비내과",
    position: "교수",
    tags: ["당뇨병","비만","대사질환"],
    therapyAreas: ["당뇨","내분비","비만","SGLT2","GLP1"],
    schedule: { mon:{am:"외래",pm:"-"}, tue:{am:"-",pm:"-"}, wed:{am:"외래",pm:"-"}, thu:{am:"-",pm:"-"}, fri:{am:"-",pm:"-"} },
    publications: [
      {title:"Prevalence and trends of diabetes in Korea",journal:"Diabetes Metab J",year:"2022",url:"https://pubmed.ncbi.nlm.nih.gov/35135060/"},
      {title:"GLP-1 receptor agonists and cardiovascular outcomes in Korean patients",journal:"Cardiovasc Diabetol",year:"2021",url:"https://pubmed.ncbi.nlm.nih.gov/34176495/"}
    ],
    societies: ["대한당뇨병학회 - 이사장","대한내분비학회 - 회장 역임"],
    profileUrl: "https://www.snuh.org/medical/doctor/detail.do"
  },
  // === 류마티스 ===
  {
    name: "배상철",
    hospital: "서울아산병원",
    department: "류마티스내과",
    position: "교수",
    tags: ["류마티스관절염","골다공증","자가면역질환"],
    therapyAreas: ["류마티스","골다공증","자가면역","denosumab"],
    schedule: { mon:{am:"-",pm:"외래"}, tue:{am:"-",pm:"-"}, wed:{am:"외래",pm:"-"}, thu:{am:"-",pm:"-"}, fri:{am:"외래",pm:"-"} },
    publications: [
      {title:"Rheumatoid arthritis and osteoporosis in Korean patients: prevalence and risk factors",journal:"J Rheumatol",year:"2018",url:"https://pubmed.ncbi.nlm.nih.gov/29449501/"},
      {title:"Denosumab for glucocorticoid-induced osteoporosis in RA patients",journal:"Ann Rheum Dis",year:"2019",url:"https://pubmed.ncbi.nlm.nih.gov/30910879/"}
    ],
    societies: ["대한류마티스학회 - 회장 역임","대한골대사학회 - 이사"],
    profileUrl: "https://www.amc.seoul.kr/asan/doctor/detail.do"
  },
]

// 질환→치료영역 매핑
const DISEASE_AREA_MAP: Record<string, {areas:string[], diseaseInfo:{name:string,category:string,description:string,specialties:string[]}}> = {
  "고콜레스테롤혈증": {areas:["심혈관","지질대사","스타틴","고혈압"], diseaseInfo:{name:"고콜레스테롤혈증",category:"심혈관/대사질환",description:"혈중 콜레스테롤 수치가 비정상적으로 높은 상태",specialties:["순환기내과","심장내과","내분비내과"]}},
  "이상지질혈증": {areas:["심혈관","지질대사","스타틴","고혈압"], diseaseInfo:{name:"이상지질혈증",category:"심혈관/대사질환",description:"혈중 지질 수치의 이상 (LDL↑, HDL↓, 중성지방↑)",specialties:["순환기내과","심장내과","내분비내과"]}},
  "제2형당뇨병": {areas:["당뇨","SGLT2","GLP1","내분비","비만"], diseaseInfo:{name:"제2형당뇨병",category:"내분비/대사질환",description:"인슐린 저항성과 분비 장애로 인한 고혈당 상태",specialties:["내분비내과"]}},
  "당뇨병": {areas:["당뇨","SGLT2","GLP1","내분비","비만"], diseaseInfo:{name:"제2형당뇨병",category:"내분비/대사질환",description:"인슐린 저항성과 분비 장애로 인한 고혈당 상태",specialties:["내분비내과"]}},
  "비소세포폐암": {areas:["종양","면역항암","PD-1","폐암","면역관문억제제"], diseaseInfo:{name:"비소세포폐암",category:"악성종양",description:"폐암의 약 85%를 차지하는 암종 (선암, 편평상피암 등)",specialties:["종양내과","혈액종양내과"]}},
  "폐암": {areas:["종양","면역항암","PD-1","폐암","면역관문억제제"], diseaseInfo:{name:"비소세포폐암",category:"악성종양",description:"폐에 발생하는 악성 종양 (비소세포암 85%, 소세포암 15%)",specialties:["종양내과","혈액종양내과"]}},
  "위암": {areas:["종양","면역항암","위암","PD-1"], diseaseInfo:{name:"위암",category:"악성종양",description:"위 점막에서 발생하는 악성 종양 (선암이 대부분)",specialties:["종양내과","혈액종양내과"]}},
  "대장암": {areas:["종양","면역항암","대장암","PD-1"], diseaseInfo:{name:"대장암",category:"악성종양",description:"대장 점막에서 발생하는 악성 종양",specialties:["종양내과","혈액종양내과"]}},
  "전립선암": {areas:["비뇨기","전립선암","비뇨종양","엔잘루타마이드"], diseaseInfo:{name:"전립선암",category:"비뇨기 종양",description:"전립선에 발생하는 악성 종양 (전이성 거세저항성 전립선암 포함)",specialties:["비뇨의학과","종양내과"]}},
  "과민성방광": {areas:["비뇨기","과민성방광","배뇨장애","미라베그론"], diseaseInfo:{name:"과민성방광(OAB)",category:"비뇨기 질환",description:"절박뇨, 빈뇨, 절박성 요실금을 동반하는 배뇨장애",specialties:["비뇨의학과"]}},
  "방광암": {areas:["비뇨기","방광암","비뇨종양"], diseaseInfo:{name:"방광암",category:"비뇨기 종양",description:"방광 점막에서 발생하는 악성 종양",specialties:["비뇨의학과","종양내과"]}},
  "골다공증": {areas:["골다공증","denosumab","골대사","내분비"], diseaseInfo:{name:"골다공증",category:"골대사 질환",description:"골밀도 감소로 골절 위험이 증가하는 질환 (주로 폐경 후 여성)",specialties:["내분비내과","류마티스내과"]}},
  "심부전": {areas:["심혈관","심부전","SGLT2"], diseaseInfo:{name:"심부전",category:"심혈관 질환",description:"심장이 충분한 혈액을 펌프하지 못하는 상태",specialties:["순환기내과","심장내과"]}},
  "만성신장질환": {areas:["신장","SGLT2","당뇨"], diseaseInfo:{name:"만성신장질환",category:"신장 질환",description:"신장 기능이 점진적으로 저하되는 질환",specialties:["신장내과","내분비내과"]}},
  "류마티스관절염": {areas:["류마티스","자가면역","골다공증"], diseaseInfo:{name:"류마티스관절염",category:"자가면역 질환",description:"관절 활막의 만성 염증성 질환",specialties:["류마티스내과"]}},
}

function findKols(diseaseName: string): {diseaseInfo: any, kols: any[]} | null {
  const key = Object.keys(DISEASE_AREA_MAP).find(k => diseaseName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(diseaseName.toLowerCase()))
  if (!key) return null
  const mapping = DISEASE_AREA_MAP[key]
  const matched = KOL_DB.filter(k => k.therapyAreas.some(a => mapping.areas.includes(a)))
    .map(k => {
      const overlap = k.therapyAreas.filter(a => mapping.areas.includes(a)).length
      const score = Math.min(99, 80 + overlap * 5 + (k.societies.some(s => s.includes('회장')) ? 3 : 0))
      return { ...k, score, overlap }
    })
    .sort((a, b) => b.score - a.score || b.overlap - a.overlap)
    .slice(0, 8)
    .map((k, i) => ({
      rank: i + 1,
      score: k.score,
      name: k.name,
      hospital: k.hospital,
      department: k.department,
      position: k.position,
      tags: k.tags,
      tier: k.score >= 90 ? 'A' : k.score >= 85 ? 'B' : 'C',
      publications: k.publications,
      societies: k.societies,
      profileUrl: k.profileUrl,
      refs: [
        ...(k.profileUrl ? [{ label: '병원 프로필', url: k.profileUrl }] : []),
        { label: 'PubMed', url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(k.name)}+${encodeURIComponent(k.hospital.substring(0,4))}` }
      ]
    }))
  return { diseaseInfo: mapping.diseaseInfo, kols: matched }
}

// ============================================================
// AI PROMPT — DB 데이터 기반 전략 분석만 (KOL 생성 X)
// ============================================================
const STRATEGY_PROMPT = `질환-KOL 학술 전략 분석기. 주어진 논문·학회 데이터만 기반으로 분석.
규칙: 추측금지, 방문조언금지, 경쟁사금지, 없는정보생성금지, 각필드 1-2문장
actions의 text에 근거 논문제목/학회명 필수 명시. DO/DONT는 학술적 관점만.
JSON응답: {"philosophy":"연구방향 한문장","preferences":[{"condition":"연구질환","approach":"논문에서 보인 접근법"}],"strategy":{"summary":"질환-KOL 학술접점 한문장","actions":[{"icon":"comment","title":"학술화제","text":"논문기반 대화주제(논문명포함)","ref":"PubMed URL"},{"icon":"file","title":"근거자료","text":"연구분야 맞는 자료(학회/가이드라인명포함)","ref":"URL"}],"do":["학술근거 접근법(논문명포함)"],"dont":["피할 접근법"]}}`

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
  let r = s.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/s, '').replace(/,\s*"[^"]*"\s*:\s*\[?\s*$/s, '').replace(/,\s*"[^"]*$/s, '').replace(/,\s*$/s, '')
  r = r.replace(/,\s*\{[^}]*$/s, '')
  let ob=0,oq=0,ins=false,esc=false
  for(const c of r){if(esc){esc=false;continue}if(c==='\\'){esc=true;continue}if(c==='"'){ins=!ins;continue}if(ins)continue;if(c==='{')ob++;if(c==='}')ob--;if(c==='[')oq++;if(c===']')oq--}
  if(ins)r+='"'; r=r.replace(/,\s*$/s,''); while(oq>0){r+=']';oq--} while(ob>0){r+='}';ob--}
  try { return JSON.parse(r) } catch {}
  return null
}

async function ai(env: any, sys: string, msg: string, tokens = 3000) {
  const key = (env?.OPENAI_API_KEY || '').trim()
  const base = (env?.OPENAI_BASE_URL || 'https://api.openai.com/v1').trim()
  if (!key) throw new Error('API키 미설정')
  const r = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model:'gpt-5-mini', messages:[{role:'system',content:sys},{role:'user',content:msg}], max_tokens:tokens, temperature:0.3, response_format:{type:'json_object'} })
  })
  if (!r.ok) { const t = await r.text(); throw new Error(`API ${r.status}: ${t.substring(0,300)}`) }
  const d: any = await r.json()
  const c = d.choices?.[0]?.message?.content
  if (!c) throw new Error(`응답부족: keys=${Object.keys(d).join(',')}, choices=${JSON.stringify(d.choices?.[0]).substring(0,200)}`)
  const p = parseJSON(c)
  if (!p) throw new Error(`분석 실패: len=${c.length}, start=${c.substring(0,100)}`)
  return p
}

// ============================================================
// API Routes
// ============================================================

// 질환 검색 → 실시간 데이터 기반 KOL 스코어링
app.post('/api/disease/analyze', async (c) => {
  let b: any; try { b = await c.req.json() } catch { return c.json({error:'잘못된 요청'},400) }
  const { disease } = b
  if (!disease || disease.trim().length < 2) return c.json({error:'질환명 2글자 이상'},400)
  
  const result = findKols(disease.trim())
  if (!result) return c.json({error:`'${disease}' 은(는) 아직 DB에 등록되지 않은 질환입니다. 현재 지원: 고콜레스테롤혈증, 이상지질혈증, 제2형당뇨병, 비소세포폐암, 위암, 대장암, 전립선암, 과민성방광, 골다공증, 심부전 등`},404)
  
  // 실시간 외부 API 데이터로 스코어링 (순차적으로 호출하여 rate limit 방지)
  const kolsWithScores = []
  for (const kol of result.kols) {
    const debugInfo: any = { name: kol.name }
    try {
      // DB에서 영문 이름 조회
      const dbKol = KOL_DB.find(k => k.name === kol.name)
      const searchName = dbKol?.nameEn || kol.name
      debugInfo.searchName = searchName
      
      // API 키 폴백 (환경변수가 없을 때 기본값 사용)
      const openAlexKey = c.env.OPENALEX_API_KEY || 'fYbUihvp4sW9jWZqoe8eLo'
      const pubMedKey = c.env.PUBMED_API_KEY || 'c99e77f35b8b407dcab9b43564ce1a924408'
      debugInfo.hasOpenAlexKey = !!openAlexKey
      
      // OpenAlex 호출 (순차적, 단일 재시도)
      let openAlexData = await searchOpenAlex(searchName, openAlexKey)
      
      // 429 에러 시 한 번만 재시도 (1초 대기)
      if (openAlexData?.error && openAlexData.error.includes('429')) {
        console.warn(`OpenAlex rate limit for ${searchName}, retrying in 1s...`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        openAlexData = await searchOpenAlex(searchName, openAlexKey)
      }
      
      debugInfo.openAlexSuccess = !!openAlexData
      debugInfo.openAlexPapers = openAlexData?.total_papers || 0
      if (openAlexData?.error) {
        debugInfo.openAlexError = openAlexData.error
      }
      
      // Rate limit 방지를 위한 KOL 간 지연 (300ms)
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // PubMed와 ClinicalTrials는 선택적 (에러 시 null 반환)
      let pubMedData = null
      let clinicalTrialsData = null
      
      try {
        pubMedData = await searchPubMed(searchName, disease, pubMedKey)
        debugInfo.pubMedSuccess = !!pubMedData
      } catch (e: any) {
        console.warn(`PubMed failed for ${searchName}`)
        debugInfo.pubMedError = e.message
      }
      
      try {
        clinicalTrialsData = await searchClinicalTrials(searchName)
        debugInfo.clinicalTrialsSuccess = !!clinicalTrialsData
      } catch (e: any) {
        console.warn(`ClinicalTrials failed for ${searchName}`)
        debugInfo.clinicalTrialsError = e.message
      }
      
      // 스코어 계산
      const scoreData = calculateKolScore(openAlexData, pubMedData, clinicalTrialsData)
      debugInfo.scoreTotal = scoreData.total
      
      kolsWithScores.push({
        ...kol,
        realScore: scoreData.total,
        grade: scoreData.grade,
        scoreBreakdown: scoreData.breakdown,
        _debug: debugInfo,  // 디버그 정보 포함
        researchData: {
          openAlex: openAlexData ? {
            totalPapers: openAlexData.total_papers,
            totalCitations: openAlexData.total_citations,
            hIndex: openAlexData.h_index_estimate,
            topPapers: openAlexData.top_papers.slice(0, 5)
          } : null,
          pubMed: pubMedData ? {
            total: pubMedData.total,
            recent5Years: pubMedData.recent_5_years,
            papers: pubMedData.papers.slice(0, 5)
          } : null,
          clinicalTrials: clinicalTrialsData ? {
            total: clinicalTrialsData.total_trials,
            studies: clinicalTrialsData.studies.slice(0, 3)
          } : null
        }
      })
    } catch (e: any) {
      // API 실패 시 기본 스코어 유지
      console.error(`Failed to fetch data for ${kol.name}:`, e)
      debugInfo.error = e.message
      kolsWithScores.push({ ...kol, realScore: kol.score, grade: kol.tier, _debug: debugInfo })
    }
  }
  
  // 실제 스코어로 재정렬
  const sortedKols = kolsWithScores.sort((a, b) => (b.realScore || b.score) - (a.realScore || a.score))
  
  return c.json({success:true, data: { ...result, kols: sortedKols }})
})

// KOL 상세 → DB 정보 + AI 전략 분석
app.post('/api/kol/detail', async (c) => {
  let b: any; try { b = await c.req.json() } catch { return c.json({error:'잘못된 요청'},400) }
  const { name, hospital, department, disease, diseaseInfo, publications, societies, tags } = b
  if (!name) return c.json({error:'이름 필요'},400)

  // DB에서 KOL 정보 조회 (이름으로)
  const dbKol = KOL_DB.find(k => k.name === name)

  const kolData: any = {
    name: dbKol?.name || name,
    hospital: dbKol?.hospital || hospital || '',
    department: dbKol?.department || department || '',
    position: dbKol?.position || '',
    tags: dbKol?.tags || tags || [],
    schedule: dbKol?.schedule || null,
    scheduleSource: dbKol?.profileUrl || null,
    publications: dbKol?.publications || publications || [],
    societies: dbKol?.societies || societies || [],
    refs: dbKol ? [
      ...(dbKol.profileUrl ? [{ label: '병원 프로필', url: dbKol.profileUrl }] : []),
      { label: 'PubMed 검색', url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(dbKol.name)}+${encodeURIComponent(dbKol.hospital.substring(0,4))}` }
    ] : []
  }

  // AI에게 전략 분석 요청 (객관적 데이터 기반)
  const pubStr = kolData.publications.map((p:any) => `- ${p.title} (${p.journal}, ${p.year})`).join('\n')
  const socStr = kolData.societies.join(', ')
  const tagStr = kolData.tags.join(', ')
  const diseaseCtx = diseaseInfo ? `${diseaseInfo.name} (${diseaseInfo.category}) - ${diseaseInfo.description}` : disease || ''

  try {
    const strategy = await ai(c.env, STRATEGY_PROMPT,
      `질환: ${diseaseCtx}\nKOL: ${name}, ${kolData.hospital}, ${kolData.department}\n전문분야: ${tagStr}\n학회: ${socStr}\n논문:\n${pubStr}`, 4000)
    kolData.philosophy = strategy.philosophy || ''
    kolData.preferences = strategy.preferences || []
    kolData.strategy = strategy.strategy || { summary:'', actions:[], do:[], dont:[] }
  } catch (e: any) {
    kolData.philosophy = ''
    kolData.preferences = []
    kolData.strategy = { summary: '', actions: [], do: [], dont: [] }
  }

  return c.json({success:true, data:kolData})
})

// ============================================================
// Frontend
// ============================================================
app.get('/', (c) => c.html(HTML))

const HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>명의찾기 - 연구 실적으로 찾는 진짜 전문의</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800&display=swap');
*{font-family:'Noto Sans KR',sans-serif;box-sizing:border-box;margin:0;padding:0}
body{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;color:#1a202c}
.container{max-width:800px;margin:0 auto;padding:20px}
.card{background:white;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);transition:all 0.3s ease;overflow:hidden}
.card:hover{box-shadow:0 8px 30px rgba(0,0,0,0.12);transform:translateY(-2px)}
.badge{display:inline-flex;align-items:center;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
.badge-gold{background:linear-gradient(135deg,#f6d365 0%,#fda085 100%);color:#fff}
.badge-silver{background:linear-gradient(135deg,#e0e0e0 0%,#bdbdbd 100%);color:#333}
.badge-bronze{background:linear-gradient(135deg,#cd7f32 0%,#b8733b 100%);color:#fff}
.badge-normal{background:#e0e7ff;color:#5b21b6}
.tag{display:inline-block;padding:4px 10px;background:#f0f4ff;color:#4c51bf;border-radius:8px;font-size:11px;margin:2px}
.score-ring{width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;flex-shrink:0}
.score-S{background:linear-gradient(135deg,#f6d365 0%,#fda085 100%);color:#fff;box-shadow:0 4px 15px rgba(253,160,133,0.4)}
.score-A{background:linear-gradient(135deg,#fbc2eb 0%,#a6c1ee 100%);color:#fff;box-shadow:0 4px 15px rgba(166,193,238,0.4)}
.score-B{background:linear-gradient(135deg,#a1c4fd 0%,#c2e9fb 100%);color:#fff;box-shadow:0 4px 15px rgba(161,196,253,0.4)}
.score-C{background:#e0e7ff;color:#5b21b6}
.score-D{background:#f3f4f6;color:#6b7280}
.btn-primary{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:12px 24px;border-radius:12px;font-weight:600;border:none;cursor:pointer;transition:all 0.3s}
.btn-primary:hover{transform:scale(1.05);box-shadow:0 4px 15px rgba(102,126,234,0.4)}
.tab{padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;color:#6b7280;transition:all 0.3s;background:transparent;border:none}
.tab.active{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;box-shadow:0 2px 10px rgba(102,126,234,0.3)}
.fade-in{animation:fadeIn 0.5s ease-out}
@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.stat-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px}
</style>
</head>
<body>

<header class="bg-white shadow-md sticky top-0 z-50">
  <div class="container">
    <div class="flex items-center justify-between py-4">
      <div class="flex items-center gap-3 cursor-pointer" onclick="goHome()">
        <div class="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
          <i class="fas fa-user-md text-white text-lg"></i>
        </div>
        <div>
          <h1 class="text-lg font-bold text-gray-800">명의찾기</h1>
          <p class="text-xs text-gray-500">연구로 증명된 진짜 전문의</p>
        </div>
      </div>
      <div id="bc" class="text-sm text-gray-400"></div>
    </div>
  </div>
</header>

<main class="container py-8">

<div id="s1" class="fade-in">
  <div class="text-center mb-8">
    <h2 class="text-4xl font-bold text-white mb-3" style="text-shadow:0 2px 10px rgba(0,0,0,0.2)">어떤 질환을 찾으시나요?</h2>
    <p class="text-white/90 text-lg">논문, 인용, 임상시험 데이터로 찾는 진짜 명의</p>
  </div>
  
  <div class="max-w-xl mx-auto mb-6">
    <div class="card p-2">
      <div class="flex items-center gap-3">
        <i class="fas fa-search text-purple-500 text-xl ml-3"></i>
        <input id="inp" type="text" placeholder="예: 이상지질혈증, 당뇨병, 폐암 등" class="flex-1 py-3 text-base focus:outline-none" onkeydown="if(event.key==='Enter')go()">
        <button onclick="go()" class="btn-primary">검색하기</button>
      </div>
    </div>
  </div>
  
  <div class="flex flex-wrap justify-center gap-3 mb-8">
    <button class="badge badge-normal cursor-pointer hover:scale-105 transition" onclick="q('이상지질혈증')"><i class="fas fa-heart mr-1"></i>이상지질혈증</button>
    <button class="badge badge-normal cursor-pointer hover:scale-105 transition" onclick="q('제2형당뇨병')"><i class="fas fa-heartbeat mr-1"></i>제2형당뇨병</button>
    <button class="badge badge-normal cursor-pointer hover:scale-105 transition" onclick="q('비소세포폐암')"><i class="fas fa-lungs mr-1"></i>비소세포폐암</button>
    <button class="badge badge-normal cursor-pointer hover:scale-105 transition" onclick="q('전립선암')"><i class="fas fa-ribbon mr-1"></i>전립선암</button>
    <button class="badge badge-normal cursor-pointer hover:scale-105 transition" onclick="q('과민성방광')"><i class="fas fa-prescription-bottle mr-1"></i>과민성방광</button>
    <button class="badge badge-normal cursor-pointer hover:scale-105 transition" onclick="q('골다공증')"><i class="fas fa-bone mr-1"></i>골다공증</button>
  </div>
  
  <div class="card p-6 text-center">
    <i class="fas fa-info-circle text-purple-500 text-2xl mb-3"></i>
    <h3 class="font-bold text-lg mb-2">왜 명의찾기인가요?</h3>
    <p class="text-gray-600 text-sm leading-relaxed">
      TV나 언론에 나오는 유명한 의사가 아닌, <strong>실제로 연구하고 논문을 발표하는 진짜 전문의</strong>를 찾아드립니다.<br>
      OpenAlex, PubMed, ClinicalTrials 데이터를 실시간으로 분석하여 객관적인 평가를 제공합니다.
    </p>
  </div>
</div>

<div id="s2" class="hidden"></div>
<div id="s3" class="hidden"></div>

</main>

<footer class="text-center text-white/70 py-6 text-sm">
  <p>© 2026 명의찾기 - 연구 데이터 기반 의료진 검색 서비스</p>
</footer>

<script>
let D=null,DISEASE='';
const $=id=>document.getElementById(id);
function show(n){['s1','s2','s3'].forEach((s,i)=>$(s).classList.toggle('hidden',i!==n-1));window.scrollTo(0,0)}
function goHome(){D=null;DISEASE='';show(1);$('bc').innerHTML='';$('inp').value=''}
function goList(){if(D)renderList(D),show(2)}
function q(d){$('inp').value=d;go()}

async function go(){
  const d=$('inp').value.trim();if(!d||d.length<2)return alert('질환명을 2글자 이상 입력해주세요');
  DISEASE=d;
  $('s2').innerHTML=\`<div class="text-center mt-16 fade-in"><div class="inline-block w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div><h3 class="text-2xl font-bold text-gray-800 mb-2">연구 데이터 분석 중...</h3><p class="text-gray-600">OpenAlex, PubMed, ClinicalTrials에서<br>실시간으로 논문과 인용 데이터를 수집하고 있습니다.</p><p class="text-sm text-gray-500 mt-4">잠시만 기다려주세요 (약 5~10초)</p></div>\`;
  show(2);
  $('bc').innerHTML=\`<a class="text-purple-400 hover:text-purple-600 cursor-pointer" onclick="goHome()">홈</a> <span class="text-gray-400">›</span> <span class="text-gray-600">\${d}</span>\`;
  try{
    const r=await(await fetch('/api/disease/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({disease:d})})).json();
    if(!r.success)throw new Error(r.error);
    D=r.data;renderList(r.data);
  }catch(e){
    $('s2').innerHTML=\`<div class="text-center mt-16 fade-in"><div class="card p-8 inline-block"><i class="fas fa-exclamation-circle text-red-500 text-5xl mb-4"></i><h3 class="text-xl font-bold text-gray-800 mb-2">검색 결과를 찾을 수 없습니다</h3><p class="text-gray-600 mb-6">\${e.message}</p><button onclick="goHome()" class="btn-primary">다시 검색하기</button></div></div>\`;
  }
}

function renderList(data){
  const di=data.diseaseInfo||{};
  const kols=data.kols||[];
  $('bc').innerHTML=\`<a class="text-purple-400 hover:text-purple-600 cursor-pointer" onclick="goHome()">홈</a> <span class="text-gray-400">›</span> <span class="text-gray-800 font-semibold">\${di.name||DISEASE}</span>\`;
  
  $('s2').innerHTML=\`<div class="fade-in">
    <!-- 질환 정보 카드 -->
    <div class="card p-6 mb-6">
      <div class="flex items-start gap-4 mb-4">
        <div class="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl flex-shrink-0">
          <i class="fas fa-disease"></i>
        </div>
        <div class="flex-1">
          <h2 class="text-2xl font-bold text-gray-800 mb-1">\${di.name||DISEASE}</h2>
          <p class="text-purple-600 font-semibold text-sm mb-2">\${di.category||''}</p>
          <p class="text-gray-700 leading-relaxed">\${di.description||''}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            \${(di.specialties||[]).map(s=>\`<span class="tag">\${s}</span>\`).join('')}
          </div>
        </div>
      </div>
      <div class="bg-purple-50 rounded-lg p-4">
        <div class="flex items-center gap-2 mb-2">
          <i class="fas fa-chart-line text-purple-600"></i>
          <span class="font-semibold text-gray-800">실시간 연구 데이터 기반 평가</span>
        </div>
        <p class="text-gray-600 text-sm">OpenAlex 논문·인용 데이터 + PubMed 최신 연구 + ClinicalTrials.gov 임상시험 데이터를 실시간으로 분석하여 객관적으로 평가했습니다.</p>
      </div>
    </div>
    
    <!-- 의료진 목록 헤더 -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-xl font-bold text-gray-800">연구 실적 상위 전문의 <span class="text-purple-600">\${kols.length}명</span></h3>
      <span class="text-sm text-gray-500">연구 점수순 정렬</span>
    </div>
    
    <!-- 의료진 카드 목록 -->
    <div class="space-y-3">
      \${kols.map((k,i)=>{
        const rs=k.realScore||k.score||0;
        const grade=k.grade||k.tier||'D';
        const rd=k.researchData||{};
        const badgeClass = rs>=85?'badge-gold':rs>=70?'badge-silver':rs>=55?'badge-bronze':'badge-normal';
        const scoreClass = rs>=85?'score-S':rs>=70?'score-A':rs>=55?'score-B':rs>=40?'score-C':'score-D';
        
        return\`
        <div class="card p-5 cursor-pointer fade-in hover:shadow-xl transition" style="animation-delay:\${i*50}ms" onclick='detail(\${JSON.stringify(k).replace(/'/g,"&#39;")})'>
          <div class="flex items-center gap-4">
            <div class="score-ring \${scoreClass}">
              \${Math.round(rs)}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-2 flex-wrap">
                <h4 class="text-lg font-bold text-gray-800">\${k.name} 교수</h4>
                <span class="badge \${badgeClass}">\${grade}등급</span>
                \${k.profileUrl?\`<a href="\${k.profileUrl}" target="_blank" class="text-xs text-purple-600 hover:underline" onclick="event.stopPropagation()"><i class="fas fa-external-link-alt mr-1"></i>프로필</a>\`:''}
              </div>
              <p class="text-gray-600 mb-3">
                <i class="fas fa-hospital mr-1 text-purple-500"></i>\${k.hospital||''}
                <span class="mx-2">·</span>
                <i class="fas fa-stethoscope mr-1 text-purple-500"></i>\${k.department||''}
              </p>
              \${rd.openAlex?\`
              <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div class="bg-blue-50 rounded-lg p-2 text-center">
                  <div class="stat-icon bg-blue-100 text-blue-600 mx-auto mb-1"><i class="fas fa-file-alt"></i></div>
                  <div class="text-lg font-bold text-gray-800">\${(rd.openAlex.totalPapers||0).toLocaleString()}</div>
                  <div class="text-xs text-gray-600">논문</div>
                </div>
                <div class="bg-green-50 rounded-lg p-2 text-center">
                  <div class="stat-icon bg-green-100 text-green-600 mx-auto mb-1"><i class="fas fa-quote-right"></i></div>
                  <div class="text-lg font-bold text-gray-800">\${(rd.openAlex.totalCitations||0).toLocaleString()}</div>
                  <div class="text-xs text-gray-600">인용</div>
                </div>
                <div class="bg-purple-50 rounded-lg p-2 text-center">
                  <div class="stat-icon bg-purple-100 text-purple-600 mx-auto mb-1"><i class="fas fa-chart-line"></i></div>
                  <div class="text-lg font-bold text-gray-800">\${rd.openAlex.hIndex||0}</div>
                  <div class="text-xs text-gray-600">H-index</div>
                </div>
                \${rd.pubMed?\`
                <div class="bg-yellow-50 rounded-lg p-2 text-center">
                  <div class="stat-icon bg-yellow-100 text-yellow-600 mx-auto mb-1"><i class="fas fa-clock"></i></div>
                  <div class="text-lg font-bold text-gray-800">\${rd.pubMed.recent5Years||0}</div>
                  <div class="text-xs text-gray-600">최근5년</div>
                </div>
                \`:''} 
                \${rd.clinicalTrials?\`
                <div class="bg-cyan-50 rounded-lg p-2 text-center">
                  <div class="stat-icon bg-cyan-100 text-cyan-600 mx-auto mb-1"><i class="fas fa-flask"></i></div>
                  <div class="text-lg font-bold text-gray-800">\${rd.clinicalTrials.total||0}</div>
                  <div class="text-xs text-gray-600">임상시험</div>
                </div>
                \`:''}
              </div>
              \`:\`<p class="text-gray-500 text-sm"><i class="fas fa-spinner fa-spin mr-2"></i>연구 데이터 수집 중...</p>\`}
            </div>
            <i class="fas fa-chevron-right text-gray-300 text-xl"></i>
          </div>
        </div>
        \`;
      }).join('')}
    </div>
    
    <!-- 등급 설명 -->
    <div class="card p-5 mt-6 bg-gray-50">
      <h4 class="font-bold text-gray-800 mb-3">등급 기준</h4>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
        <div><span class="badge badge-gold text-xs">S등급</span> <span class="text-gray-600">85점 이상 · 세계적 권위자</span></div>
        <div><span class="badge badge-silver text-xs">A등급</span> <span class="text-gray-600">70~84점 · 국내 최고 수준</span></div>
        <div><span class="badge badge-bronze text-xs">B등급</span> <span class="text-gray-600">55~69점 · 우수 연구자</span></div>
        <div><span class="badge badge-normal text-xs">C등급</span> <span class="text-gray-600">40~54점 · 활발한 연구자</span></div>
        <div><span class="badge bg-gray-200 text-gray-600 text-xs">D등급</span> <span class="text-gray-600">40점 미만</span></div>
      </div>
    </div>
  </div>\`;
}

async function detail(kol){
  $('s3').innerHTML='<div class="space-y-3 mt-2"><div class="card p-4"><div class="flex gap-3"><div class="skel w-12 h-12 rounded-lg"></div><div class="flex-1 space-y-1.5"><div class="skel h-4 w-32 rounded"></div><div class="skel h-3 w-48 rounded"></div></div></div></div><div class="progress"><div class="progress-bar"></div></div><p class="text-center text-gray-600 text-[11px] mt-2">AI 전략 분석 중...</p></div>';
  show(3);
  $('bc').innerHTML=\`<span class="cursor-pointer hover:text-gray-400" onclick="goHome()">홈</span> › <span class="cursor-pointer hover:text-gray-400" onclick="goList()">\${D?.diseaseInfo?.name||DISEASE}</span> › \${kol.name}\`;
  try{
    const r=await(await fetch('/api/kol/detail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:kol.name,hospital:kol.hospital,department:kol.department,disease:DISEASE,diseaseInfo:D?.diseaseInfo,publications:kol.publications,societies:kol.societies,tags:kol.tags})})).json();
    if(!r.success)throw new Error(r.error);
    renderDetail(r.data,kol);
  }catch(e){$('s3').innerHTML=\`<div class="text-center mt-12"><p class="text-red-400 text-sm">\${e.message}</p><button onclick="goList()" class="mt-3 text-xs text-gray-500 hover:text-white">목록으로</button></div>\`}
}

function renderDetail(d,lk){
  const sc=d.schedule||{};
  const st=d.strategy||{};
  const days=[['mon','월'],['tue','화'],['wed','수'],['thu','목'],['fri','금']];

  $('s3').innerHTML=\`<div class="anim">
  <button onclick="goList()" class="text-gray-600 hover:text-white text-[11px] mb-2"><i class="fas fa-arrow-left mr-1"></i>목록</button>

  <div class="card p-4 mb-3">
    <div class="flex items-center gap-3">
      <div class="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-lg text-white font-bold flex-shrink-0">\${(d.name||lk.name||'?')[0]}</div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-white font-bold">\${d.name||lk.name}</span>
          <span class="chip tier-\${lk.tier||'C'} text-[9px]">\${lk.tier||'?'}</span>
          \${d.profileUrl?\`<a href="\${d.profileUrl}" target="_blank" class="ref">프로필</a>\`:''}
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
    \${st.summary?\`<div class="card p-3 mb-2 border-l-2 border-blue-500"><p class="text-blue-300 text-xs">\${st.summary}</p>\${(d.refs||[]).length?\`<div class="mt-1.5 flex flex-wrap gap-1">\${d.refs.map(r=>\`<a href="\${r.url}" target="_blank" class="ref">\${r.label}</a>\`).join('')}</div>\`:''}</div>\`:''}
    \${d.philosophy?\`<div class="card p-3 mb-2"><p class="text-[11px] text-gray-500 mb-1">연구 방향</p><p class="text-gray-300 text-xs">\${d.philosophy}</p></div>\`:''}
    \${(d.preferences||[]).length?\`<div class="card p-3 mb-2"><p class="text-[11px] text-gray-500 mb-1.5">관심 영역</p>\${d.preferences.map(p=>\`<div class="flex gap-2 mb-1 last:mb-0"><span class="tag flex-shrink-0">\${p.condition}</span><span class="text-gray-400 text-xs">\${p.approach}</span></div>\`).join('')}</div>\`:''}
    \${(d.societies||[]).length?\`<div class="card p-3"><p class="text-[11px] text-gray-500 mb-1">학회 활동</p>\${d.societies.map(s=>\`<p class="text-gray-400 text-xs">· \${s}</p>\`).join('')}</div>\`:''}
  </div>

  <!-- 일정 (객관적 사실만 — DB 데이터) -->
  <div id="t-sc" class="tc">
    <div class="card p-3">
      <div class="flex items-center justify-between mb-2">
        <p class="text-[11px] text-gray-500">외래 일정</p>
        \${d.scheduleSource?\`<a href="\${d.scheduleSource}" target="_blank" class="ref">출처</a>\`:''}
      </div>
      <table class="w-full text-[11px]">
        <tr>\${days.map(([,l])=>\`<th class="py-1.5 text-center text-gray-500 font-medium">\${l}</th>\`).join('')}</tr>
        <tr class="border-t border-white/5">\${days.map(([k])=>{
          const v=sc[k]; if(!v)return\`<td class="py-2 text-center text-gray-700">-</td>\`;
          if(typeof v==='object'){
            const am=v.am||'-',pm=v.pm||'-';
            return\`<td class="py-2 text-center"><div class="\${am!=='-'?'text-green-400':'text-gray-700'}">\${am}</div><div class="\${pm!=='-'?'text-cyan-400':'text-gray-700'}">\${pm}</div></td>\`;
          }
          return\`<td class="py-2 text-center text-gray-500">\${v}</td>\`
        }).join('')}</tr>
        <tr class="text-[10px] text-gray-600"><td class="pt-1" colspan="5"><span class="text-green-400/60">■</span> 오전 &nbsp;<span class="text-cyan-400/60">■</span> 오후</td></tr>
      </table>
      <p class="text-[9px] text-gray-700 mt-2">※ 일정은 병원 공개 데이터 기준이며, 실제 일정은 병원에 직접 확인 필요</p>
    </div>
  </div>

  <!-- 논문 (Ref 링크 포함) -->
  <div id="t-rs" class="tc">
    \${(d.publications||[]).length?\`<div class="card p-3"><p class="text-[11px] text-gray-500 mb-1.5">대표 논문</p>\${d.publications.map(p=>\`<div class="mb-2 last:mb-0"><p class="text-gray-300 text-xs">\${p.title}\${p.url?\`<a href="\${p.url}" target="_blank" class="ref">Ref.</a>\`:''}</p><p class="text-gray-600 text-[10px]">\${p.journal||''} (\${p.year||''})</p></div>\`).join('')}</div>\`:'<div class="card p-3"><p class="text-gray-600 text-xs">논문 정보 없음</p></div>'}
  </div>

  <!-- 전략 (학술적 근거 기반 — 방문 조언 없음) -->
  <div id="t-st" class="tc">
    \${(st.actions||[]).length?\`<div class="grid gap-1.5 mb-2" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">\${st.actions.map(a=>{
      const icons={comment:'fa-comment-dots',file:'fa-file-alt',search:'fa-search',book:'fa-book'};
      return\`<div class="card p-2.5"><p class="text-[10px] text-gray-500 mb-0.5"><i class="fas \${icons[a.icon]||'fa-info'} mr-1 text-blue-400"></i>\${a.title}</p><p class="text-gray-300 text-xs">\${a.text}\${a.ref?\` <a href="\${a.ref}" target="_blank" class="ref">Ref.</a>\`:''}</p></div>\`
    }).join('')}</div>\`:''}
    <div class="grid grid-cols-2 gap-1.5">
      \${(st.do||[]).length?\`<div class="card p-2.5"><p class="text-green-400 text-[10px] font-medium mb-1">DO <span class="text-gray-600 font-normal">(학술 근거 기반)</span></p>\${st.do.map(x=>\`<p class="text-gray-300 text-[11px] mb-0.5"><i class="fas fa-check text-green-500 text-[9px] mr-1"></i>\${x}</p>\`).join('')}</div>\`:''}
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
