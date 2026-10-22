# parking.guidejung.com 배포 안내 (내근처 주차장)

- 앱: `apps/parking` (Next.js 정적 `out` + Worker `guidejung-parking`, `apps/parking/wrangler.jsonc`)
- 데이터: `apps/parking/data/parkings.json` — `scripts/collect-parking.py`(전국주차장정보표준데이터, 1,000행씩 약 19회) + Actions `parking-collect.yml`(매일 04:37 KST, 바뀔 때만 main 커밋). Secrets `DATA_GO_KR_KEY`(활용신청 10/23 승인), `KAKAO_REST_KEY`(좌표 없는 곳만).
- D1·KV·Worker Secret 없음(목록을 Worker에 텍스트로 넣고 첫 요청 때 해석).
- 배포: GitHub Actions(oil·hospital과 같은 방식, 토큰 github-d1) — **사용자 승인 후** `parking-deploy.yml` 추가와 도메인(`routes` custom_domain) 연결.
- 로컬 시험: `npm run build:parking` → `npx wrangler deploy -c apps/parking/wrangler.jsonc --dry-run --outdir <dir>` → Node 하네스(번들의 json import를 문자열로 바꿔 `fetch` 호출, ASSETS는 `apps/parking/out`).
- 라이브 확인 목록: `/`, `/region`, `/region/11680`, `/region/{코드}/free`, `/parking/{관리번호}`, `/api/near?lat=37.5017&lon=127.0328&km=1`, `/api/search?q=시청`, `/api/status`, `/sitemap.xml`, `/rss.xml`, `/robots.txt`, `/ads.txt`, `/llms.txt`, 없는 주차장·`/parking/shell` 404.
