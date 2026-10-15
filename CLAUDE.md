# CLAUDE.md — GuideJung Data Platform

컴퓨터(Claude Code)와 핸드폰(Claude 앱 Code 탭)에서 번갈아 작업하는 프로젝트입니다. 작업을 시작할 때 이 파일과 `README.md`를 먼저 읽으세요.

## 프로젝트 한 줄 요약
`trip.guidejung.com` 여행 검색 서비스. 한국관광공사 TourAPI 공식 데이터를 수집·검수해 **정적 사이트**로 Cloudflare Workers에 배포합니다. 기존 guidejung.com(WordPress·DB·서버·DNS)은 절대 건드리지 않습니다.

## 사용자 작업 원칙
- **최우선 설계 원칙(모든 사이트 공통)**: "가장 중요한 것은 사람들의 클릭을 유발해야 하고, 사이트에 접속하면 계속 체류하게 만들어야 한다." 화면·기능·설계 결정의 1순위 기준. 새 사이트 설계서는 "클릭·체류 설계" 장을 맨 앞에 둔다. 상세: `reports/서비스-공통원칙-클릭체류.md`. 클릭은 콘텐츠로 유도하고, 광고 클릭 유도 문구·배치는 애드센스 정책 위반이라 금지.
- 답변은 한국어 존댓말, 결과 위주로 간결하게.
- 유료 API(AI API 등) 호출이 필요하면 **사용 전에 비용을 알리고 승인**을 받습니다. 구독(Claude Pro, ChatGPT Plus, Genspark AI Plus) 범위 안에서 가능한 방법을 우선합니다.
- API 키·ADMIN_TOKEN·DB 비밀번호는 `.env`에만 둡니다. 코드·커밋·채팅에 넣지 않습니다. (`.env`, `개방데이터/`, `runtime/`은 gitignore 대상)
- 저장소는 공개(Public)여도 괜찮다고 사용자가 확인했습니다.
- **Microsoft Clarity: 모든 하위 사이트에 설치**(사이트마다 Clarity 프로젝트 따로). 공통 컴포넌트 `packages/ui/src/clarity-script.tsx`의 `ClarityScript id=...`를 각 layout `<head>`에 넣고 개인정보 안내에 Clarity 고지. 프로젝트 ID: trip `yxgv6hkcoz`, weather `yxh23x6e9n`(10/14 둘 다 설치), charge `yxl5298cyt`(10/14 설치), traffic `yxymh7qfew`(10/15 설치). 새 사이트는 사용자에게 ID 받기. guidejung.com(WordPress)은 건드리지 않음.
- **애드센스: 설계보고서의 모든 하위 사이트(home·trip·traffic·academy·charge·weather)에 Google AdSense 광고를 넣습니다.** 게시자 ID `ca-pub-3087515825675332`, 수동 디스플레이 광고 슬롯 `6639512269`(`packages/ui/src/adsense.ts`, 자동광고 `AdSenseScript`, 수동광고 `AdSlot`), 각 사이트 `public/ads.txt` 필수. 기존 guidejung.com(WordPress)은 따로 운영 중이므로 연결·변경하지 않습니다.

