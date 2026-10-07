-- 신규 GuideJung PostgreSQL에만 수동 적용. 기존 사이트 DB에서는 실행하지 않음.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE INDEX IF NOT EXISTS places_geography_gist ON core.places
USING gist ((ST_SetSRID(ST_MakePoint(longitude, latitude),4326)::geography))
WHERE longitude IS NOT NULL AND latitude IS NOT NULL;
-- 반경 검색 예시: ST_DWithin(ST_SetSRID(ST_MakePoint(longitude,latitude),4326)::geography,
-- ST_SetSRID(ST_MakePoint(:lon,:lat),4326)::geography, :radius_metres)
