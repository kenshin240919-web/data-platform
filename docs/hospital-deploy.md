# hospital.guidejung.com (내근처 병원) 배포 안내

## 구조
- 정적 페이지: `apps/hospital` (Next.js export → `out`). 메인(내 주변 지금 진료 중·과목 버튼·가까운 응급실), `/region`, `/region/{시군구}`, `/region/{시군구}/{과목|night|sunday|holiday}`(내용 있는 곳만), `/er`, `/search`(noindex), 안내 3종, `sitemap-pages.xml`, `rss.xml`. 데이터 `apps/hospital/data/summary.json`(지역·과목 통계와 대표 병원).
- Worker `guidejung-hospital`: `/api/near`·`/api/search`(D1), `/api/er`(D1 응급실 + 실시간 병상, KV `hospital:er:{시도}` 5분), `/api/where`, `/api/status`, 상세 `/hospital/{hpid}`(`/hospital/shell` 틀, 5분 단위 캐시), `/sitemap.xml` 묶음(`sitemap-hospitals-{n}.xml` 4만 건씩).
- D1 `guidejung-hospital`(id 527391ea-258a-45e4-92f5-1e20a77a7230, 10/21 Claude가 Actions `hospital-setup.yml`로 생성), 표 `apps/hospital/worker/schema.sql`, 적재 `scripts/build-hospital-d1.mjs`(바뀐 행만).
- 수집: Actions `hospital-collect.yml` 매일 04:57 KST — 병·의원 목록 + 진료과목 코드별 목록(약 50회 호출) → D1 → summary.json 커밋.

## 배포 (GitHub Actions, Cloudflare 대시보드 설정 없음)
- `hospital-deploy.yml`: main push(병원·공통 경로), `Hospital collect` 완료 뒤, 수동. `wrangler deploy` 후 Secret `DATA_GO_KR_KEY`를 Worker에 넣음. 도메인은 `wrangler.jsonc` `routes` custom_domain.

## 확인
- `/api/status`(D1 버전·key true), `/api/near?lat=37.4955&lon=127.0563&km=1&dept=pediatrics`, `/api/er?lat=37.5665&lon=126.978`, `/region/11680`, `/region/11680/pediatrics`, `/sitemap.xml`