## 구조
- `apps/trip` — Next.js 정적 사이트(빌드 결과 `apps/trip/out`). Next.js 버전이 최신이라 API가 다를 수 있으니 `apps/trip/AGENTS.md` 참고.
- `apps/weather` — weather.guidejung.com. Next.js 정적 페이지(`out`) + Cloudflare Worker(`worker/index.ts`, `/api/weather`)가 기상청·에어코리아를 직접 호출·캐시. 설정 `apps/weather/wrangler.jsonc`(Worker 이름 `guidejung-weather`), 배포 안내 `docs/weather-deploy.md`. 지역표 `apps/weather/data/regions.json`은 `scripts/build-weather-regions.py`로 생성(행정동 경계 geojson + 에어코리아 측정소 목록).
- `apps/charge` — charge.guidejung.com(전기차 충전소). Next.js 정적 페이지(시도 16·충전 API 기준 시군구 약 230) + Worker(`/api/stations?code=`, 한국환경공단 getChargerInfo 시군구 단위 조회·충전소로 묶어 30분 캐시). 설정 `apps/charge/wrangler.jsonc`(Worker `guidejung-charge`), 배포 안내 `docs/charge-deploy.md`. 지역은 weather `regions.json`을 충전 API 코드로 묶어 사용(일반구가 있는 시는 시 코드, 예: 수원 41110·화성 41590).
- `apps/traffic` — traffic.guidejung.com(고속도로 교통). Next.js 정적 페이지(메인 정체 TOP 10, 노선 69 `/road/{번호}`, 휴게소 203 `/rest/{코드}`, `/gas` 휴게소 기름값 순위, `/incidents`) + Worker(`/api/traffic` 전국 구간 소통 5분 캐시, `/api/incidents` 돌발 10분 캐시, 한국도로공사 API·브라우저 User-Agent 필수). 정적 데이터 `apps/traffic/data/snapshot.json`·`vds.json`(검지기→구간)은 `scripts/collect-traffic-snapshot.py`, 매일 04:37 Actions `traffic-snapshot.yml`. 설정 `apps/traffic/wrangler.jsonc`(Worker `guidejung-traffic`), 배포 안내 `docs/traffic-deploy.md`.
- `packages/ui` — 공통 UI·검색·RSS 로직, 애드센스(`ads`, `adsense-script`)
- `services/api` — FastAPI + 수집/정규화/검수/동기화 파이프라인(Python, PostgreSQL)
- `apps/trip/data/trip.json` — 공개 데이터(사이트가 이 파일로 빌드됨)
- `deploy/`, `docs/`, `reports/` — 서버 설정, 배포 안내, 검수·설계 보고서

## 배포 흐름
GitHub `main`에 push → Cloudflare가 `wrangler.jsonc` 기준으로 `npm run build` 후 `apps/trip/out`을 자동 배포.
- Cloudflare Build 설정: Deploy command `npx wrangler deploy`, Build command는 비워 둠.
- GitHub Actions(`verify.yml`)는 테스트만 하고 배포하지 않음.

## 어디서 무엇을 할 수 있나 (중요)
| 작업 | 컴퓨터 | 핸드폰/클라우드 |
|---|---|---|
| 화면·문구·SEO·코드 수정, 빌드 확인 | ✅ | ✅ |
| 데이터 수집(`collect-trip.bat`), 검수(`run.bat` → /admin), 내보내기(`export-site.bat`) | ✅ | ❌ (로컬 PostgreSQL·`.env` 필요) |
| 테스트 `npm run check`(trip+weather+charge+traffic 빌드), Python 단위 테스트 | ✅ | ✅ |
| weather 로컬 API 시험: `apps/weather/.dev.vars`에 `DATA_GO_KR_KEY=...`(gitignore) 후 `npm run worker:dev -w @guidejung/weather` | ✅ | △ (클라우드는 workerd가 프록시를 못 써서 Node 하네스로 시험) |

데이터 갱신 순서(컴퓨터): `collect-trip.bat` → (선택) 검수 → `export-site.bat` → `trip.json` 커밋·push → 자동 재배포.

