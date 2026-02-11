-- KOL 분석 이력 테이블
CREATE TABLE IF NOT EXISTS kol_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  name TEXT,
  hospital TEXT,
  specialty TEXT,
  result_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kol_name ON kol_analyses(name);
CREATE INDEX IF NOT EXISTS idx_kol_created ON kol_analyses(created_at);

-- KOL 프로필 데이터베이스 (직접 관리)
CREATE TABLE IF NOT EXISTS kol_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  hospital TEXT NOT NULL,
  department TEXT NOT NULL,
  position TEXT,
  specialty_tags TEXT,          -- JSON array: ["배뇨장애","전립선비대증"]
  education TEXT,               -- JSON array: [{year,school,degree}]
  career TEXT,                  -- JSON array: [{period,institution,role}]
  awards TEXT,                  -- JSON array: [{year,title}]
  publications_count INTEGER DEFAULT 0,
  h_index INTEGER DEFAULT 0,
  clinical_trials INTEGER DEFAULT 0,
  key_publications TEXT,        -- JSON array: [{year,title,journal}]
  society_roles TEXT,           -- JSON array: [{year,society,role}]
  kol_tier TEXT DEFAULT 'C',    -- A/B/C/D
  persona TEXT DEFAULT 'Neutral', -- Champion/Advocate/Supporter/Neutral/Non-Adopter
  prescription_pattern TEXT DEFAULT 'Moderate', -- High Adopter/Moderate/Conservative
  strategy_memo TEXT,           -- 자유 텍스트 메모
  competitor_notes TEXT,        -- JSON: 경쟁사 관련 메모
  visit_notes TEXT,             -- 방문 전략 메모
  source_urls TEXT,             -- JSON array: 출처 URL 목록
  photo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kol_profiles_name ON kol_profiles(name);
CREATE INDEX IF NOT EXISTS idx_kol_profiles_hospital ON kol_profiles(hospital);
CREATE INDEX IF NOT EXISTS idx_kol_profiles_department ON kol_profiles(department);
CREATE INDEX IF NOT EXISTS idx_kol_profiles_tier ON kol_profiles(kol_tier);
