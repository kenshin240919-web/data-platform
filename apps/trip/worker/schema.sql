-- D1 guidejung-trip: the full published trip dataset (scripts/build-trip-d1.mjs fills it).
-- A load writes places_next / regions_next and swaps them in, so visitors never see a half-loaded table.
CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,            -- place | festival
  name TEXT NOT NULL,
  region_id TEXT NOT NULL,
  lat REAL, lon REAL,
  start_date TEXT, end_date TEXT,
  quality REAL NOT NULL DEFAULT 0,
  free INTEGER, kids INTEGER, pet INTEGER, indoor INTEGER,  -- 1 = 해당 (conditions[k] === true)
  text TEXT NOT NULL,            -- lower-case name·address·region·description for 검색어
  card TEXT NOT NULL,            -- slim JSON for cards (same fields as the old search-index.json)
  body TEXT NOT NULL,            -- full JSON for the detail page
  updated TEXT,
  indexable INTEGER,             -- 1 = 검색엔진 노출(sitemap·rss)
  changed TEXT                   -- ISO time of the last source change (rss order)
);
CREATE INDEX IF NOT EXISTS places_kind_quality ON places(kind, quality DESC, name);
CREATE INDEX IF NOT EXISTS places_region ON places(region_id, quality DESC);
CREATE INDEX IF NOT EXISTS places_lat ON places(lat);
CREATE INDEX IF NOT EXISTS places_dates ON places(start_date, end_date);
CREATE INDEX IF NOT EXISTS places_changed ON places(indexable, changed DESC);
CREATE TABLE IF NOT EXISTS regions (id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT, count INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