## 현재 상태 (2026-10-14 기준)
- **trip**(trip.guidejung.com): Cloudflare Workers 배포 완료, 검색 노출(SEO) 켜짐.
- **weather**(weather.guidejung.com): 10/13 배포·도메인 연결·라이브 확인 완료. 메뉴 오늘 날씨·주말 날씨·미세먼지·옷차림·전국 날씨·여행정보↗, 시도 16·시군구 256 페이지, 애드센스·ads.txt·sitemap·rss.xml(275개 페이지)·네이버 인증 메타태그(10/13 라이브 확인)·Bing 인증 메타태그(msvalidate.01)·Daum PIN(robots.txt 마지막 줄) 적용, 10/13 Daum 인증·네이버 소유확인 완료, 사이트맵·RSS 제출 완료(사용자 보고). 남은 일: 며칠 뒤 각 검색엔진에서 사이트맵 처리 상태(성공·수집 페이지 수) 확인, 첫 호출 속도·무료 플랜 CPU 확인.
- **charge**(charge.guidejung.com): 10/14 배포·도메인 연결·라이브 확인 완료(사용자 화면 확인: 관악구 지역 페이지 '지금 충전 가능한 급속 163대'·충전소 347곳, `/api/stations?code=11620` JSON 정상). Clarity 설치, Worker `guidejung-charge`·Secret `DATA_GO_KR_KEY` 등록. 이 클라우드 세션은 허용 도메인 변경 전 시작돼 charge 직접 접속 불가(새 세션부터 적용 추정). 10/14 속도 개선: 30분 지난 사본(2일 이내)은 즉시 보여 주고 Worker가 뒤에서 갱신(stale-while-revalidate, 90초 잠금으로 중복 호출 방지), 페이지는 '최신 상태 확인 중' 표시 후 6초 간격 최대 5번 다시 받아 교체, 큰 시(2페이지 이상)는 병렬 호출. 측정(클라우드 Node): 캐시 지난 관악구 14초→0.02초. 처음 보는 지역(2일 넘게 방문 없음)은 여전히 API 대기(관악구 원본 1.2MB·화성시 6.9MB). 10/14 검색엔진 인증 코드 반영(네이버 메타 f8f3585d…·Bing msvalidate·Daum PIN robots.txt 마지막 줄), 10/15 네이버·Bing·다음 인증 완료(사용자). **10/14 2단계 정적 스냅샷**: `scripts/collect-charge-snapshot.py`가 전국 getChargerInfo(53회 호출)를 받아 `apps/charge/data/snapshot.json`(시군구 229곳별 충전소·충전기·급속·무료주차·24시간 수 + 충전기 많은 충전소 30곳, 약 1.9MB) 생성 → 지역 페이지 HTML·메타 설명·시도/메인 카드에 수 표시, 실시간 목록이 오기 전에도 정적 목록이 바로 보임. 첫 수집 10/14 23:40: 충전소 100,590곳·충전기 523,312대. 매일 04:17 KST GitHub Actions `charge-snapshot.yml`이 수집·main 커밋(→ Cloudflare 3개 사이트 재배포), GitHub Secret `DATA_GO_KR_KEY` 등록 완료(10/14 사용자). 10/14 23:51 Actions 수동 실행 성공(main에 '충전소 정적 스냅샷 갱신' 자동 커밋 확인). 10/15 각 검색엔진에 sitemap.xml·rss.xml 제출 완료(사용자). 남은 일: 며칠 뒤 색인 확인.
- **traffic**(traffic.guidejung.com): 10/15 Worker `guidejung-traffic` 생성·Secret `EX_API_KEY`(Cloudflare·GitHub)·도메인 연결·클라우드 허용 도메인 추가(사용자). 처음엔 `/api/*`가 템플릿 'Hello world'를 응답 → GitHub Actions 스냅샷 커밋으로 새 배포 후 정상. 10/15 14:40 라이브 확인: 페이지·ads.txt·robots·sitemap 200, `/api/traffic` 구간 1,580(정체 12·서행 117), `/api/incidents` 69건, Actions `traffic-snapshot.yml` 수동 실행 성공(main 자동 커밋). 10/15 Clarity 설치, 검색엔진 인증 코드 반영(네이버 메타 cc389b26…·Bing msvalidate·Daum PIN robots.txt 마지막 줄). 10/15 ITS 접속 시험(`/api/its-test`): 미국 데이터센터 실행 시 522, **핸드폰(국내·서울 데이터센터)에서는 정상**(cctvType 4 = https HLS 영상 주소·좌표·이름) → CCTV 사용 가능, Secret `ITS_API_KEY` 등록(사용자). **10/15 추천안 개편**: 노선 페이지를 양방향 **노선도**(IC 점, 왼쪽 시점 방향·오른쪽 종점 방향 속도 색깔 막대)로 변경, 노선 CCTV 목록·플레이어(◀▶ 넘기기, hls.js는 필요한 브라우저만 cdnjs에서), 메인 첫 화면 '내 근처 고속도로'(가까운 노선 3개 정체 요약·가장 느린 곳, 가까운 CCTV 6개, 가까운 휴게소 3곳), `/api/cctv`(ITS 전국 1회·1시간 캐시, 월 약 720회), 테스트 주소 삭제. **10/15 노선 페이지 재개편(내 위치 우선)**: 3초 답이 '📍 내 위치 주변 구간 상태', 내 주변 CCTV(가까운 순 6개)·주변 구간 카드 7개(양방향 색깔 속도·구간별 가장 가까운 CCTV 버튼), 전체 구간은 내 구간부터 시작하는 표(구간 | ◀ 방향 | 방향 ▶ | 📹), CCTV 전체 목록은 접기. 방향 이름은 휴게소 방향으로 '서울 방향/부산 방향'(17개 노선, 나머지는 IC 이름). IC 좌표는 도로공사 `locationinfo/locationinfoIc`(525)·`locationinfoUnit`(영업소)로 860개 노드 중 680개 매칭, 나머지는 앞뒤 사이 추정(snapshot `pts`). 메인 3초 답도 위치를 알면 '내 근처 고속도로' 기준. 메인 '내 근처 고속도로'는 도로별 카드 3개에 미니 노선도(내 위치 앞뒤 3구간·양방향 속도)와 그 도로의 가까운 CCTV 4개를 함께 표시(따로 있던 CCTV 줄 제거). 10/15 사용자 핸드폰에서 CCTV 실제 영상 재생 확인. 10/15 검색엔진 인증·사이트맵/RSS 제출 완료(사용자). 남은 일: 며칠 뒤 색인 확인, Observability CPU 확인, CCTV 영상 주소 만료 시간·이용조건(광고 사이트 표시 허용 여부) 확인, ITS 월 호출량 확인.
- **위치 기능(weather·charge·traffic 공통, 10/15)**: `packages/ui/src/geo.tsx`(`useMyPosition`, `LocateCard`). 접속 즉시 권한 팝업은 띄우지 않음(거부되면 다시 못 물음·검색 유입 방해) → ① 각 Worker `/api/where`가 Cloudflare IP 위치(국내만)로 대략 도시를 주어 첫 화면부터 맞춤 표시 ② '📍 내 위치…' 카드를 누르면 그때 권한 요청 ③ 이미 허용한 사람은 다음 방문에 묻지 않고 자동 사용(위치는 브라우저 localStorage 30분, 서버 전송 없음). weather 메인은 내 위치 지역 날씨, charge 메인은 가까운 순 충전소, traffic 메인은 내 근처 고속도로. 개인정보 안내 3곳 갱신. IP 위치 이름은 Cloudflare 영어 도시명 대신 가까운 시군구 한글 이름으로 표시. 위치 상태는 페이지 안에서 공유(한 곳에서 허용하면 모든 섹션이 바로 갱신). traffic 메인은 위치를 알면 TOP 10(내 근처 노선, '전국 보기' 전환)·기름값 싼 휴게소(60km 안)·대표 음식(가까운 순)도 내 근처부터.
- **사이트 간 연결(trip·weather·traffic·charge, 10/15)**: `packages/ui/src/network.tsx` — ① `NetworkBar`: 네 사이트 모든 페이지 맨 위 '🚗 여행 · 🌤️ 날씨 · 🛣️ 교통 · ⚡ 충전소' 바 ② `Connect`(🔗 함께 보면 좋은 정보 카드)를 페이지마다 맥락에 맞게: 장소·지역·휴게소는 `linksNear`(가까운 시군구 날씨·가볼만한곳 20km·충전소·가까운 고속도로·휴게소), 노선은 출발·중간·도착 날씨+중간 지점 여행·충전, 미세먼지→실내 여행지, 특보→고속도로 사고·통제, 주말→여행·고속도로, 기름값→충전소, 홈·목록은 `genericFor`. 헤더·푸터에도 세 사이트 링크. 데이터: weather `regions.json`(시군구 중심)·traffic `snapshot.json`(IC 좌표·휴게소)을 서버 컴포넌트에서만 사용. trip 메인 순서 변경(검색 → 📍 내 주변 20km 가운데 크게 → 가볼만한 장소 → 주말 행사 → 지역은 시도 버튼+인기 TOP 8로 압축 `RegionPicker`).
- weather 기상특보(10/13): 모든 페이지 상단 띠(발효 중=빨강, 예비특보=노랑) → `/warnings` 상세. `/api/warnings`는 기상청 getWthrWrnMsg(stnId=108) 최신 통보문의 t6(발효 현황)·t7(예비특보)을 10분 캐시. 10/14 라이브 확인(강풍·풍랑주의보 발효 중 표시).
- trip: robots.txt 정적 제공, Daum 웹마스터 PIN·Naver 사이트 인증 메타태그 추가, RSS 피드 추가.
- trip: 사이트 제목 "여행정보", 탭 아이콘 자동차 아이콘.
- trip SEO(10/14): 지역(`/region/{id}`)·전체 장소·축제·조건(무료·아이·반려동물·실내) 목록 페이지를 검색 노출(index)로 전환, 정적 HTML에 첫 24개 카드 포함(네이버 수집용), 사이트맵 1,235개 URL. `/search`·오늘·이번 주말 목록은 계속 noindex. 네이버 서치어드바이저 10/13 진단: 색인 0·수집제한 1(목록 noindex 때문으로 추정) → 10/14 라이브 반영 확인 후 네이버에 trip 사이트맵 재제출(사용자). 며칠 뒤 색인 수 확인.
- Google AdSense 적용: 자동광고 코드·ads.txt. 앵커·사이드레일·전면 등 자동광고 형식은 AdSense에서 trip만 따로 관리할 수 없어 guidejung.com 사이트 설정을 함께 따름.
- 수동 디스플레이 광고 배치: 상세 페이지 2곳(소개글 아래, "주변에서 함께 둘러볼 곳" 위), 목록·검색 결과 아래 1곳, 홈 "이번 주말 행사" 아래 1곳. 안내 페이지(소개·출처·개인정보)에는 없음. 개인정보 안내에 광고·쿠키 고지 추가.
- 공개 데이터 996건(장소 758·축제 238, 10/14 09:36 내보내기), 검수는 선택 사항(원천 자동 분류 표시).
- 카카오 채널 주소가 `http://pf.kakao.com/_rrxoFX`로 변경(10/14). 이 저장소에는 채널 링크가 없음(guidejung.com 워드프레스 쪽은 사용자가 직접 변경). 하위 사이트에 넣을지는 미정.
- 10/13 trip 메인: "지역별로 둘러보기" 옆 "📍 내 주변 20km 가볼만한곳" 버튼을 큰 파란 카드로 변경(모바일은 제목 아래 전체 폭), 지역 카드 번호 01~ 두 자리로 수정.
- 10/8 컴퓨터 작업: 로컬 DB 위치를 `~/guidejung-data-postgres`로 고정, 내보내기 시 건수가 10% 넘게 줄면 중단(`--force`로 무시), 수집 진행률 표시, 수집 중 DB 중지 방지, `export-site.bat`이 push 전에 원격 커밋을 먼저 받아옴.

