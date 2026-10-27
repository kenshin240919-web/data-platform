# 내근처 서류(minwon.guidejung.com) 배포 안내

- 앱: `apps/civil` (Next.js 정적 `out` + Worker `guidejung-civil`, 설정 `apps/civil/wrangler.jsonc`)
- 데이터: `scripts/collect-civil.py` → `apps/civil/data/places.json` (Actions `civil-collect.yml`, 매일 05:27 KST). 발급기별 서류 원본은 `runtime/civil/docs.json`(Actions cache).
- 배포: Actions `civil-deploy.yml` — 첫 배포·도메인 연결은 사용자 승인 뒤 수동 실행. 승인 후 push·매일 수집 후 자동 배포를 켠다.
- Worker Secret(배포 워크플로가 GitHub Secret에서 넣음): `DATA_GO_KR_KEY`(민원실 실시간 대기), `KAKAO_REST_KEY`·`NAVER_HUB_CLIENT_ID`·`NAVER_HUB_CLIENT_SECRET`(무인 프린트 실시간, 저장 안 함).
- 도메인: wrangler `routes` custom_domain `minwon.guidejung.com` (배포 때 Cloudflare가 연결).
- 위치: 브라우저는 약 2km 칸 중심만 보냄(`packages/ui/src/geo.tsx`) — `/api/near`·`/api/print`에 오는 좌표는 칸 중심.
- 라이브 확인: `/`, `/kiosk`, `/doc`, `/doc/resident`, `/weekend`, `/print`, `/region`, `/region/{코드}`, `/place/{id}`, `/api/status`, `/api/near?lat=37.49&lon=127.0375&km=2`, `/api/wait?id=cCS0001`, `/api/print?lat=37.49&lon=127.0375`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/og.png`.
- 남은 것: GA 측정 ID·Clarity 프로젝트 ID(layout `GA_ID`·`CLARITY_ID`), 검색엔진 인증 코드, `SITES.civil` hidden 해제(사용자 승인).
