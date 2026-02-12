import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = { OPENAI_API_KEY: string; OPENAI_BASE_URL: string }
const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors())

app.get('/api/health', (c) => c.json({ status: 'ok', version: '10.1' }))

// ============================================================
// KOL DATABASE — 실제 교수 데이터 (수동 관리)
// ============================================================
interface KolEntry {
  name: string
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

// 약품→치료영역 매핑 (AI가 분류하지 않고 직접 매핑)
const DRUG_AREA_MAP: Record<string, {areas:string[], drugInfo:{genericName:string,drugClass:string,indication:string,therapyArea:string}}> = {
  "피타바스타틴": {areas:["심혈관","지질대사","스타틴"], drugInfo:{genericName:"피타바스타틴(Pitavastatin)",drugClass:"HMG-CoA 환원효소 억제제(스타틴)",indication:"고콜레스테롤혈증 및 이상지질혈증 치료",therapyArea:"심혈관/지질대사"}},
  "아토르바스타틴": {areas:["심혈관","지질대사","스타틴"], drugInfo:{genericName:"아토르바스타틴(Atorvastatin)",drugClass:"HMG-CoA 환원효소 억제제(스타틴)",indication:"고콜레스테롤혈증, 이상지질혈증 및 심혈관 위험 감소",therapyArea:"심혈관/지질대사"}},
  "로수바스타틴": {areas:["심혈관","지질대사","스타틴"], drugInfo:{genericName:"로수바스타틴(Rosuvastatin)",drugClass:"HMG-CoA 환원효소 억제제(스타틴)",indication:"이상지질혈증 치료 및 심혈관 위험 감소",therapyArea:"심혈관/지질대사"}},
  "엠파글리플로진": {areas:["당뇨","SGLT2","심부전","신장"], drugInfo:{genericName:"엠파글리플로진(Empagliflozin)",drugClass:"SGLT2 억제제",indication:"제2형 당뇨병 치료 및 심부전·만성 신장질환 관리",therapyArea:"당뇨/심신장"}},
  "다파글리플로진": {areas:["당뇨","SGLT2","심부전","신장"], drugInfo:{genericName:"다파글리플로진(Dapagliflozin)",drugClass:"SGLT2 억제제",indication:"제2형 당뇨병 치료 및 심부전 관리",therapyArea:"당뇨/심신장"}},
  "펨브롤리주맙": {areas:["종양","면역항암","PD-1","폐암"], drugInfo:{genericName:"펨브롤리주맙(Pembrolizumab)",drugClass:"PD-1 면역관문억제제",indication:"비소세포폐암, 위암, 흑색종 등 다수 고형암의 면역항암 치료",therapyArea:"종양/면역항암"}},
  "니볼루맙": {areas:["종양","면역항암","PD-1"], drugInfo:{genericName:"니볼루맙(Nivolumab)",drugClass:"PD-1 면역관문억제제",indication:"비소세포폐암, 신세포암, 두경부암 등의 면역항암 치료",therapyArea:"종양/면역항암"}},
  "엔잘루타마이드": {areas:["비뇨기","전립선암","비뇨종양","엔잘루타마이드"], drugInfo:{genericName:"엔잘루타마이드(Enzalutamide)",drugClass:"안드로겐 수용체 억제제",indication:"전이성 거세저항성 전립선암(mCRPC) 치료",therapyArea:"비뇨기/전립선암"}},
  "미라베그론": {areas:["비뇨기","과민성방광","배뇨장애","미라베그론"], drugInfo:{genericName:"미라베그론(Mirabegron)",drugClass:"베타3-아드레날린 수용체 작용제",indication:"과민성방광(OAB)의 절박뇨, 빈뇨, 절박성 요실금 치료",therapyArea:"비뇨기/배뇨장애"}},
  "denosumab": {areas:["골다공증","denosumab","골대사"], drugInfo:{genericName:"데노수맙(Denosumab)",drugClass:"RANKL 억제제(단클론항체)",indication:"폐경 후 골다공증 치료 및 골절 위험 감소",therapyArea:"골다공증/골대사"}},
  "Denosumab": {areas:["골다공증","denosumab","골대사"], drugInfo:{genericName:"데노수맙(Denosumab)",drugClass:"RANKL 억제제(단클론항체)",indication:"폐경 후 골다공증 치료 및 골절 위험 감소",therapyArea:"골다공증/골대사"}},
  "데노수맙": {areas:["골다공증","denosumab","골대사"], drugInfo:{genericName:"데노수맙(Denosumab)",drugClass:"RANKL 억제제(단클론항체)",indication:"폐경 후 골다공증 치료 및 골절 위험 감소",therapyArea:"골다공증/골대사"}},
}

function findKols(drugName: string): {drugInfo: any, kols: any[]} | null {
  const key = Object.keys(DRUG_AREA_MAP).find(k => drugName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(drugName.toLowerCase()))
  if (!key) return null
  const mapping = DRUG_AREA_MAP[key]
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
  return { drugInfo: mapping.drugInfo, kols: matched }
}

// ============================================================
// AI PROMPT — DB 데이터 기반 전략 분석만 (KOL 생성 X)
// ============================================================
const STRATEGY_PROMPT = `약품-KOL 학술 전략 분석기. 주어진 논문·학회 데이터만 기반으로 분석.
규칙: 추측금지, 방문조언금지, 경쟁사금지, 없는정보생성금지, 각필드 1-2문장
actions의 text에 근거 논문제목/학회명 필수 명시. DO/DONT는 학술적 관점만.
JSON응답: {"philosophy":"연구방향 한문장","preferences":[{"condition":"연구질환","approach":"논문에서 보인 접근법"}],"strategy":{"summary":"약품-KOL 학술접점 한문장","actions":[{"icon":"comment","title":"학술화제","text":"논문기반 대화주제(논문명포함)","ref":"PubMed URL"},{"icon":"file","title":"근거자료","text":"연구분야 맞는 자료(학회/가이드라인명포함)","ref":"URL"}],"do":["학술근거 접근법(논문명포함)"],"dont":["피할 접근법"]}}`

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

// 약품 검색 → DB에서 KOL 목록 반환 (AI 호출 없음, 즉시 응답)
app.post('/api/drug/analyze', async (c) => {
  let b: any; try { b = await c.req.json() } catch { return c.json({error:'잘못된 요청'},400) }
  const { drug } = b
  if (!drug || drug.trim().length < 2) return c.json({error:'약품명 2글자 이상'},400)
  const result = findKols(drug.trim())
  if (!result) return c.json({error:`'${drug}' 은(는) 아직 DB에 등록되지 않은 약품입니다. 현재 지원: 피타바스타틴, 엠파글리플로진, 펨브롤리주맙, 엔잘루타마이드, 미라베그론, 데노수맙(Denosumab) 등`},404)
  return c.json({success:true, data:result})
})

// KOL 상세 → DB 정보 + AI 전략 분석
app.post('/api/kol/detail', async (c) => {
  let b: any; try { b = await c.req.json() } catch { return c.json({error:'잘못된 요청'},400) }
  const { name, hospital, department, drug, drugInfo, publications, societies, tags } = b
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
  const drugCtx = drugInfo ? `${drugInfo.genericName} (${drugInfo.drugClass}) - ${drugInfo.indication}` : drug || ''

  try {
    const strategy = await ai(c.env, STRATEGY_PROMPT,
      `약품: ${drugCtx}\nKOL: ${name}, ${kolData.hospital}, ${kolData.department}\n전문분야: ${tagStr}\n학회: ${socStr}\n논문:\n${pubStr}`, 4000)
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
.ref{font-size:9px;padding:0 5px;border-radius:8px;background:rgba(34,197,94,.1);color:#4ade80;cursor:pointer;text-decoration:none;margin-left:4px;vertical-align:super}
.ref:hover{background:rgba(34,197,94,.2)}
.progress{height:3px;background:rgba(59,130,246,.15);border-radius:2px;overflow:hidden;margin-top:8px}
.progress-bar{height:100%;background:#3b82f6;border-radius:2px;animation:prog 12s linear}
@keyframes prog{from{width:0}to{width:100%}}
</style>
</head>
<body>

<header class="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-white/5">
  <div class="max-w-4xl mx-auto px-4 h-11 flex items-center gap-2">
    <div class="w-6 h-6 rounded bg-blue-600 flex items-center justify-center"><i class="fas fa-crosshairs text-white text-[10px]"></i></div>
    <span class="font-bold text-white text-sm cursor-pointer" onclick="goHome()">KOL Targeting</span>
    <div id="bc" class="text-[11px] text-gray-600 ml-1"></div>
    <div class="flex-1"></div>
    <span class="text-[9px] text-gray-700">DB v10.1</span>
  </div>
</header>

<main class="max-w-4xl mx-auto px-4 py-4">

<div id="s1" class="anim">
  <div class="text-center mt-16 mb-6">
    <h2 class="text-2xl font-bold text-white mb-1">약품명으로 KOL 찾기</h2>
    <p class="text-gray-600 text-xs">DB 기반 실제 교수 데이터 · AI 전략 분석</p>
  </div>
  <div class="max-w-md mx-auto mb-4">
    <div class="relative">
      <i class="fas fa-pills absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-sm"></i>
      <input id="inp" type="text" placeholder="예: 피타바스타틴" class="w-full pl-9 pr-16 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500" onkeydown="if(event.key==='Enter')go()">
      <button onclick="go()" class="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-500">검색</button>
    </div>
  </div>
  <div class="flex flex-wrap justify-center gap-1.5 mb-16">
    <span class="chip bg-white/5 text-gray-500 cursor-pointer hover:text-blue-300" onclick="q('피타바스타틴')">피타바스타틴</span>
    <span class="chip bg-white/5 text-gray-500 cursor-pointer hover:text-blue-300" onclick="q('엠파글리플로진')">엠파글리플로진</span>
    <span class="chip bg-white/5 text-gray-500 cursor-pointer hover:text-blue-300" onclick="q('엔잘루타마이드')">엔잘루타마이드</span>
    <span class="chip bg-white/5 text-gray-500 cursor-pointer hover:text-blue-300" onclick="q('펨브롤리주맙')">펨브롤리주맙</span>
    <span class="chip bg-white/5 text-gray-500 cursor-pointer hover:text-blue-300" onclick="q('미라베그론')">미라베그론</span>
    <span class="chip bg-white/5 text-gray-500 cursor-pointer hover:text-blue-300" onclick="q('Denosumab')">Denosumab</span>
  </div>
</div>

<div id="s2" class="hidden"></div>
<div id="s3" class="hidden"></div>

</main>

<script>
let D=null,DRUG='';
const $=id=>document.getElementById(id);
function show(n){['s1','s2','s3'].forEach((s,i)=>$(s).classList.toggle('hidden',i!==n-1));window.scrollTo(0,0)}
function goHome(){D=null;DRUG='';show(1);$('bc').innerHTML='';$('inp').value=''}
function goList(){if(D)renderList(D),show(2)}
function q(d){$('inp').value=d;go()}
function ref(url){return url?\`<a href="\${url}" target="_blank" class="ref">Ref.</a>\`:''}

async function go(){
  const d=$('inp').value.trim();if(!d||d.length<2)return;
  DRUG=d;
  $('s2').innerHTML='<div class="text-center mt-8"><div class="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div><p class="text-gray-600 text-xs mt-2">DB 검색 중...</p></div>';
  show(2);
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
    <div class="text-[11px] text-gray-600 mb-2">KOL \${kols.length}명 · DB 기반 · 관련도순</div>
    <div class="space-y-1.5">
    \${kols.map((k,i)=>\`
      <div class="card p-3 cursor-pointer anim" style="animation-delay:\${i*40}ms" onclick='detail(\${JSON.stringify(k).replace(/'/g,"&#39;")})'>
        <div class="flex items-center gap-2.5">
          <div class="ring \${k.score>=90?'bg-green-500/15 text-green-400':k.score>=85?'bg-yellow-500/15 text-yellow-400':'bg-gray-500/15 text-gray-400'}">\${k.score}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-white font-semibold text-[13px]">\${k.name}</span>
              <span class="chip tier-\${k.tier||'C'} text-[9px]">\${k.tier||'?'}</span>
              \${k.profileUrl?\`<a href="\${k.profileUrl}" target="_blank" class="ref" onclick="event.stopPropagation()">프로필</a>\`:''}
            </div>
            <p class="text-gray-500 text-[11px] truncate">\${k.hospital||''} · \${k.department||''} · \${k.position||''}</p>
            <div class="flex flex-wrap gap-1 mt-0.5">\${(k.tags||[]).slice(0,3).map(t=>\`<span class="tag">\${t}</span>\`).join('')}</div>
          </div>
          <i class="fas fa-chevron-right text-gray-700 text-xs"></i>
        </div>
      </div>
    \`).join('')}
    </div>
  </div>\`;
}

async function detail(kol){
  $('s3').innerHTML='<div class="space-y-3 mt-2"><div class="card p-4"><div class="flex gap-3"><div class="skel w-12 h-12 rounded-lg"></div><div class="flex-1 space-y-1.5"><div class="skel h-4 w-32 rounded"></div><div class="skel h-3 w-48 rounded"></div></div></div></div><div class="progress"><div class="progress-bar"></div></div><p class="text-center text-gray-600 text-[11px] mt-2">AI 전략 분석 중...</p></div>';
  show(3);
  $('bc').innerHTML=\`<span class="cursor-pointer hover:text-gray-400" onclick="goHome()">홈</span> › <span class="cursor-pointer hover:text-gray-400" onclick="goList()">\${D?.drugInfo?.genericName||DRUG}</span> › \${kol.name}\`;
  try{
    const r=await(await fetch('/api/kol/detail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:kol.name,hospital:kol.hospital,department:kol.department,drug:DRUG,drugInfo:D?.drugInfo,publications:kol.publications,societies:kol.societies,tags:kol.tags})})).json();
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
