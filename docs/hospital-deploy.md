# hospital.guidejung.com (내근처 병원) 배포 안내

## 구조
- 정적 페이지: `apps/hospital` (Next.js export → `out`). 메인(내 주변 지금 진료 중·과목 버튼·가까운 응급실), `/region`, `/region/{시군구}`, `/region/{시군구}/{과목|night|sunday|holiday}`(내용 있는 곳만), `/er`, `/search`(noindex), 안내 3종, `sitemap-pages.xml`, `rss.xml`. 데이터 `apps/hospital/data/summary.json`(지역·과목 통계와 대표 병원).
- Worker `guidejung-hospital`: `/api/near`·`/api/search`(D1), `/api/er`(D1 응급실 + 실시간 병상, KV `hospital:er:{시도}` 5분), `/api/where`, `/api/status`, 상세 `/hospital/{hpid}`(`/hospital/shell` 틀, 5분 단위 캐시), `/sitemap.xml` 묶음(`sitemap-hospitals-{n}.xml` 4만 건씩).
- D1 `guidejung-hospital`(id 527391ea-258a-45e4-92f5-1e20a77a7230, 10/21 Claude가 Actions `hospital-setup.yml`로 생성), 표 `apps/hospital/worker/schema.sql`, 적재 `scripts/build-hospital-d1.mjs`(바뀐 행만).
- 수집: Actions `hospital-collect.yml` 매일 04:57 KST — 병·의원 목록 + 진료과목 코드별 목록(약 50회 호출) → D1 → summary.json 커밋.

## Cloudflare 설정 (사용자, 처음 한 번)
1. Workers & Pages → Create → Import a repository → `data-platform`
2. 이름 `guidejung-hospital`, Build command 비움, Deploy command `npx wrangler deploy -c apps/hospital/wrangler.jsonc`, 비프로덕션 분기 빌드 끔
3. 빌드 감시 경로: `apps/hospital/**`, `apps/weather/data/**`, `apps/traffic/data/**`, `packages/**`, `scripts/prune-rsc.mjs`, `package.json`, `package-lock.json`
4. Settings → Variables and Secrets → Secret `DATA_GO_KR_KEY`(응급실 실시간 병상용, GitHub와 같은 값)
5. 배포 후 Domains & Routes → Custom domain `hospital.guidejung.com`
- D1·KV는 이미 있음(D1은 Claude가 Actions로 생성 — GitHub 토큰은 D1 권한만 있고 Worker 배포 권한은 없음).

## 확인
- `/api/status`(D1 버전·key true), `/api/near?lat=37.4955&lon=127.0563&km=1&dept=pediatrics`, `/api/er?lat=37.5665&lon=126.978`, `/region/11680`, `/region/11680/pediatrics`, `/sitemap.xml`
