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
- **애드센스: 설계보고서의 모든 하위 사이트(home·trip·traffic·academy·charge·weather)에 Google AdSense 광고를 넣습니다.** 게시자 ID `ca-pub-3087515825675332`, 수동 디스플레이 광고 슬롯 `6639512269`(`packages/ui/src/adsense.ts`, 자동광고 `AdSenseScript`, 수동광고 `AdSlot`), 각 사이트 `public/ads.txt` 필수. 기존 guidejung.com(WordPress)은 따로 운영 중이므로 연결·변경하지 않습니다.

## 구조
- `apps/trip` — Next.js 정적 사이트(빌드 결과 `apps/trip/out`). Next.js 버전이 최신이라 API가 다를 수 있으니 `apps/trip/AGENTS.md` 참고.
- `packages/ui` — 공통 UI·검색·RSS 로직
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
| 테스트 `npm run check`, Python 단위 테스트 | ✅ | ✅ |

데이터 갱신 순서(컴퓨터): `collect-trip.bat` → (선택) 검수 → `export-site.bat` → `trip.json` 커밋·push → 자동 재배포.

## 현재 상태 (2026-10-08 오전 기준)
- 사이트 Cloudflare Workers 배포 완료, 검색 노출(SEO) 켜짐.
- robots.txt 정적 제공, Daum 웹마스터 PIN·Naver 사이트 인증 메타태그 추가, RSS 피드 추가.
- 사이트 제목 "여행정보", 탭 아이콘 자동차 아이콘.
- Google AdSense 적용: 자동광고 코드·ads.txt. 앵커·사이드레일·전면 등 자동광고 형식은 AdSense에서 trip만 따로 관리할 수 없어 guidejung.com 사이트 설정을 함께 따름.
- 수동 디스플레이 광고 배치: 상세 페이지 2곳(소개글 아래, "주변에서 함께 둘러볼 곳" 위), 목록·검색 결과 아래 1곳, 홈 "이번 주말 행사" 아래 1곳. 안내 페이지(소개·출처·개인정보)에는 없음. 개인정보 안내에 광고·쿠키 고지 추가.
- 공개 데이터 389건(장소 302·축제 87, 10/8 09:47 내보내기), 검수는 선택 사항(원천 자동 분류 표시).
- 10/8 컴퓨터 작업: 로컬 DB 위치를 `~/guidejung-data-postgres`로 고정, 내보내기 시 건수가 10% 넘게 줄면 중단(`--force`로 무시), 수집 진행률 표시, 수집 중 DB 중지 방지, `export-site.bat`이 push 전에 원격 커밋을 먼저 받아옴.

## 다음 할 일 후보
- **서비스 구축 순서(사용자 결정)**: trip → weather·charge → traffic·academy → **home은 맨 마지막**(최종설계보고서에서도 home은 범위 제외·추후 별도 설계).
- **weather 설계안 작성(10/9)**: `reports/weather-설계안-2026-10-09.md`. 같은 저장소 `apps/weather` + 별도 Cloudflare Worker, 기상청 API는 Worker에서 직접 호출·캐시. 다음: 사용자 활용신청(단기예보·중기예보·에어코리아, 특보 권장).
- **weather 활용신청 현황(10/10)**: 7개 모두 신청 완료 — 기상청 단기예보(15084084, 승인 확인)·중기예보·기상특보·생활기상지수, 에어코리아 대기오염정보·측정소정보(15073877), 천문연 출몰시각. 키는 공공데이터포털 계정 공통 키(저장소·채팅에 두지 않음 → Cloudflare Worker 비밀값과 컴퓨터 `.env`에만). 각 API 승인 여부·일일 한도는 마이페이지에서 확인 필요. 클라우드 세션은 네트워크 정책상 `apis.data.go.kr` 접속이 막혀 있음(환경 설정 Allowed domains에 추가하면 테스트 가능).
- 애드센스 보고서(광고 단위별)로 수동 광고 위치별 성과 확인 후 조정
- 데이터 확대(`collect-trip.bat`, 하루 약 190건 한도)
- **TourAPI 운영계정 신청 완료(2026-10-09, 승인 대기)**: 공공데이터포털 "한국관광공사_국문 관광정보 서비스_GW"(data.go.kr/data/15101578) 개발계정(하루 1,000회) → 운영계정 전환 신청. 활용사례: 서비스 URL `https://trip.guidejung.com`, 서비스 설명·기능 설명, 공유 데이터 CSV(389건), 대표 이미지(248x93) 제출. 승인 기간은 미확인 → 마이페이지 활용신청 현황에서 확인. **승인되면 컴퓨터 `.env`의 `TOURAPI_DAILY_LIMIT`를 승인 한도로 변경**해야 수집량이 늘어남(README·CLAUDE.md의 "하루 약 190건" 문구도 갱신).
- **매일 자동 수집(컴퓨터에서 진행 예정)**: `collect-trip.bat`은 건수 입력·pause가 있어 무인 실행 불가. 무인 스크립트(수집 → export → trip.json 커밋·push) 작성 후 Windows 작업 스케줄러 등록. 실행 시각·하루 목표 건수는 사용자에게 확인.
- Search Console: rss.xml 성공(197페이지). sitemap.xml은 10/7 제출 후 "가져올 수 없음" → 10/8 재제출, 구글이 읽을 때까지 대기 중. 며칠 뒤에도 실패면 원인 조사
- 네이버 서치어드바이저 사이트맵 제출 확인
- 공간 경계 실검증, 행사 회차 모델, 선택적 재검수(보고서 `reports/GuideJung-최종설계보고서-2026-10-07.md` 9장)

## 기기 전환 규칙
- 작업을 끝낼 때: 커밋하고 push.
- 다른 기기에서 시작할 때: 먼저 pull.
- 의미 있는 변경 후에는 이 파일의 "현재 상태"와 "다음 할 일"을 갱신.
