# GuideJung 데이터 플랫폼 — 구축 전 설계보고서

조사 기준: 2026-10-06 KST. 권고안이며 구축·배포·대량 수집은 실행하지 않았다.

**추천: 기존 사이트와 분리한 신규 서버 + Next.js + FastAPI + PostgreSQL/PostGIS. home을 통합 허브로 설계하고 trip부터 검증한다. 초기 인프라 예산은 월 $50~60 수준이다.**

공식 문서·공개 웹·DNS를 읽기만 했다. 작업 폴더에는 기존 프로젝트 파일이 없었고, 서버 계정·DB 정보·TourAPI 인증키도 제공되지 않았다. 따라서 기존 호스팅 내부 구조, 실제 API 응답의 필드 충족률과 고유 레코드 수는 미확인이다. Firecrawl은 로컬 네트워크 연결 오류로 조회에 실패해 웹 검색 도구로 공식 자료를 확인했다.

## 1. 전체 GuideJung 네트워크 아키텍처

```text
guidejung.com ── 기존 운영 환경 유지 / 신규 시스템과 연결 권한 없음

신규 플랫폼 전용 환경
home.guidejung.com ── 통합 검색·지역·주말 정보 허브
    ├─ trip.guidejung.com     여행·축제·행사·가볼만한곳
    ├─ traffic.guidejung.com  도로·CCTV·교통
    ├─ academy.guidejung.com  학원·교습소·수강료
    ├─ charge.guidejung.com   전기차 충전소
    └─ weather.guidejung.com  지역·여행·생활날씨
                  │
          공통 내부 API / 공통 데이터 계약
                  │
 PostgreSQL: core + trip + 향후 서비스별 schema
                  │
  수집 worker → RAW 저장 → 검증 → 버전별 데이터 공개
```

프론트엔드는 독립 배포 가능한 앱으로 나눈다. 지역·장소 ID·검증·디자인·API client·SEO·분석 코드는 공유 패키지로 관리한다. 첫 운영은 home과 trip만 배포하고 나머지는 데이터를 확보한 뒤 공개한다. 허브 집계는 공개 웹페이지를 긁지 않고 내부 API 또는 읽기 전용 집계 테이블을 사용한다.

## 2. guidejung.com을 건드리지 않는 운영 방법

