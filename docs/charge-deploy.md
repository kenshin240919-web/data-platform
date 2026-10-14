# charge.guidejung.com 배포 안내 (Cloudflare)

trip과 **별도의 Worker**로 배포합니다. 같은 GitHub 저장소를 쓰지만 trip Worker(`data-platform`)에는 영향이 없습니다.

## 1. Worker 만들기 (최초 1회, 사용자)
1. Cloudflare 대시보드 → **Workers & Pages** → **Create** → **Import a repository** → `kenshin240919-web/data-platform` 선택
2. Project name: `guidejung-charge`
3. Build 설정
   - Root directory: 비워 둠(저장소 루트)
   - Build command: 비워 둠
   - **Deploy command: `npx wrangler deploy -c apps/charge/wrangler.jsonc`**
   - Production branch: `main`
4. 저장 후 첫 배포를 기다립니다. 처음에는 키가 없어 날씨가 "불러오지 못했습니다"로 나오는 것이 정상입니다.

## 2. 인증키 넣기 (사용자)
Worker(`guidejung-charge`) → **Settings → Variables and Secrets → Add**
- Type: **Secret**
- Name: `DATA_GO_KR_KEY`
- Value: 공공데이터포털 일반 인증키(Decoding 키)
- 저장 후 **Deploy**(또는 다음 push 때 반영)

키는 저장소·채팅에 넣지 않습니다.

## 3. 도메인 연결 (사용자)
Worker → **Settings → Domains & Routes → Add → Custom domain** → `charge.guidejung.com`
- 충전소 응답 캐시(Cache API)는 커스텀 도메인에서만 작동합니다. `*.workers.dev` 주소에서는 매 요청마다 충전 API를 호출하므로 테스트용으로만 쓰세요.
- 기존 guidejung.com의 DNS 레코드는 건드리지 않습니다. Custom domain 추가 시 Cloudflare가 `charge` 레코드만 새로 만듭니다.

## 4. 확인
- `https://charge.guidejung.com/api/stations?code=11620` → JSON에 `stations` 목록이 채워지면 정상
- `https://charge.guidejung.com/ads.txt`, `/sitemap.xml`, `/robots.txt`
- Search Console·네이버 서치어드바이저에 사이트 등록 후 사이트맵 제출

## 무료 플랜 주의
- Workers 무료 플랜은 요청당 CPU 10ms 제한이 있습니다. 캐시가 없는 첫 요청은 충전 API 응답(JSON, 큰 시는 수 MB)을 해석하느라 이 한도를 넘을 수 있습니다. 배포 후 Worker → Observability에서 `Exceeded CPU` 오류가 보이면 알려 주세요. 해결책은 (1) 응답 크기 줄이기, (2) Workers 유료 플랜(월 $5)이며, 유료 전환은 사용자 승인 후 진행합니다.

## 5. 매일 정적 스냅샷 (GitHub Actions)
지역 페이지 HTML에 충전소 수와 충전기가 많은 충전소 30곳을 미리 넣어 검색 노출과 첫 화면 속도를 높입니다.
- 수집: `scripts/collect-charge-snapshot.py` → `apps/charge/data/snapshot.json`(전국 getChargerInfo 약 53회 호출, 하루 1,000회 한도 중).
- 자동 실행: `.github/workflows/charge-snapshot.yml`, 매일 04:17(KST). 결과를 main에 커밋 → Cloudflare 자동 재배포.
- **사용자 1회 설정**: GitHub 저장소 → Settings → Secrets and variables → Actions → **New repository secret**
  - Name `DATA_GO_KR_KEY`, Value = Cloudflare Worker에 넣은 것과 같은 공공데이터포털 인증키
- 수동 실행: GitHub → Actions → "Charge station snapshot" → **Run workflow**.
- 수집 결과가 전체의 90% 미만이면 파일을 바꾸지 않습니다(이전 스냅샷 유지).
