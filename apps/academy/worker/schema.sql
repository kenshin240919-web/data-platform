-- D1 guidejung-academy: every 학원·교습소 for academy.guidejung.com (scripts/build-academy-d1.mjs fills it).
CREATE TABLE IF NOT EXISTS academies (
  id TEXT PRIMARY KEY,           -- 나이스 학원지정번호 ACA_ASNUM
  name TEXT NOT NULL,
  type TEXT,                     -- 학원 | 교습소
  region_id TEXT NOT NULL,       -- "서울-강남구"
  lat REAL, lon REAL,
  subjects TEXT NOT NULL,        -- " math english " (공백으로 감싼 과목 키, LIKE '% math %')
  grades TEXT NOT NULL,          -- " elem middle "
  realm TEXT,                    -- 입시 | 예체능 | 외국어 | 기타
  fee_min INTEGER, fee_max INTEGER, fee_n INTEGER NOT NULL DEFAULT 0,
  rank REAL NOT NULL DEFAULT 0,
  text TEXT NOT NULL,            -- lower-case 이름·주소·과정 for 검색어
  card TEXT NOT NULL,            -- slim JSON for cards
  body TEXT NOT NULL,            -- full JSON for the detail page
  first_seen TEXT,               -- 처음 수집된 날(새로 생긴 학원)
  stage INTEGER NOT NULL DEFAULT 3  -- 사이트맵 단계: 1 정적 페이지에서 링크됨, 2 수강료 공개, 3 나머지 (worker SITEMAP_STAGE)
);
CREATE INDEX IF NOT EXISTS academies_region ON academies(region_id, rank DESC);
CREATE INDEX IF NOT EXISTS academies_geo ON academies(lat, lon, rank, id);
CREATE INDEX IF NOT EXISTS academies_new ON academies(first_seen DESC);
CREATE INDEX IF NOT EXISTS academies_stage ON academies(stage, id);
CREATE TABLE IF NOT EXISTS regions (id TEXT PRIMARY KEY, name TEXT NOT NULL, sido TEXT NOT NULL, zone TEXT NOT NULL, count INTEGER NOT NULL, lat REAL, lon REAL, stats TEXT NOT NULL);  -- stats: 과목별 수강료·정원 중앙값(collect-academy.py region_stats)
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