| 현재 확인 | 결과 / 해석 |
|---|---|
| 공개 홈페이지 | 여행추천가이드 사이트 응답 확인. [공개 페이지](https://guidejung.com/) |
| NS 조회 | `sloan.ns.cloudflare.com`, `kyree.ns.cloudflare.com` |
| A 조회 | `54.230.62.70`, `.6`, `.23`, `.72` |
| home·trip A 조회 | 현재 조회 경로에서 NXDOMAIN. DNS 관리 화면·예약 상태는 미확인 |
| 실제 원본 서버·DB·WordPress 구성 | 공개 조회로 확인할 수 없음 |

NS는 DNS 사업자 정보이며 원본 호스팅 사업자를 확정하지 않는다. A 레코드만으로 서버 디렉터리·DB·CDN 설정을 확정하지 않는다.

분리 운영안:

- 신규 AWS 계정 또는 엄격히 분리된 신규 리소스에 전용 서버를 만든다. 기존 서버를 재사용하지 않는다.
- 신규 Supabase 프로젝트/DB, 전용 저장소·서비스 계정·키·로그·캐시·배포 파이프라인을 사용한다.
- 기존 WordPress, 웹서버, DB, Search Console, Analytics, AdSense에는 접근·변경하지 않는다.
- 승인 후 기존 DNS 전체를 읽기 전용으로 확인하고, 충돌 없는 `home`, `trip` 레코드와 신규 인증서 검증용 레코드만 추가한다. 기존 이름의 레코드 수정·삭제, NS 이전, 와일드카드 추가는 하지 않는다.
- 신규 CloudFront 배포를 별도로 사용한다. 기존 도메인의 Cloudflare 전역 SSL·캐시·방화벽 규칙을 변경하지 않는다.
- 인증서는 신규 호스트에 한정한다. DNS 검증 이름이 기존 레코드와 충돌하면 덮어쓰지 않고 배포를 중단한다.
- cookies는 호스트 범위로 발급한다. `.guidejung.com` 전체에 공유하지 않는다.
- 배포 전에 신규 리소스 ID·DB 주소·허용 호스트를 확인하고, 기존 도메인을 배포 대상으로 지정할 수 없게 한다.

현재 실행한 외부 작업은 공개 페이지 읽기와 DNS 조회뿐이다. DNS·서버·외부 계정 설정 변경은 없다.

## 3. home.guidejung.com 역할 및 화면 구조

상단: GuideJung 브랜드 → “필요한 정보를 바로 찾아보세요” → 지역·장소·정보 통합 검색.

검색 아래: 여행 / 교통 / 교육 / 전기차 / 날씨 서비스 카드.

본문: 지역 선택 → 이번 주말 가볼만한곳 → 진행 중인 축제 → 지역별 주말 날씨 → 주요 도로 상황 → 주변 충전소.

각 정보에 출처·데이터 기준시각·전문 서비스 이동 링크를 표시한다. 최초에는 trip 데이터만 노출하고, 미개통 서비스는 ‘준비 중’으로 표시한다. 데이터가 없는 카드에 실제 현황처럼 보이는 예시 값을 넣지 않는다.

검색 결과는 서비스별로 묶고 같은 장소는 공통 `place_id`, 지역은 `region_id`로 연결한다. 주변 정보는 사용자의 위치 허용 후 제공하며 지역 수동 선택도 지원한다. home의 검색 결과와 요약 카드는 전문 상세페이지로 연결한다.

## 4. trip.guidejung.com 상세 구조

핵심 목적: **오늘 또는 이번 주말 어디 갈지 결정하는 여행 검색 서비스**.

| 화면 | 구성 |
|---|---|
| 첫 화면 | 지역·날짜·조건 선택 → 오늘/주말 축제 → 조건별 장소 → 최근 확인 정보 |
| 검색·목록 | 카드/목록, 지역·거리·날짜·무료·아이·반려동물·실내 필터, 지도 보기 |
| 장소 상세 | 주소·지도·운영시간·휴무·요금·주차·편의시설·출처·확인일 |
| 축제 상세 | 개최 회차·일정·장소·요금·주최·공식 링크·취소/변경 상태 |
| 지역 상세 | 지역 내 장소·축제·조건별 목록·데이터 보유/확인 현황 |
| 연결 정보 | 주변 장소·같은 지역의 행사, 향후 날씨·도로·충전소 |

요금·시간·반려동물 정책이 확인되지 않으면 ‘확인 필요’로 표시한다. 주변 거리는 좌표 기반 직선거리로 표시하고, 경로 API 확보 전 이동시간을 추정해 제공하지 않는다. 순위는 인기라고 임의 명명하지 않고 거리·일정 적합도·검증 최신성 등 계산 기준을 공개한다.

## 5. 사용할 최신 TourAPI / 공공데이터

| 우선순위 | 공식 서비스 | 사용 범위 |
|---|---|---|
| 필수 | [한국관광공사 국문 관광정보](https://www.data.go.kr/data/15101578/openapi.do) | `KorService2`; 지역/위치 목록·행사·상세·사진·반려동물·동기화 |
| 필수 | [행정표준코드 법정동](https://www.code.go.kr/stdcode/regCodeL.do?menuNo=101010100010) | 현존/폐지·생성/폐지 이력·공통 지역 검증 |
| 보조 | [행정안전부 행정동 자료](https://www.data.go.kr/data/3033254/fileData.do) | 행정기관코드·지역명 대조. 최신 공식 코드 원장 확보 후 적용 |
| 후속 | [고캠핑](https://www.data.go.kr/data/15101933/openapi.do) | 캠핑장·시설·위치. TourAPI 장소와 중복 판별 |
| 후속 | [기상청 단기예보](https://www.data.go.kr/data/15084084/openapi.do) / [중기예보](https://www.data.go.kr/data/15059468/openapi.do) | 여행 날짜에 맞는 예보; 발표시각·예보 유효시각 보존 |
| 확장 | [국가교통정보센터 공식 API 매뉴얼](https://its.go.kr/file/opendata/openapi_manual.pdf) | 교통소통·돌발·CCTV. 검색에서 기능 확인, 매뉴얼 본문 재확인 필요 |
| 확장 | [전국학원및교습소표준데이터](https://www.data.go.kr/data/15096277/standard.do) | 학원·교습소·등록상태·공개된 수강료 |
| 확장 | [한국환경공단 충전소 API](https://www.data.go.kr/data/15076352/openapi.do) | 충전소/충전기·위치·출력·상태·상태갱신시각 |

국문 관광정보 포털은 2026-02-26 수정본으로, 무료·개발계정 트래픽 1,000·운영계정 심의승인을 안내한다. `ldongCode2`, `lclsSystmCode2`, `areaBasedSyncList2`를 지원하므로 구 관광지역코드를 플랫폼 공통 행정코드로 사용하지 않는다. 세부 호출 제한과 페이지 상한은 승인된 계정 및 최신 매뉴얼로 확인한다. [공식 안내](https://www.data.go.kr/data/15101578/openapi.do)

공식 기능 확인 범위와 응답 매핑 후보:

| 기능 | 확보 대상 | 응답 검증 상태 |
|---|---|---|
| 목록·공통 상세 | 원천 콘텐츠 ID, 종류, 명칭, 주소, 좌표, 대표사진, 개요, 수정시각 | 기능 제공 확인; 실제 응답·결측률 미검증 |
| 소개·반복 상세 | 운영시간, 휴무, 요금, 주차, 문의, 시설 | 유형별 필드·형식·누락 정도 표본 확인 필요 |
| 행사 | 시작/종료일, 행사장, 주최·문의, 요금 | 일정·장소·요금 정규화 가능 여부 표본 확인 필요 |
| 반려동물 | 동반 정책과 관련 안내 | 조건 필터로 쓸 만큼 명확한지 표본 확인 필요 |
| 이미지 | 이미지 URL, 권리·출처 정보 | 개별 이미지 라이선스 확인 필요 |

좌표·날짜·무료·실내·아이 동반을 모든 레코드가 제공한다고 가정하지 않는다. ‘아이와 가기 좋음’은 공식 시설/정책 근거 또는 운영자 검수로 부여한다. 이미지에는 공공누리 1·3유형이 포함되므로 개별 권리정보를 저장하고 3유형은 변경 제한을 준수한다. [사진 이용 조건](https://www.data.go.kr/data/15101578/openapi.do)

## 6. 확보 가능한 데이터 규모

공식 포털 안내는 **15종 약 26만 건**이다. 고유 장소 26만 개, 현재 유효 축제 26만 개, 생성 가능한 SEO 페이지 26만 개라는 의미로 해석하지 않는다. 정확한 종류별 고유 수·활성 수·품질 통과 수는 아직 확인되지 않았다. [규모 안내](https://www.data.go.kr/data/15101578/openapi.do)

승인 및 키 확보 후 다음 순서로 실제 규모를 산출한다:

1. 같은 기준시각·지역/유형 조건으로 목록 첫 페이지의 `totalCount` 확인.
2. 지역/유형별 20~50건 정도의 소규모 표본으로 필드·결측·좌표·중복·이미지 권리를 확인.
3. 호출 예산 안에서 ID 목록을 확보한 뒤 고유 원천 ID와 공통 장소 수를 분리 집계.
4. RAW 수 → 고유 수 → 지역 검증 통과 수 → 날짜 유효 수 → 공개/색인 후보 수를 별도 보고.

목록 조회가 `P`건/페이지, 상세 추가 조회가 `k`회라면 초기 호출 추정은 `ceil(N/P) + N×k`이다. 지역/유형별 반복과 실패 재시도는 별도다. 예를 들어 5,000건·페이지 100건·추가 상세 3회면 약 15,050회로, 1,000회/일 허용을 가정하면 다른 호출 제외 약 16일이다. **가상의 비용·기간 계산이며 실제 데이터 규모가 아니다.**

초기 공개 목표는 검증된 장소 500~1,000건과 해당 지역의 유효 행사다. 전국 전량 공개는 품질과 동기화 안정성을 확인한 뒤 결정한다.

## 7. 공통 DB + trip DB schema

신규 PostgreSQL 한 DB 안에서 `core`, `trip`, `ingest`, `ops` schema를 분리한다. 아래는 논리 설계이며 SQL을 적용하지 않았다.

| 영역 / 테이블 | 주요 필드 / 관계 |
|---|---|
| core.region_versions | id, 발행기관, 코드체계, 자료기준일, checksum |
| core.regions | UUID id, version_id, code_system, code(text), level, name, parent_id, valid_from/to, status |
| core.region_mappings | 원천 코드체계·코드 → 내부 region_id, 매핑 유효기간·근거·신뢰도 |
| core.region_crosswalks | 법정동 region_id ↔ 행정동 region_id; 다대다·유효기간·근거 |
| core.places | UUID id, 이름, 주소원문, 도로명/지번 정규주소, 시도/시군구/법정동/행정동 region_id, WGS84 좌표, 검증상태 |
| core.place_sources | place_id, source_id, external_id, 원천 수정시각, fetched_at, verified_at, record_hash |
| core.images | id, 소속 source_record_id, 원본 URL, 출처·권리자·라이선스·변경허용 여부·확인일 |
| core.facilities / place_facilities | 시설 정의 및 place_id 연결; 값·근거·검증일 |
| core.data_sources | id, 제공기관, API 버전, 출처 URL, 라이선스, 호출한도, 승인상태 |
| trip.tourism_categories | 원천 코드체계/버전·코드·이름·부모; 플랫폼 분류와 매핑 |
| trip.place_profiles | place_id(PK/FK), 소개, 운영시간 원문/정규값, 휴무, 가격정보, 전화, 공식 URL |
| trip.place_categories | place_id ↔ category_id 다대다 |
| trip.place_conditions | place_id, 조건키, true/false/unknown, 근거·유효기간·검수자 |
| trip.events | UUID id, series_id, 회차 식별자, 명칭, 시작/종료일, 시간 nullable, 상태, 주최, 요금, 공식 URL |
| trip.event_sources / event_places | 행사 원천 식별자 및 행사 ↔ 개최 장소 다대다 |
| ingest.raw_records | source_id, endpoint, external_id, 요청조건(키 제외), fetched_at, 원본 JSON/XML 또는 private object key, checksum |
| ingest.dataset_versions | id, 원천 snapshot/watermark, region_version_id, 정상화 규칙버전, 상태·공개시각 |
| ops.data_validation | 대상종류/ID, dataset_version_id, 규칙, 결과, 점수, 근거·검사시각 |
| ops.sync_logs | job_id, source_id, 호출·성공·실패·갱신·삭제의심 수, checkpoint, 오류·시작/종료시각 |
| ops.page_index_policy | 호스트·경로, 공개 데이터 버전, quality_score, indexable, 판단근거, content_updated_at |

핵심 제약:

- 원천 레코드는 `UNIQUE(source_id, external_id)`로 upsert한다. 서로 다른 API의 ID는 같아도 별개다.
- 지역은 `UNIQUE(version_id, code_system, code)`. 코드는 문자열로 저장한다.
- TourAPI 지역코드, 행정안전부 행정동, 법정동, 통계용 행정구역 코드를 별도 체계로 취급한다. 법정동→행정동은 자동 1:1 변환하지 않는다.
- 정규 장소 UUID를 네트워크 전체에서 공유한다. 도로 링크·기상 격자 등 장소가 아닌 개체는 억지로 places에 넣지 않는다.
- PostGIS `geography(Point,4326)` 및 GiST 인덱스로 주변 검색한다. 좌표 생성은 경도·위도 순서로 통일한다.
- 시도·시군구 필터는 region_id 인덱스, 행사 일정은 날짜 인덱스, 원천 식별자는 고유 인덱스를 둔다.
- 주소는 원문을 보존하고 도로명·지번·우편번호를 분리한다. 주소번호·건물명을 무리하게 삭제하지 않는다.
- 시간은 UTC 저장 + KST 표시, 행사 날짜만 알려진 경우 date와 시간 미상으로 보존한다.
- 원천 API 키는 DB·RAW·로그에 저장하지 않는다. 프론트엔드에는 제공하지 않는다.

[공식 법정동 코드·이력](https://www.code.go.kr/stdcode/regCodeL.do?menuNo=101010100010), [행정동 코드 자료](https://www.data.go.kr/data/3033254/fileData.do)

## 8. WordPress vs 독립 애플리케이션

| 기준 | 신규 WordPress 별도 설치 | Next.js + 독립 API |
|---|---|---|
| 글 작성·편집 | 관리자와 편집 기능 활용이 쉬움 | 간단한 검수 관리 화면 제작 필요 |
| 구조화 데이터 | CPT·taxonomy·별도 테이블 설계 가능 | 관계형 schema·제약·버전관리 직접 설계 |
| 지역·날짜·거리·복합 검색 | 플러그인/커스텀 구현 필요 | SQL/PostGIS와 API로 구성 |
| 5개 서비스 재사용 | 플러그인/API 분리 설계 필요 | 공통 패키지·데이터 계약 재사용이 자연스러움 |
| 데이터 동기화 | WP 배치/외부 worker 필요 | 수집 worker·검증 pipeline 독립 운영 |
| 관리 부담 | 플러그인 호환·보안·쿼리 관리 | 앱·의존성·배포·모니터링 관리 |

WordPress로도 가능하다. 다만 이번 목표는 글 발행보다 복합 조건 검색과 데이터 검증이 중심이므로 독립 앱을 권고한다. WordPress를 선택하더라도 기존 사이트와 설치·DB를 공유하지 않는다. 비교는 설계 판단이며 성능 벤치마크 결과가 아니다. [WordPress CPT 공식 문서](https://developer.wordpress.org/plugins/post-types/)

## 9. 최종 추천 기술스택

| 요소 | 추천 |
|---|---|
| frontend | Next.js App Router + TypeScript; 검색/목록 SSR, 검증된 상세·지역은 ISR |
| 디자인 | 공통 토큰·컴포넌트, 모바일 우선; home/trip에서 재사용 |
| backend | FastAPI + Pydantic; 공통 조회 API·검증 관리 기능 |
| 수집 | Python worker; 초기 cron/systemd timer, 체크포인트·재시도·실행 잠금 |
| database | 신규 Supabase Pro PostgreSQL + PostGIS; 국내 사용자 지연을 고려한 리전 선택 |
| 검색 | PostgreSQL 지역/날짜/조건 + pg_trgm; 한국어 검색 품질 측정 후 전용 검색엔진 추가 |
| cache | 단일 앱 ISR·짧은 API TTL; 확장 시 Redis/공유 캐시 |
| hosting | 신규 AWS Lightsail 서울 4GB Linux, Docker Compose |
| CDN | 신규 CloudFront 배포; 기존 DNS 서비스 유지 |
| RAW·백업 | 신규 private R2 버킷 또는 별도 객체 저장소, 암호화·만료 정책 |
| analytics | 신규 플랫폼 전용 GA4 property + 서비스별 stream, 공통 service/region 이벤트 |

Next.js는 Node/Docker 자가 호스팅과 ISR을 지원한다. 전체 데이터를 빌드 시 미리 생성하지 않고 필요한 상세페이지부터 재검증한다. 여러 서버로 늘릴 때는 공통 캐시·태그 무효화를 함께 설계한다. [자가 호스팅](https://nextjs.org/docs/app/guides/self-hosting), [ISR](https://nextjs.org/docs/app/guides/incremental-static-regeneration)

## 10. 서버 구성 및 백업

초기에는 전용 서버 한 대에서 Caddy(reverse proxy)·home·trip·FastAPI를 실행한다. 수집 작업은 동시에 한 개로 제한하고 빌드는 CI에서 수행한다. DB는 외부 신규 managed DB에 둔다.

```text
/srv/guidejung-data/apps/home
/srv/guidejung-data/apps/trip
/srv/guidejung-data/services/api
/srv/guidejung-data/workers
/srv/guidejung-data/env/{service}.env
/srv/guidejung-data/cache/{service}
/srv/guidejung-data/logs/{service}
```

DB 공개 직접 접속은 최소화하고 앱에는 서비스별 최소 권한을 부여한다. 공개 API는 검증 완료 데이터만 반환하며 수집·관리 API는 인증으로 제한한다. host allowlist는 신규 호스트만 포함한다.

Supabase Pro는 일일 백업 7일 보관을 제공한다. 별도로 일일 암호화 logical dump를 다른 저장소에 30일, 월간본을 3개월 보관하고 초기 및 월 1회 새 임시 DB로 복구한다. RAW와 설정·배포 버전도 함께 보존한다. 초기 목표 RPO 24시간, RTO 4시간은 복구 시험 후 확정한다. PITR은 기본 예산에 포함하지 않는다. [백업·요금](https://supabase.com/pricing)

서버 한 대 구성은 고가용성이 아니다. 신규 플랫폼 장애가 기존 사이트에 전파되지 않도록 계정·원본 서버·DB를 분리한다.

## 11. 예상 초기 월 운영비

전제: home+trip, 소규모 유입, 4GB 서버 1대, DB 기본 플랜 범위, 객체 저장/백업 예산. 인건비·기존 사이트 비용·광고비·유료 지도/경로 API·AI API·세금·트래픽 초과는 제외한다.

| 항목 | 월 USD | 근거 / 전제 |
|---|---:|---|
| 신규 Lightsail 4GB/2vCPU/80GB, public IPv4 | 24 | [AWS 번들](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html) |
| Supabase Pro, 기본 프로젝트 1개 | 25부터 | [공식 가격](https://supabase.com/pricing); DB/egress/compute 증설 시 증가 |
| 신규 CloudFront Free, home/trip 각각 | 0 | [공식 가격](https://aws.amazon.com/cloudfront/pricing/); 신규 계정의 이용 자격·무료 배포 수 확인 필요 |
| RAW·외부 백업 | 1~5 예산 | 사용량 가정. [R2](https://www.cloudflare.com/products/r2/) Standard $0.015/GB-month, 요청비 별도 |
| TourAPI·기상 API | 0 | 위 공공데이터 포털의 무료 조건; 호출량 승인 별도 |
| 합계 | **50~54** | 여유를 포함해 **$50~60/월** 계획 |

예산 환산용 **$1=1,400원 가정**이면 월 약 **7만~8.4만원**이다. 현재 환율을 확인한 견적이 아니다.

CloudFront Free는 배포당 월 100만 요청/100GB 기준을 안내한다. 운영 목적·로그 기능·계정 자격에 따라 Pro를 선택할 수 있다. home/trip 두 배포를 모두 Pro($15/배포)로 운영하면 합계 $80~84, 여유 포함 $80~90/월을 잡는다. 기존 CDN 요금제를 바꾸지 않는다. 무료 적격성이나 최종 리전 가격이 다르면 배포 전에 예산을 다시 제시한다. [CloudFront 가격](https://aws.amazon.com/cloudfront/pricing/), [계정 요건](https://docs.aws.amazon.com/PricingPlanManager/latest/UserGuide/plans.html)

## 12. URL 구조

| 호스트 | URL 예시 / 정책 |
|---|---|
| home | `/`, `/search/?q=강릉`, `/region/{stable-region-id}/` |
| trip 장소 | `/place/{stable-place-id}/` |
| trip 축제 | `/festival/{stable-event-occurrence-id}/` |
| trip 지역 | `/region/{stable-region-id}/` |
| trip 날짜 | `/today/`, `/weekend/` |
| trip 조건 | `/free/`, `/kids/`, `/pet/`, `/indoor/` |
| trip 검증된 조합 | `/region/{id}/weekend/`, `/region/{id}/free/` 등 선별 공개 |
| 사용자 필터 | `/search/?region={id}&date=2026-10-10&pet=true` — 기본 noindex |

슬러그보다 내부 불변 ID를 기본키로 사용한다. 같은 축제라도 매년 개최 회차 ID를 구분하고 연속성은 series_id로 연결한다. 행정구역 개편 시 공식 코드의 이력을 보존하고 URL용 내부 ID의 존속/이관을 명시한다.

상세페이지 canonical은 자신의 전문 호스트를 가리킨다. home은 독자적인 요약·검색 허브만 제공하고 trip 상세 본문을 복제하지 않는다. 서비스 간 링크에는 공통 지역/장소 ID를 전달한다.

## 13. sitemap 구조

각 사이트의 `/sitemap.xml`은 해당 호스트 URL만 담는다.

```text
home.guidejung.com/sitemap.xml
  └─ home의 메인·검증된 지역 허브

trip.guidejung.com/sitemap.xml (sitemap index)
  ├─ /sitemaps/places-001.xml
  ├─ /sitemaps/festivals-001.xml
  ├─ /sitemaps/regions.xml
  └─ /sitemaps/collections.xml

traffic / academy / charge / weather
  └─ 서비스 공개 시 자신의 /sitemap.xml 생성
```

개별 sitemap은 50,000 URL·비압축 50MB 이하로 분할한다. 200 응답·indexable·canonical URL만 넣고, `lastmod`는 실제 내용 변경시각을 사용한다. noindex·리다이렉트·404·검색 파라미터 URL은 제외한다. 기존 guidejung.com sitemap은 수정하지 않는다. [Google sitemap 지침](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

신규 robots.txt에는 자기 sitemap만 선언한다. Search Console도 신규 호스트마다 URL-prefix property를 만들고 신규 HTML 파일/meta 방식으로 검증해 기존 property 설정을 바꾸지 않는다.

## 14. 데이터 업데이트 방식

필수 처리 순서:

**공공 API → RAW → 정규화 → 행정구역 검증 → 중복 제거 → 품질점수 → DB → 페이지 → 색인 여부**.

검증 전 RAW는 private 저장소/ingest staging에 보관하고 공개 조회 대상 DB 테이블에 바로 넣지 않는다.

| 데이터 | 초기 운영 주기 제안 |
|---|---|
| 장소 기본·상세 | 변경 목록 매일 확인, 변경분 상세조회, 주 1회 목록 대조 |
| 진행/예정 행사 | 매일 확인, 임박 행사 우선; 변경·취소 공식 안내 대조 |
| 사진·시설·정책 | 원천 변경 시 갱신, 장기 미확인 건 재검수 |
| 지역 코드 | 공식 변경 공지 확인 및 월간 원장 대조, 개편 시 새 버전 생성 |
| 날씨 | 발표주기에 맞춰 필요한 지역/격자만 수집; 시간 범위 초과 시 미제공 |
| 교통·충전상태 | 운영계정 한도 확보 후 1~5분 목표; 미갱신이면 상태미상 표시 |

이는 수집 목표 주기이며 원천이 그만큼 자주 갱신된다는 보장이 아니다. 조회시각을 ‘내용 확인일’로 대체하지 않는다.

원천별 호출 큐·일일/초당 한도·지수 backoff·실행 잠금·checkpoint를 둔다. 날짜 범위가 겹치도록 재조회하고 hash로 재처리 중복을 방지한다. 오류/인증 만료/급격한 건수 감소 시 해당 source 공개 버전을 갱신하지 않는다.

스테이징 검증이 끝난 dataset_version을 트랜잭션으로 공개한다. 허브·전문페이지·통계는 같은 공개 버전을 읽는다. DB 공개 후 관련 페이지 캐시와 sitemap을 갱신한다. CDN은 초기 정적 asset 중심으로 사용하고, HTML을 캐시할 경우 Next.js 재검증과 CDN purge를 함께 수행한다. [Next.js CDN 지침](https://nextjs.org/docs/app/guides/cdn-caching)

목록에서 한 번 사라졌다고 삭제하지 않는다. 공식 삭제표시·반복 대조·운영자 검수로 폐업/종료를 판정하고 이력을 보관한다.

## 15. 데이터 검증 방식

| 검증 | 처리 |
|---|---|
| 행정구역 | 코드체계/버전·주소·좌표를 대조. 경계 인근·자료 상충은 검수 큐 |
| 좌표 | 좌표계·위경도 순서·범위·0값 검사. 경계 데이터 권리/버전 확인 후 공간 대조 |
| 중복 | 동일 source ID는 upsert, 다른 source는 명칭·주소·좌표로 후보 생성. 자동 합치기는 확실한 경우만 |
| 날짜 | 시작≤종료, 과거 행사를 현재 행사와 분리, KST 기준 기간 겹침 판정 |
| 조건 | 무료·아이·반려동물·실내는 근거가 있는 true만 검색에 포함 |
| 문장 | 이름·지역·날짜·가격을 구조화 값과 대조. 미확인 사실을 자동 생성하지 않음 |
| 최신성 | source_modified_at / fetched_at / verified_at을 구분하고 항목별 만료 기준 적용 |
| 사진 | 라이선스·권리자·출처를 기록하고 사용/변경 가능 여부 검증 |
| 통계 | 같은 dataset_version, 필터 조건, 집계 단위로 재계산 |

임시 품질점수는 지역·좌표 25 / 핵심정보 25 / 최신성 20 / 상세정보 20 / 출처·권리 10 = 100점. **80점 이상이어도 필수검증 실패·중복·thin page이면 색인하지 않는다.** 점수와 임계값은 초기 운영 규칙이며 Google의 기준이 아니다.

초기 공개 전 지역/유형별 표본을 사람이 검수한다. 관리자 화면에는 수집 완료/전체, 현재 작업, 예상 남은 시간, 검증 오류·미확인·중복 후보 수를 표시한다. ETA는 실제 처리속도로 계산한다.

## 16. Google SEO / index 전략

- 검색 순위를 위한 원천 문장 대량 복제보다 날짜·조건·주변 정보·확인일을 결합해 결정에 필요한 정보를 제공한다. [Google 대규모 콘텐츠 악용 정책](https://developers.google.com/search/docs/essentials/spam-policies)
- 초기 색인 대상은 검증된 장소·개별 행사·정보가 충분한 지역/조건 목록으로 제한한다. 초기 목록 최소 5개 유효 항목 기준은 내부 운영 가정이며, 숫자만 충족해도 자동 색인하지 않는다.
- 검색 결과·희소 목록·무제한 필터 조합은 noindex. 모든 지역×날짜×조건 URL을 생성하지 않는다.
- noindex 페이지는 Google이 규칙을 읽을 수 있게 크롤링을 허용한다. robots.txt로 막는 것과 혼용하지 않는다. [Google noindex 지침](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- 오래된 축제는 과거 회차임을 명확하게 표시한다. 기록 가치가 있으면 보존하고, 정보가 빈약하면 noindex한다. 실제 제거된 콘텐츠는 상황에 맞는 404/410을 사용한다.
- 개별 실제 행사에만 Event 구조화 데이터를 넣는다. 취소·연기는 상태를 수정하고, 시간이 미상인 경우 임의로 자정 값을 만들지 않는다. [Google Event 지침](https://developers.google.com/search/docs/appearance/structured-data/event)
- home은 Organization/WebSite, trip은 BreadcrumbList·Place/관광지 유형·Event를 페이지 내용에 맞게 적용한다. 구조화 데이터는 노출 보장이 아니다.
- 각 사이트의 이름·favicon·canonical·robots·sitemap·Search Console을 분리하고 GuideJung 브랜드 표현을 공유한다. 신규 Analytics는 service_id·region_id 기준으로 비교한다.
- 성과는 검색노출·클릭·색인율뿐 아니라 검색→상세→공식 사이트/길찾기 이동, 데이터 오류율과 갱신 지연을 함께 본다.

## 17. traffic / academy / charge / weather 확장 방법

| 서비스 | 추가 모델 | 공통 연결 / 주의점 |
|---|---|---|
| traffic | cameras, road_links, traffic_status, incidents | 카메라 좌표·도로 링크 ID와 지역 연결; CCTV URL 만료·이용조건 확인 |
| academy | academies, courses, academy_fees | 기관 원천 ID·place_id·지역. 공개 수강료의 기준기간/과정/갱신일 저장 |
| charge | charging_stations, chargers, charger_status | 운영기관+충전소 ID+충전기 ID, place_id·좌표. 정적 정보와 실시간 상태 분리 |
| weather | forecast_areas, grids, region_grid_mappings, forecasts | 좌표/지역 ↔ 기상청 격자·중기예보구역. 발표시각+유효시각+요소별 저장 |

정적 공통 지역·장소는 core를 공유하고 잦은 상태 갱신은 서비스별 테이블/캐시에 둔다. 데이터 계약에는 `region_id`, 가능한 경우 `place_id`, 좌표, 출처, 기준시각, 공개 버전, 품질/신선도 상태를 포함한다. 모든 개체에 place_id가 필수인 것은 아니다.

진행 순서: ① 신규 환경 경계·계정 확인 → ② API 소규모 표본과 실제 건수 보고 → ③ trip 검증판 → ④ home 허브 → ⑤ weather/charge 연계 → ⑥ traffic/academy. 순서는 우선순위 제안이며 데이터 승인이 늦으면 조정한다.

확장은 먼저 조회 인덱스·캐시를 개선하고, 부하가 확인되면 worker를 별도 서버로 분리한다. 이어 DB compute/스토리지, frontend replica, 공유 캐시·전용 검색엔진을 늘린다. 서비스별 장애가 허브 전체를 막지 않도록 timeout·부분 응답·기준시각 표시를 적용한다.

다음 단계 전에 필요한 사실 확인: 기존 호스팅/원본 서버 식별정보, DNS 읽기 전용 목록, 신규 클라우드/DB 계정과 예산, TourAPI 승인·키·호출한도. 키는 채팅에 붙이지 않고 신규 환경의 비밀 저장소로 입력한다.

**이 설계로 GuideJung 데이터 플랫폼 구축을 시작할까요?**
