-- 정성진 교수 시드 데이터 (분당서울대학교병원 비뇨의학과)
INSERT OR IGNORE INTO kol_profiles (
  name, hospital, department, position, specialty_tags,
  education, career, awards,
  publications_count, h_index, clinical_trials,
  key_publications, society_roles,
  kol_tier, persona, prescription_pattern,
  strategy_memo, competitor_notes, visit_notes,
  source_urls
) VALUES (
  '정성진',
  '분당서울대학교병원',
  '비뇨의학과',
  '교수',
  '["배뇨장애","요실금","전립선비대증","과민성방광","신경인성방광","야간뇨"]',

  '[{"year":"1997","school":"서울대학교 의과대학","degree":"의학학사"},{"year":"2001","school":"서울대학교 의과대학원","degree":"의학석사"},{"year":"2008","school":"서울대학교 의과대학원","degree":"의학박사"}]',

  '[{"period":"1997-1998","institution":"서울대학교병원","role":"인턴"},{"period":"1998-2002","institution":"서울대학교병원","role":"비뇨의학과 전공의"},{"period":"2002-2005","institution":"공군 제10 전투비행단","role":"항공의무대 항공의무실장"},{"period":"2005-2006","institution":"서울대학교병원","role":"비뇨의학과 임상강사"},{"period":"2006-2007","institution":"분당서울대학교병원","role":"비뇨의학과 촉탁조교수"},{"period":"2007-2012","institution":"분당서울대학교병원","role":"비뇨의학과 조교수"},{"period":"2012-2022","institution":"분당서울대학교병원","role":"비뇨의학과 부교수"},{"period":"2017-2018","institution":"Stanford Medical Center","role":"Urology Visiting Scholar"},{"period":"2022-현재","institution":"분당서울대학교병원","role":"비뇨의학과 교수"}]',

  '[{"year":"2008","title":"우수논문상(임상)"},{"year":"2010","title":"우수논문상(기초)"},{"year":"2011","title":"European Best Poster Award"},{"year":"2011","title":"임상 우수논문상 및 해외발표 우수논문상(기초)"},{"year":"2012","title":"학술상(임상)"},{"year":"2013","title":"우수논문상(임상)"},{"year":"2014","title":"Best Poster Award (유럽비뇨기과학회 EAU)"},{"year":"2015","title":"우수논문상(임상)"},{"year":"2016","title":"우수논문상(임상)"},{"year":"2020","title":"우수논문상(임상)"}]',

  120,
  25,
  8,

  '[{"year":"2024","title":"Definition Change and Update of Clinical Guidelines for Interstitial Cystitis and Bladder Pain Syndrome","journal":"Low Urin Tract Symptoms"},{"year":"2024","title":"Comparison of partial and total cystectomy for colorectal cancer with histologically confirmed bladder invasion","journal":"Surgery"},{"year":"2024","title":"Detrusor underactivity의 수술 결과 영향 연구","journal":"BJU International"},{"year":"2024","title":"Validation of acoustic voided volume measure: a pilot study","journal":"Scientific Reports"}]',

  '[{"year":"2014","society":"대한배뇨장애요실금학회","role":"재무이사"},{"year":"2016","society":"대한노인요양비뇨의학회","role":"이사"},{"year":"2018","society":"대한배뇨장애요실금학회","role":"UAB위원회 이사"},{"year":"2018","society":"대한척수학회","role":"대외협력이사"},{"year":"2019","society":"Investigative and Clinical Urology","role":"Editorial Associate"},{"year":"2020","society":"대한척수학회","role":"감사"},{"year":"2021","society":"대한배뇨장애요실금학회","role":"학술이사"}]',

  'A',
  'Champion',
  'High Adopter',

  '배뇨장애/요실금 분야 국내 최고 권위자 중 한 명. Stanford 방문교수 경력. 환자 삶의 질 중심 치료 철학. BPH 치료에서 TURP, HoLEP, Urolift, Rezum 등 최신 시술법에 적극적. 과민성방광(OAB) 치료에서 항무스카린제/베타3 작용제, 보톡스 방광 내 주입, 천수신경자극술(SNM) 등 단계적 치료 접근. 야간뇨/야간다뇨에 대한 데스모프레신 연구 활발. 비침습적 방광수축력 예측 연구 진행 중. 학회에서 활발한 교육 활동(SNUBH 건강강좌 시리즈). 저서 다수: 배뇨장애와 요실금 4판(2020), 비뇨의학 6판(2019), 전립선비대증 진료권고안(2015).',

  '{"competitors":[{"company":"아스텔라스","product":"베시케어(솔리페나신)","status":"OAB 1차 치료제로 다빈도 처방중","threat":"high"},{"company":"대웅제약","product":"베타미가(미라베그론)","status":"베타3 작용제로 OAB 2차 약제 사용 증가","threat":"medium"},{"company":"한미약품","product":"로수젯(로수바스타틴+에제티미브)","status":"관련 진료과 아님","threat":"low"}]}',

  '진료 시간: 오전 외래 위주, 오후 수술/시술. 화요일·목요일 오전 외래 확인 필요. 학술적 근거 중시하며, 배뇨일지(bladder diary) 등 데이터 기반 접근 선호. 학회 시즌(봄/가을) 전후로 학술 미팅 요청 최적. SNUBH 건강강좌 등 환자 교육에 적극적 — 자사 질환 인식 캠페인 연계 가능.',

  '["https://www.snubh.org/medical/drIntroduce.do?DP_TP=O&DP_CD=UR&grp_val=Y&sDpCdDtl=UR&sDrSid=1000935&sDrStfNo=65424&sDpTp=O","https://youtube.com/watch?v=FkjAHj2j5z4","https://youtube.com/watch?v=Tn8_UjFhV10"]'
);
