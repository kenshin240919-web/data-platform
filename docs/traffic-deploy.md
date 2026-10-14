# traffic.guidejung.com 배포 안내

trip·weather·charge와 같은 저장소의 `apps/traffic`을 별도 Cloudflare Worker `guidejung-traffic`으로 배포합니다.

## 1. Cloudflare Worker 만들기 (사용자)
Cloudflare 대시보드 → **Workers & Pages → Create → Import a repository** → `kenshin240919-web/data-platform`
- Project name: `guidejung-traffic`
- Build command: **비워 둠**
- Deploy command: `npx wrangler deploy -c apps/traffic/wrangler.jsonc`
- 미리보기(Non-production branch) 빌드: 끔
- 빌드는 `wrangler.jsonc`의 `npm run build:traffic`이 실행합니다. "루트 wrangler.jsonc 이름 불일치" 경고·자동 PR은 무시합니다(병합하면 trip 배포가 깨짐).

## 2. 비밀값 (사용자)
Worker → **Settings → Variables and Secrets → Add** → Type **Secret**
- Name `EX_API_KEY`, Value = 한국도로공사 고속도로 공공데이터 포털(data.ex.co.kr) 인증키
- GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret에도 같은 이름·값 등록(매일 휴게소·기름값 갱신용)

키는 저장소·채팅에 넣지 않습니다.

## 3. 도메인 연결 (사용자)
Worker → **Settings → Domains & Routes → Add → Custom domain** → `traffic.guidejung.com`
- 응답 캐시(Cache API)는 커스텀 도메인에서만 작동합니다. `*.workers.dev`에서는 매 요청마다 도로공사 API를 호출하므로 시험용으로만 쓰세요.
- 기존 guidejung.com DNS 레코드는 건드리지 않습니다.

## 4. 확인
- `https://traffic.guidejung.com/api/traffic` → `zones`에 구간 약 1,580개
- `https://traffic.guidejung.com/api/incidents` → `items` 목록
- `/ads.txt`, `/sitemap.xml`, `/robots.txt`, `/rss.xml`

## 매일 스냅샷 (GitHub Actions)
- `.github/workflows/traffic-snapshot.yml`, 매일 04:37(KST): 노선·구간 순서, 검지기→구간 표(`vds.json`), 휴게소·대표 음식·편의시설·주유 가격 → `apps/traffic/data/` 커밋 → 자동 재배포.
- 수동 실행: GitHub → Actions → "Traffic snapshot" → Run workflow.

## 무료 플랜 주의 (CPU 10ms)
- 실시간 소통 원본이 약 1.9MB라 해석 비용이 큽니다. JSON 전체 해석 대신 정규식으로 필요한 값만 뽑아(Node 기준 약 3ms) 5분 캐시합니다.
- 배포 후 Worker → Observability에서 `Exceeded CPU`(오류 1102)가 보이면 알려 주세요. 해결책은 Workers 유료 플랜(월 $5)이며, 사용자 승인 후 진행합니다.
