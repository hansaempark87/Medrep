-- 정성진 교수 시드 데이터 (분당서울대학교병원 비뇨의학과)
-- 출처: 병원 소개페이지 + YouTube 건강강좌 2편 분석 결과 반영
INSERT OR IGNORE INTO kol_profiles (
  name, hospital, department, position, specialty_tags,
  education, career, awards,
  publications_count, h_index, clinical_trials,
  key_publications, society_roles,
  kol_tier, persona, prescription_pattern,
  strategy_memo, visit_notes, source_urls,
  clinic_schedule, treatment_philosophy, treatment_preferences,
  media_appearances, research_focus, books_patents
) VALUES (
  '정성진',
  '분당서울대학교병원',
  '비뇨의학과',
  '교수',
  '["배뇨장애","요실금","전립선비대증(BPH)","과민성방광(OAB)","신경인성방광","야간뇨","야간다뇨","간질성방광염"]',

  '[{"year":"1997","school":"서울대학교 의과대학","degree":"의학학사"},{"year":"2001","school":"서울대학교 의과대학원","degree":"의학석사"},{"year":"2008","school":"서울대학교 의과대학원","degree":"의학박사"}]',

  '[{"period":"1997-1998","institution":"서울대학교병원","role":"인턴"},{"period":"1998-2002","institution":"서울대학교병원","role":"비뇨의학과 전공의"},{"period":"2002-2005","institution":"공군 제10 전투비행단","role":"항공의무대 항공의무실장"},{"period":"2005-2006","institution":"서울대학교병원","role":"비뇨의학과 임상강사"},{"period":"2006-2007","institution":"분당서울대학교병원","role":"비뇨의학과 촉탁조교수"},{"period":"2007-2012","institution":"분당서울대학교병원","role":"비뇨의학과 조교수"},{"period":"2012-2022","institution":"분당서울대학교병원","role":"비뇨의학과 부교수"},{"period":"2017-2018","institution":"Stanford Medical Center","role":"Urology Visiting Scholar"},{"period":"2022-현재","institution":"분당서울대학교병원","role":"비뇨의학과 교수"}]',

  '[{"year":"2008","title":"우수논문상(임상)"},{"year":"2010","title":"우수논문상(기초)"},{"year":"2011","title":"European Best Poster Award (EAU)"},{"year":"2011","title":"임상 우수논문상 및 해외발표 우수논문상"},{"year":"2012","title":"학술상(임상)"},{"year":"2013","title":"우수논문상(임상)"},{"year":"2014","title":"Best Poster Award (EAU 유럽비뇨기과학회)"},{"year":"2015","title":"우수논문상(임상)"},{"year":"2016","title":"우수논문상(임상)"},{"year":"2020","title":"우수논문상(임상)"}]',

  120, 25, 8,

  '[{"year":"2024","title":"Definition Change and Update of Clinical Guidelines for Interstitial Cystitis and Bladder Pain Syndrome","journal":"Low Urin Tract Symptoms","note":"간질성방광염 가이드라인 업데이트 참여 - 진료 기준 변경에 직접 관여"},{"year":"2024","title":"Comparison of partial and total cystectomy for colorectal cancer with histologically confirmed bladder invasion","journal":"Surgery","note":"방광침범 대장암 수술 비교연구"},{"year":"2024","title":"Impact of detrusor underactivity on surgical outcomes","journal":"BJU International","note":"방광수축력저하가 수술 결과에 미치는 영향 - 수술 전 요역동학 검사 중요성 강조"},{"year":"2024","title":"Validation of acoustic voided volume measure: a pilot study","journal":"Scientific Reports","note":"비침습적 배뇨량 측정 음향기술 개발 - 혁신적 진단 도구 연구"}]',

  '[{"year":"2014","society":"대한배뇨장애요실금학회","role":"재무이사"},{"year":"2016","society":"대한노인요양비뇨의학회","role":"이사"},{"year":"2018","society":"대한배뇨장애요실금학회","role":"UAB위원회 이사"},{"year":"2018","society":"대한척수학회","role":"대외협력이사"},{"year":"2019","society":"Investigative and Clinical Urology","role":"Editorial Associate"},{"year":"2020","society":"대한척수학회","role":"감사"},{"year":"2021","society":"대한배뇨장애요실금학회","role":"학술이사"}]',

  'A', 'Champion', 'High Adopter',

  '국내 기능비뇨의학(배뇨장애/요실금) 분야 핵심 KOL. Stanford 방문교수 경력으로 글로벌 네트워크 보유. 대한배뇨장애요실금학회 학술이사로 학회 내 영향력 높음. 가이드라인 저자로 참여(2024 간질성방광염). 환자 교육에 적극적(SNUBH 건강강좌 시리즈). 진료에서 배뇨일지(bladder diary) 작성을 매우 중시하며, 데이터 기반 치료 결정을 선호함. 신기술(음향 배뇨량 측정 등) 연구에도 관심이 높아 혁신적 제품에 대한 수용성이 높을 것으로 판단.',

  '분당서울대병원 비뇨의학과 외래는 보통 오전 진료 위주. 오후는 수술/시술 일정이 많으므로 방문 시 오전 외래 종료 시점(11:30~12:00) 또는 학회 시즌 전후가 적절. 학술적 근거를 매우 중시하므로 방문 시 반드시 최신 논문/가이드라인 업데이트 자료 준비. 배뇨일지 활용도가 높으므로 관련 디지털 도구나 환자 교육 자료가 좋은 접근 포인트.',

  '["https://www.snubh.org/medical/drIntroduce.do?DP_TP=O&DP_CD=UR&grp_val=Y&sDpCdDtl=UR&sDrSid=1000935&sDrStfNo=65424&sDpTp=O","https://youtube.com/watch?v=FkjAHj2j5z4","https://youtube.com/watch?v=Tn8_UjFhV10"]',

  '{"mon_am":"진료","mon_pm":"","tue_am":"진료","tue_pm":"수술","wed_am":"","wed_pm":"","thu_am":"진료","thu_pm":"수술","fri_am":"","fri_pm":"","note":"외래는 월·화·목 오전 위주. 오후는 수술/시술. 정확한 일정은 병원 홈페이지에서 재확인 필요."}',

  '환자 개개인의 삶의 질 개선을 최우선으로 하는 치료 철학. \"최신 치료법이라도 환자의 일상에 실제로 적용 가능해야 의미가 있다\"는 신념. 진단의 정확성을 매우 강조하며, 배뇨일지(bladder diary)를 통한 객관적 데이터 수집 후 치료 방향 결정. 단계적 치료 접근(step-up therapy)을 선호: 생활습관 교정 → 약물치료 → 시술/수술 순서. 불필요한 수술을 지양하고, 약물치료 효과를 충분히 확인한 뒤 다음 단계로 진행하는 보수적이면서도 체계적 접근.',

  '[{"category":"BPH(전립선비대증)","preference":"단계적 접근","detail":"경증: 알파차단제 우선 → 중등도: 알파차단제+5-알파환원효소억제제 병용 → 중증/약물불응: 수술(TURP 또는 HoLEP). 최소침습시술(Urolift, Rezum)에도 관심이 높으며, 적합한 환자에게 적극 권유. YouTube 강연에서 HoLEP의 장점을 구체적으로 설명한 바 있음."},{"category":"OAB(과민성방광)","preference":"약물 → 시술 단계적","detail":"1차: 행동치료(방광훈련, 골반근육운동) + 항무스카린제(솔리페나신 등) 또는 베타3작용제(미라베그론). 2차: 약물 불응 시 보톡스 방광내 주입 또는 천수신경자극술(SNM). 유튜브에서 OAB 치료 시 배뇨일지 작성의 중요성 강조."},{"category":"야간뇨/야간다뇨","preference":"원인 감별 후 맞춤치료","detail":"야간다뇨(nocturnal polyuria)인 경우 데스모프레신 적극 활용. 배뇨일지로 야간다뇨 vs 방광용적 감소 감별 진단 후 치료 결정. 유튜브 강연에서 야간뇨의 다양한 원인과 수분 섭취 관리의 중요성을 자세히 설명."},{"category":"진단 도구","preference":"객관적 데이터 기반","detail":"요류측정(uroflowmetry), 요역동학검사(UDS), 경직장초음파(TRUS), 방광경검사 등 적극 활용. 비침습적 방광수축력 예측 연구(acoustic voided volume) 진행 중. PSA 검사와 DRE의 중요성도 강조."}]',

  '[{"type":"YouTube","title":"SNUBH 건강강좌 - 배뇨질환 소개","url":"https://youtube.com/watch?v=FkjAHj2j5z4","date":"","key_points":["전립선비대증·요실금·과민성방광·신경인성방광은 생명 위험은 낮지만 삶의 질을 크게 떨어뜨림","치료 성공의 핵심은 정확한 진단 — 증상이 비슷해도 원인이 다를 수 있음","BPH 치료: TURP vs HoLEP 비교 설명, 최소침습(Urolift/Rezum) 소개","환자 삶의 상황에 맞춘 현실적 치료 적용 강조","진료 철학: 환자 한 분 한 분 상황에 맞춘 최적 치료 제공"]},{"type":"YouTube","title":"SNUBH 건강강좌 - BPH/OAB/야간뇨 상세","url":"https://youtube.com/watch?v=Tn8_UjFhV10","date":"","key_points":["DRE(직장수지검사), PSA, TRUS, 요류측정, 요역동학검사 등 진단 과정 상세 설명","BPH 약물: 알파차단제, 5-알파환원효소억제제의 역할과 부작용(역행성사정 등)","TURP vs HoLEP: 수술 방법별 장단점 비교, 방광 보호 중요성","OAB: 항무스카린제/베타3작용제 → 보톡스 방광내 주입 → 천수신경자극술(SNM) 단계적 치료","야간뇨: 야간다뇨 감별 중요, 데스모프레신 활용, 수분 섭취·카페인·알코올 제한 교육","배뇨일지(bladder diary) 작성이 모든 배뇨질환 진단의 출발점이라고 강조"]}]',

  '기능비뇨의학(Functional Urology) 및 배뇨장애(Voiding Dysfunction) 전문. 핵심 연구 주제: (1) 비침습적 방광수축력 예측 - 음향 배뇨량 측정(acoustic voided volume) 파일럿 연구 진행 중, (2) 간질성방광염/방광통증증후군(IC/BPS) 가이드라인 업데이트 참여, (3) 배뇨근저활동성(detrusor underactivity)이 수술 결과에 미치는 영향 연구, (4) BPH 수술 후 방광기능 변화에 대한 장기 추적 연구. Stanford 방문교수 시절 접한 글로벌 연구 트렌드를 국내 적용하는 데 관심이 높음.',

  '[{"year":"2020","title":"배뇨장애와 요실금 4판","type":"저서(공저)"},{"year":"2019","title":"비뇨의학 6판","type":"저서(공저)"},{"year":"2017","title":"척수장애, 아는만큼 행복한 삶","type":"저서"},{"year":"2015","title":"전립선비대증 진료권고안","type":"가이드라인"},{"year":"2015","title":"배뇨장애와 요실금 3판","type":"저서(공저)"},{"year":"2014","title":"전립선 바로알기 제3판","type":"저서(공저)"},{"year":"2012","title":"Structural and Functional Alteration of the Aging Lower Urinary Tract","type":"챕터(영문)"}]'
);
