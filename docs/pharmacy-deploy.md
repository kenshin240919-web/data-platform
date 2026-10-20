# pharmacy.guidejung.com (내근처 약국) 배포 안내

## 구조
- 정적 페이지: `apps/pharmacy` (Next.js export → `apps/pharmacy/out`). 메인(내 주변 지금 문 연 약국)·`/region`·`/region/{시군구코드}`·`/region/{코드}/night|sunday|holiday`(해당 약국이 있는 곳만)·`/search`(noindex)·안내 3종·`sitemap.xml`(약국 상세 포함)·`rss.xml`.
- Worker `guidejung-pharmacy` (`apps/pharmacy/worker/index.ts`): `/api/near`(좌표·반경·조건 open/night/sunday/holiday), `/api/search`, `/api/where`, `/api/status`, 약국 상세 `/pharmacy/{기관ID}`(`/pharmacy/shell` 틀에 채움, 영업 상태 때문에 5분 단위로 새로 만듦).
- 약국 목록은 Worker에 같이 들어감(`apps/pharmacy/data/pharmacies.json`, 약 2만 5천 곳) → **D1·KV·Secret 없음**(Worker는 공공데이터를 직접 부르지 않음).
- 목록 갱신: GitHub Actions `pharmacy-collect.yml` 매일 04:27 KST, 바뀌었을 때만 main 커밋. Secret `DATA_GO_KR_KEY`(이미 있음).
- '지금 영업 중'은 요일별 시간 + 한국 시각으로 계산. 공휴일 표는 `apps/pharmacy/lib/fmt.ts` `HOLIDAYS`(2026·2027) — 해가 바뀌기 전에 다음 해 추가.

## Cloudflare 설정 (사용자)
- Workers & Pages에서 `guidejung-pharmacy`(Git 연결 `data-platform`, Deploy command `npx wrangler deploy -c apps/pharmacy/wrangler.jsonc`, Build command 비움, 비프로덕션 분기 빌드 끔), 도메인 `pharmacy.guidejung.com`.
- 빌드 감시 경로: `apps/pharmacy/**`, `apps/weather/data/**`, `apps/traffic/data/**`, `packages/**`, `scripts/prune-rsc.mjs`, `package.json`, `package-lock.json`.
- (10/20 GitHub Actions로 직접 배포하려 했으나 GitHub의 `CLOUDFLARE_API_TOKEN`은 D1 권한만 있어 모두 실패 → 워크플로 삭제. 사이트는 Cloudflare Git 연결로 배포됨.)

## 확인
- `/api/status`(약국 수·지금 한국 시각), `/pharmacy/C1107932`, `/region/11680`, `/region/11680/night`, `/sitemap.xml`
