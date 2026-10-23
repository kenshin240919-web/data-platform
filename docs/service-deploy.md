# service.guidejung.com 배포 안내 (내근처 서비스센터)

- 앱: `apps/service` (Next.js 정적 `out` + Worker `guidejung-service`, `apps/service/wrangler.jsonc`)
- 데이터: `apps/service/data/centers.json`(약 19MB, gzip 2.3MB) — `scripts/collect-service.py` + Actions `service-collect.yml`(매일 04:47 KST, 바뀔 때만 main 커밋)
  - 정비업체·검사소: 공공데이터포털 표준데이터 API(`DATA_GO_KR_KEY`)
  - 세차장·배출가스 정비: LOCALDATA 파일(`file.localdata.go.kr/file/download/{업종}/info`, 브라우저 UA + Referer 필수, CSV cp949)
  - 좌표 없는 곳(배출가스 전부 등): 이전 좌표 또는 카카오(`KAKAO_REST_KEY`)
- D1·KV·Worker Secret 없음. 상세 `/center/{id}`, 사이트맵 묶음 `/sitemap.xml` → `/sitemap-pages.xml`(Next) + `/sitemap-centers-{n}.xml`(Worker, 4만 개씩).
- 배포: GitHub Actions(oil·parking과 같은 방식) — **사용자 승인 후** `service-deploy.yml`·도메인(`routes` custom_domain).
- 로컬 시험: `npm run build:service` → `npx wrangler deploy -c apps/service/wrangler.jsonc --dry-run --outdir <dir>` → Node 하네스.