## 다음 할 일 후보
- **서비스 구축 순서(사용자 결정)**: trip → weather·charge → traffic·academy → **home은 맨 마지막**(최종설계보고서에서도 home은 범위 제외·추후 별도 설계).
- **traffic 설계안 작성(10/15)**: `reports/traffic-설계안-2026-10-15.md`. 클릭·체류: 노선 페이지(IC 순 구간 속도 색깔·사고·CCTV·휴게소), CCTV ◀▶ 넘겨보기, 정체 TOP 10, 사고·통제 띠, 휴게소 상세(charge·trip·weather 연결), 2단계 주유소 최저가(오피넷)·과속카메라, 명절 특집. 구조: `apps/traffic` + Worker `guidejung-traffic` + 매일 정적 스냅샷. 데이터: ITS 국가교통정보센터(its.go.kr 별도 인증키: cctvInfo·trafficInfo·돌발), 한국도로공사(data.ex.co.kr 별도 인증키: 휴게소·노선·소통·명절 예보). 10/15 ITS 인증키 발급(운영, **월 1,000건**, 키는 저장소에 두지 않음), 허용 도메인 추가 → data.ex.co.kr 접속 OK, **ITS는 서버가 연결을 끊음(해외 IP 차단 추정, 미확인)** → 컴퓨터(국내)·Worker에서 확인 필요. 10/15 도로공사 키 발급·실측: 브라우저 User-Agent 필수, 전국 고속도로 실시간 구간 소통(`odtraffic/trafficAmountByRealtime` 1회 8,370건·2.26MB·grade 원활/서행/정체), 휴게소 203·대표음식·편의시설·휴게소 주유 가격 226 확인 → 고속도로 MVP는 도로공사 API만으로 가능(설계안 3장 실측). **10/15 고속도로 MVP 코드 완성(배포 전)**: 메인(전국 정체·서행 구간 수 3초 답, 막힌 노선 칩, 지금 가장 막히는 구간 TOP 10, 주요 고속도로, 기름값 싼 휴게소, 휴게소 대표 음식), 노선 페이지(방향 탭·IC 순 구간 색깔 막대·`#구간ID` 공유 링크·노선 휴게소 카드), 휴게소 상세(대표 음식·주유 가격 평균 대비·편의시설·길찾기·교통상황·주변 충전소·날씨·가볼만한곳), 기름값 순위, 사고·공사(최근 3일·상단 띠), 애드센스, sitemap(277 URL)·rss·robots·ads.txt. 실데이터: 구간 1,580·정체 52·서행 113(10/15 08:04), 실시간 응답 32KB. 실시간 원본에 구간 ID가 빠질 때가 있어 검지기→구간 표 사용, JSON 해석 대신 정규식(약 3ms)으로 무료 플랜 CPU 대응. 원본 오류 가격(184원) 걸러냄. 10/15 배포·라이브 확인·Clarity 설치·검색엔진 등록·CCTV 완료. 다음: 공공데이터포털 대안 API(국토교통부_교통소통정보 15040463·경찰청_교통 CCTV 15148511) 활용신청, 표본 호출로 한도·CCTV 영상 주소 형식·이용조건 확인.
- **charge 설계안 작성(10/14)**: `reports/charge-설계안-2026-10-14.md`. 클릭·체류: 내 주변 지금 사용 가능한 충전기 3초 답·상태 색깔·충전 중 갈 만한 곳(trip)·날씨(weather) 연결. 구조: `apps/charge` + 별도 Worker(실시간 상태) + GitHub Actions 매일 정적 수집. API `apis.data.go.kr/B552584/EvCharger`(getChargerInfo·getChargerStatus) 존재 확인, 10/14 활용신청 승인(getChargerInfo·getChargerStatus 각 1,000회/일) 및 실호출 확인: 전국 충전기 527,554대, numOfRows 9,999·zcode/zscode 필터 동작, 5분 상태 변경 약 9,100건(설계안 3-1장). **10/14 MVP 코드 완성(배포 전)**: 메인(내 주변 충전소·최근 지역), 지역 페이지(3초 답 '지금 충전 가능한 급속 N대', 조건 칩, 상태 색깔 목록, 펼치면 충전기별 상태·길찾기(카카오맵)·충전 중 갈 만한 곳(trip 반경 3km)·날씨), `#station-ID` 공유 링크, 애드센스 2곳, sitemap·rss·robots·ads.txt. 실데이터 확인: 관악구 347곳 4.7초, 화성시 1,982곳(13,800대, 2페이지) 응답 1.3MB. 정적 HTML에는 충전소 목록이 없음(브라우저에서 불러옴) → 2단계에서 정적 스냅샷 검토. 10/14 배포·라이브 확인 완료, 10/15 검색엔진 인증·사이트맵 제출 완료. 다음: 며칠 뒤 색인 확인.
- **weather 설계안 작성(10/9)**: `reports/weather-설계안-2026-10-09.md`. 같은 저장소 `apps/weather` + 별도 Cloudflare Worker, 기상청 API는 Worker에서 직접 호출·캐시. 다음: 사용자 활용신청(단기예보·중기예보·에어코리아, 특보 권장).
- **weather 배포(10/13)**: Cloudflare Worker `guidejung-weather` 생성(배포 명령 `npx wrangler deploy -c apps/weather/wrangler.jsonc`, 빌드 명령 비움, 미리보기 빌드 끔), Secret `DATA_GO_KR_KEY` 등록, main 빌드 성공, 도메인 `weather.guidejung.com` 연결. Cloudflare의 "루트 wrangler.jsonc 이름 불일치" 경고·자동 PR은 무시(병합 시 trip 배포가 깨짐). 10/13 라이브 확인: 페이지·ads.txt·robots·sitemap 200, `/api/weather` 정상(errors 없음, 미세먼지·자외선·10일 예보 포함). 캐시 없는 첫 호출이 이 클라우드(해외 경유)에서 14~60초로 느림 → 국내 방문자 기준 속도 확인 필요, 느리면 응답 시간 개선(기상청 호출 타임아웃 단축·부분 응답) 검토. 클라우드 환경 허용 도메인에 weather·trip.guidejung.com 추가됨.
- **weather 메뉴 개편(10/13)**: 상단 메뉴를 기능 중심으로 변경 — 오늘 날씨 · 주말 날씨(`/weekend`, 시도 16곳 주말 예보 맑은 순·trip 연결) · 미세먼지(`/air`, 전국 초미세먼지 TOP 10·시도 평균, `/api/air` 1회 호출 캐시) · 옷차림(`/wear`, 내 지역 오늘 옷차림+기온별 표) · 전국 날씨(`/region`) · 여행정보↗. 메인에 세 페이지 바로가기 카드.
- **weather MVP 코드(10/10)**: 메인(최근 지역·내 위치)·시도 16·시군구 256 페이지, 지금 날씨+한 줄 요약, 생활 카드(옷차림·우산·미세먼지·자외선), 48시간·10일 예보, 미세먼지, 일출·일몰, trip 연결 카드, 주변·같은 시도 지역 링크, 애드센스 2곳, sitemap·robots·ads.txt. 실제 API로 Worker 응답 확인. 다음: 무료 플랜 CPU 10ms 초과 여부 확인, Search Console·네이버 등록, 특보 띠·순위·주말 페이지 추가.
- **weather 활용신청 현황(10/10)**: 7개 모두 신청 완료 — 기상청 단기예보(15084084, 승인 확인)·중기예보·기상특보·생활기상지수, 에어코리아 대기오염정보·측정소정보(15073877), 천문연 출몰시각. 키는 공공데이터포털 계정 공통 키(저장소·채팅에 두지 않음 → Cloudflare Worker 비밀값과 컴퓨터 `.env`에만). 일일 한도: 에어코리아 2종 500, 나머지 10,000(호출 계획은 weather 설계안 3-1장). 10/10 클라우드 환경 허용 도메인에 `apis.data.go.kr` 추가 → 실호출 확인: 단기예보·중기예보·기상특보·출몰시각·에어코리아 측정소정보(672곳)·대기오염정보(sidoName=전국 1회로 672곳) 정상. 생활기상지수(4.0)는 End Point `1360000/LivingWthrIdxServiceV5` — `getUVIdxV5`(자외선)·`getAirDiffusionIdxV5`(대기정체) 정상, `getSenTaIdxV5`(체감온도)는 10월에 서비스 없음 오류(계절 제공으로 추정, 미확인). 에어코리아 응답이 가끔 connection reset → 재시도 필요.
- 애드센스 보고서(광고 단위별)로 수동 광고 위치별 성과 확인 후 조정
- 데이터 확대(`collect-trip.bat`, 하루 약 190건 한도)
- **TourAPI 운영계정 신청 완료(2026-10-09, 승인 대기)**: 공공데이터포털 "한국관광공사_국문 관광정보 서비스_GW"(data.go.kr/data/15101578) 개발계정(하루 1,000회) → 운영계정 전환 신청. 활용사례: 서비스 URL `https://trip.guidejung.com`, 서비스 설명·기능 설명, 공유 데이터 CSV(389건), 대표 이미지(248x93) 제출. 승인 기간은 미확인 → 마이페이지 활용신청 현황에서 확인. **승인되면 컴퓨터 `.env`의 `TOURAPI_DAILY_LIMIT`를 승인 한도로 변경**해야 수집량이 늘어남(README·CLAUDE.md의 "하루 약 190건" 문구도 갱신).
- **매일 자동 수집(컴퓨터에서 진행 예정)**: `collect-trip.bat`은 건수 입력·pause가 있어 무인 실행 불가. 무인 스크립트(수집 → export → trip.json 커밋·push) 작성 후 Windows 작업 스케줄러 등록. 실행 시각·하루 목표 건수는 사용자에게 확인.
- Search Console: rss.xml 성공(197페이지). sitemap.xml은 10/7 제출 후 "가져올 수 없음" → 10/8 재제출, 구글이 읽을 때까지 대기 중. 며칠 뒤에도 실패면 원인 조사
- 네이버 서치어드바이저 사이트맵 제출 확인(trip·weather)
- 공간 경계 실검증, 행사 회차 모델, 선택적 재검수(보고서 `reports/GuideJung-최종설계보고서-2026-10-07.md` 9장)

## 기기 전환 규칙
- 작업을 끝낼 때: 커밋하고 push.
- 다른 기기에서 시작할 때: 먼저 pull.
- 의미 있는 변경 후에는 이 파일의 "현재 상태"와 "다음 할 일"을 갱신.
