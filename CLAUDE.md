# CLAUDE.md — GuideJung Data Platform

컴퓨터(Claude Code)와 핸드폰(Claude 앱 Code 탭)에서 번갈아 작업하는 프로젝트입니다. 작업을 시작할 때 이 파일과 `README.md`를 먼저 읽으세요.

## 프로젝트 한 줄 요약
`trip.guidejung.com` 여행 검색 서비스. 한국관광공사 TourAPI 공식 데이터를 수집·검수해 **정적 사이트**로 Cloudflare Workers에 배포합니다. 기존 guidejung.com(WordPress·DB·서버·DNS)은 절대 건드리지 않습니다.

## 사용자 작업 원칙
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

## 현재 상태 (2026-10-08 기준)
- 사이트 Cloudflare Workers 배포 완료, 검색 노출(SEO) 켜짐.
- robots.txt 정적 제공, Daum 웹마스터 PIN·Naver 사이트 인증 메타태그 추가, RSS 피드 추가.
- 사이트 제목 "여행정보", 탭 아이콘 자동차 아이콘.
- Google AdSense 적용: 자동광고 코드·ads.txt. 앵커·사이드레일·전면 등 자동광고 형식은 AdSense에서 trip만 따로 관리할 수 없어 guidejung.com 사이트 설정을 함께 따름.
- 수동 디스플레이 광고 배치: 상세 페이지 2곳(소개글 아래, "주변에서 함께 둘러볼 곳" 위), 목록·검색 결과 아래 1곳, 홈 "이번 주말 행사" 아래 1곳. 안내 페이지(소개·출처·개인정보)에는 없음. 개인정보 안내에 광고·쿠키 고지 추가.
- 공개 데이터 200건(관광지 51·문화시설 49·레포츠 50·축제 50), 검수는 선택 사항(원천 자동 분류 표시).

## 다음 할 일 후보
- 애드센스 보고서(광고 단위별)로 수동 광고 위치별 성과 확인 후 조정
- 데이터 확대(`collect-trip.bat`, 하루 약 190건 한도)
- Search Console: rss.xml 성공(197페이지). sitemap.xml은 10/7 제출 후 "가져올 수 없음" → 10/8 재제출, 구글이 읽을 때까지 대기 중. 며칠 뒤에도 실패면 원인 조사
- 네이버 서치어드바이저 사이트맵 제출 확인
- 공간 경계 실검증, 행사 회차 모델, 선택적 재검수(보고서 `reports/GuideJung-최종설계보고서-2026-10-07.md` 9장)

## 기기 전환 규칙
- 작업을 끝낼 때: 커밋하고 push.
- 다른 기기에서 시작할 때: 먼저 pull.
- 의미 있는 변경 후에는 이 파일의 "현재 상태"와 "다음 할 일"을 갱신.
