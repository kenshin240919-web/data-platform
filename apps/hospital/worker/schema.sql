-- D1 guidejung-hospital: every 병·의원 for hospital.guidejung.com (scripts/build-hospital-d1.mjs fills it).
CREATE TABLE IF NOT EXISTS hospitals (
  id TEXT PRIMARY KEY,           -- 국립중앙의료원 기관 ID (hpid)
  name TEXT NOT NULL,
  div TEXT,                      -- 의원 | 병원 | 종합병원 | 한의원 | 치과의원 …
  region_id TEXT NOT NULL,       -- weather 시군구 코드
  sido TEXT,                     -- 서울특별시 … (응급실 실시간 병상 STAGE1)
  lat REAL, lon REAL,
  depts TEXT NOT NULL,           -- " pediatrics ent " (LIKE '% ent %')
  er INTEGER NOT NULL DEFAULT 0,
  night INTEGER NOT NULL DEFAULT 0, sat INTEGER NOT NULL DEFAULT 0, sun INTEGER NOT NULL DEFAULT 0, hol INTEGER NOT NULL DEFAULT 0,
  rank REAL NOT NULL DEFAULT 0,
  text TEXT NOT NULL,            -- lower-case 이름·주소·종류 for 검색어
  card TEXT NOT NULL,            -- slim JSON (hours included: lists compute '지금 진료 중')
  body TEXT NOT NULL             -- full JSON for the detail page
);
CREATE INDEX IF NOT EXISTS hospitals_region ON hospitals(region_id, rank DESC);
CREATE INDEX IF NOT EXISTS hospitals_geo ON hospitals(lat, lon, id);
CREATE INDEX IF NOT EXISTS hospitals_er ON hospitals(er, sido);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
