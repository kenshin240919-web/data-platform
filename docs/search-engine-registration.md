# 새 사이트 검색엔진 등록 안내 (사용자가 직접 — 10/26 사용자 결정)

크롬 패널로는 소유 확인이 되지 않아(10/26 사용자 확인) **사이트 등록·소유 확인·사이트맵 제출은 사용자가 직접** 한다.
Claude는 아래 순서를 안내하고, 받은 인증 코드를 사이트에 넣어 배포·라이브 확인까지 한다. IndexNow(Bing·네이버 새 주소 알림)는 자동(`indexnow.yml`).

## 1단계: 인증 코드 받기 → Claude에게 전달
| 검색엔진 | 들어가는 곳 | 고를 방식 | Claude에게 줄 값 |
|---|---|---|---|
| 네이버 | https://searchadvisor.naver.com → 웹마스터 도구 → 사이트 등록에 `https://{사이트}.guidejung.com` | HTML 태그 | `content="…"` 값 |
| Bing | https://www.bing.com/webmasters → 사이트 추가 | HTML 메타 태그 | `msvalidate.01` 값(계정에 하나라 보통 이전 사이트와 같음) |
| 다음 | https://webmaster.daum.net → 사이트 등록 | PIN 코드 | `#DaumWebMasterTool:…` 한 줄 |
| 구글 | https://search.google.com/search-console | `guidejung.com` 도메인 속성이 있으면 등록 필요 없음, 없으면 URL 접두어로 추가 | (HTML 태그 방식일 때만) `google-site-verification` 값 |

Claude가 할 일: 네이버·Bing은 layout `metadata.verification.other`, 다음 PIN은 `public/robots.txt` **마지막 줄**에 넣고 배포 → 메인·상세 HTML과 robots.txt에서 라이브 확인 후 "확인 버튼 누르셔도 됩니다"라고 알림.

## 2단계: 소유 확인 버튼 → 사이트맵·RSS 제출
- 네이버: 사이트 목록 → 해당 사이트 → **소유확인** → 요청 → 사이트맵 제출 `https://{사이트}.guidejung.com/sitemap.xml`, RSS 제출 `…/rss.xml`
- Bing: **확인(Verify)** → 사이트맵에 `sitemap.xml`·`rss.xml`
- 다음: **인증(확인)**
- 구글: Sitemaps에 `sitemap.xml`·`rss.xml`
- 1~2주 뒤 각 검색엔진에서 색인(수집) 수 확인
