# school.guidejung.com (내 학교) 배포 안내

## 구조
- 정적 페이지: `apps/school` (Next.js export → `apps/school/out`). 메인(내 학교 오늘 급식)·`/region`·`/region/{시군구코드}`·`/search`(noindex)·안내 3종·`sitemap.xml`(학교 상세 포함)·`rss.xml`.
- Worker `guidejung-school` (`apps/school/worker/index.ts`): `/api/search`(학교 이름·내 주변), `/api/today`(오늘 급식·다음 급식·D-day·오늘 시간표), `/api/meal`, `/api/schedule`, `/api/classes`, `/api/timetable`, `/api/where`, `/api/status`, 학교 상세 `/school/{학교코드}`(`/school/shell` 틀에 채움, 3시간 단위로 새로 만듦).
- 학교 목록은 Worker에 같이 들어감(`apps/school/data/schools.json`, 약 1만 2천 곳) → **D1 없음**.
- 급식·학사일정·시간표: 방문할 때 Worker가 나이스에서 학교 단위로 받아 KV `guidejung-cache`(키 `school:*`)에 보관(급식 학교·월별 6시간, 학사일정 하루, 시간표 12시간, 학급 7일).
- 학교 목록 갱신: GitHub Actions `school-collect.yml` 매일 04:07 KST — 나이스 학교기본정보 → 새 주소만 카카오 좌표 → 바뀌었을 때만 main 커밋. Secrets `NEIS_API_KEY`, `KAKAO_REST_KEY`(이미 있음).

## Cloudflare 설정 (사용자, 처음 한 번)
1. Workers & Pages → Create → Import a repository → `data-platform`
2. 이름 `guidejung-school`, Build command 비움, Deploy command `npx wrangler deploy -c apps/school/wrangler.jsonc`
3. 비프로덕션 분기 빌드 끄기(다른 사이트와 같게)
4. Settings → Variables and Secrets → Secret `NEIS_API_KEY`(GitHub에 넣은 나이스 키와 같은 값). **없으면 나이스가 5건만 줘서 급식·일정이 잘림.**
5. 배포 후 Settings → Domains & Routes → Custom domain `school.guidejung.com`
6. Cloudflare의 "루트 wrangler.jsonc 이름 불일치" 경고·자동 PR은 무시

## 확인
- `https://school.guidejung.com/api/status` — 학교 수, `neis_key: true`
- `/school/7091427`(대치중학교) 오늘 급식·이번 주 급식·학사일정, 시간표 학년·반 고르기
- `/region/11680`, `/sitemap.xml`, `/robots.txt`, `/ads.txt`
