# weather.guidejung.com 배포 안내 (Cloudflare)

trip과 **별도의 Worker**로 배포합니다. 같은 GitHub 저장소를 쓰지만 trip Worker(`data-platform`)에는 영향이 없습니다.

## 1. Worker 만들기 (최초 1회, 사용자)
1. Cloudflare 대시보드 → **Workers & Pages** → **Create** → **Import a repository** → `kenshin240919-web/data-platform` 선택
2. Project name: `guidejung-weather`
3. Build 설정
   - Root directory: 비워 둠(저장소 루트)
   - Build command: 비워 둠
   - **Deploy command: `npx wrangler deploy -c apps/weather/wrangler.jsonc`**
   - Production branch: `main`
4. 저장 후 첫 배포를 기다립니다. 처음에는 키가 없어 날씨가 "불러오지 못했습니다"로 나오는 것이 정상입니다.

## 2. 인증키 넣기 (사용자)
Worker(`guidejung-weather`) → **Settings → Variables and Secrets → Add**
- Type: **Secret**
- Name: `DATA_GO_KR_KEY`
- Value: 공공데이터포털 일반 인증키(Decoding 키)
- 저장 후 **Deploy**(또는 다음 push 때 반영)

키는 저장소·채팅에 넣지 않습니다.

## 3. 도메인 연결 (사용자)
Worker → **Settings → Domains & Routes → Add → Custom domain** → `weather.guidejung.com`
- 기상청 응답 캐시(Cache API)는 커스텀 도메인에서만 작동합니다. `*.workers.dev` 주소에서는 매 요청마다 기상청을 호출하므로 테스트용으로만 쓰세요.
- 기존 guidejung.com의 DNS 레코드는 건드리지 않습니다. Custom domain 추가 시 Cloudflare가 `weather` 레코드만 새로 만듭니다.

## 4. 확인
- `https://weather.guidejung.com/api/weather?code=11680` → JSON에 `now`, `hourly`, `daily`, `air`가 채워지고 `errors`가 비어 있으면 정상
- `https://weather.guidejung.com/ads.txt`, `/sitemap.xml`, `/robots.txt`
- Search Console·네이버 서치어드바이저에 사이트 등록 후 사이트맵 제출

## 무료 플랜 주의
- Workers 무료 플랜은 요청당 CPU 10ms 제한이 있습니다. 캐시가 없는 첫 요청은 기상청 응답(JSON)을 해석하느라 이 한도를 넘을 수 있습니다. 배포 후 Worker → Observability에서 `Exceeded CPU` 오류가 보이면 알려 주세요. 해결책은 (1) 응답 크기 줄이기, (2) Workers 유료 플랜(월 $5)이며, 유료 전환은 사용자 승인 후 진행합니다.
