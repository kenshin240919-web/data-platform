# academy.guidejung.com (내근처 학원) 배포 안내

## 구조
- 정적 페이지: `apps/academy` (Next.js export → `apps/academy/out`). 지역·지역×과목 페이지는 `apps/academy/data/summary.json`으로 빌드.
- Worker `guidejung-academy` (`apps/academy/worker/index.ts`): `/api/search`(D1), `/api/where`, `/api/status`, 학원 상세 `/academy/{지정번호}`(D1에서 만들어 `/academy/shell` 틀에 채움), `/sitemap.xml`·`/sitemap-academies-{n}.xml`.
- D1 `guidejung-academy` (id 411eb091-3497-498a-b612-da030dd70fe3), 표 `apps/academy/worker/schema.sql`.
- 데이터: GitHub Actions `academy-collect.yml` 매일 03:47 KST — 나이스 학원교습소정보 전체 → 카카오 주소→좌표(새 주소만) → D1 바뀐 행만 → `summary.json` main 커밋.
- GitHub Secrets: `NEIS_API_KEY`, `KAKAO_REST_KEY`(카카오 앱 '내근처학원', 카카오맵 사용 설정 ON), `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

## Cloudflare 설정 (사용자, 처음 한 번)
1. Workers & Pages → Create → Import a repository → `data-platform`
2. 이름 `guidejung-academy`, Build command 비움, Deploy command `npx wrangler deploy -c apps/academy/wrangler.jsonc`
3. 비프로덕션 분기 빌드 끄기(다른 사이트와 같게)
4. 배포 후 Settings → Domains & Routes → Custom domain `academy.guidejung.com`
5. Cloudflare의 "루트 wrangler.jsonc 이름 불일치" 경고·자동 PR은 무시(병합하면 trip 배포가 깨짐)

## 확인
- `https://academy.guidejung.com/api/status` — D1 버전·건수
- `/region`, `/region/11680`, `/academy/{id}`, `/sitemap.xml`
