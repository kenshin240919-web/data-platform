# GuideJung Data Platform

`trip.guidejung.com` 여행 검색 서비스. 기존 **guidejung.com의 파일·DB·WordPress·서버·DNS를 수정하지 않습니다.**

## 로컬 실행 (Windows)

Node.js 24, Python 3.11 이상을 준비합니다.

```powershell
npm ci
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r services/api/requirements.lock.txt
Copy-Item .env.example .env
npm run dev
```

이후 `run.bat`으로 실행할 수 있습니다. trip: http://localhost:3101, API: http://127.0.0.1:8100/docs.

샘플 모드는 SQLite를 사용하며 행사·조건은 **개발 예시**입니다. 모든 샘플 상세는 noindex, sitemap은 빈 목록입니다. 실제 정보가 없는 운영 모드에는 샘플이 자동으로 노출되지 않습니다.

## 구현 기능

- 서비스 허브, 장소/축제 검색, 지역·무료·아이·반려동물·실내·오늘·주말 필터
- 장소/행사 상세, 지도 이동, 주변 직선거리 검색, 페이지네이션
- 출처·내용 확인일·미확인 표시, 서비스별 canonical/robots/sitemap
- 관리자 인증 및 수집 진행률·오류·검증 목록 (`/admin`)
- RAW→정규화→지역검증→중복검사→품질→버전별 DB→페이지/색인
- 실패한 입력은 이전 공개 버전을 유지, 조건은 근거를 갖춘 true/false/unknown
- FastAPI, Next.js 2개 앱, 공통 UI, PostgreSQL core/trip/ingest/ops schema

traffic/academy/charge/weather는 준비 중 카드입니다. 실시간 수집기와 화면은 데이터 승인 후 별도 확장 대상입니다.

## 현재 검증 범위

사용자 요청으로 현재 공개 데이터는 **200건**입니다. 관광지 51·문화시설 49·레포츠 50·축제 50건이며, 187건에 공공누리 1/3유형 사진이 있습니다. 2026-10-07 공식 원천 내용 대조와 사용자 위임 검수 승인을 완료했습니다. 이 검수는 Codex(AI)가 원천 API·운영기관 홈페이지와 대조해 수행한 것으로(검수자 `Codex · 사용자 위임 검수`), 사람의 직접 확인은 `/admin` 검수로 별도 기록합니다. 운영기관 홈페이지 일부를 추가 확인했고, 미제공 정보와 원천 불일치는 확인 필요로 표시합니다. 현장 확인·행정구역 공간 경계 확인은 별도이며 SEO는 비활성입니다. [200건 검수 보고서](reports/200건-내용검수-2026-10-07.md)

- `collect-trip.bat`: 최대 200건 수집 및 사진/시설 보강. 완료 후 다시 실행해도 검수 결과를 덮어쓰지 않습니다.
- `/admin`: `.env`의 ADMIN_TOKEN으로 현황·검수 목록 조회. 내용을 확인한 뒤 검수자·근거·조건·공간 경계 확인을 별도 기록하여 승인/반려합니다. 반려 항목은 공개 검색/상세에서 제외합니다.
- 관리자 “변경 확인 시작” 또는 `python -m services.api.app.sync_trip`: 현재 대상 ID만 변경 동기화합니다. 새 장소를 추가하지 않습니다. 실제 변경은 재검수 대기로 되돌리고, `showflag=0`인 원천 비공개 항목은 공개에서 제외하되 이력을 보존합니다.
- 변경 조회 성공 후에만 watermark를 저장하며 하루 겹침 조회로 경계 누락을 줄입니다. 검증 실패 시 이전 공개 버전을 유지합니다. 정기 동기화 기준은 **매월 1일 오전 6시(KST), 월 1회**입니다. 서버용 systemd 설정 파일은 deploy에 준비했으며 실제 자동 실행 등록은 배포 때 적용합니다.

사진은 HTTPS 한국관광공사 원본 URL과 개별 권리코드를 확인한 경우만 표시하며, 3유형은 원본을 자르거나 변형하지 않습니다. 권리정보가 없는 사진은 표시하지 않습니다.

## 공식 데이터 연결

키를 GitHub나 채팅에 넣지 말고 신규 환경의 `.env`에 입력합니다. 원천 요청 URL과 인증키를 로그에 남기지 않습니다.

1. DATA_MODE=live 설정. 실제 운영은 **별도 신규 PostgreSQL** DB를 사용합니다.
2. 행정표준코드의 법정동 원장 CSV/TSV(CP949 또는 UTF-8)를 확보합니다.
3. API 키와 ADMIN_TOKEN(운영은 32자 이상)을 설정합니다.
4. 아래 명령을 `services/api`에서 실행합니다.

```powershell
..\..\.venv\Scripts\python.exe -m app.db
..\..\.venv\Scripts\python.exe -m app.worker regions "공식법정동원장.csv"
..\..\.venv\Scripts\python.exe -m app.worker collect --limit 20
..\..\.venv\Scripts\python.exe -m app.worker import "..\..\runtime\tourapi-sample.json"
```

collect는 페이지당 최대 50건이며 `--pages`로 페이지 수를 지정합니다. `--festivals`는 축제를 조회하고 `--resume`은 동일 조건의 체크포인트를 이어받습니다. 계정 일일 한도와 local 호출 ledger를 사용합니다. 증분 삭제 동기화와 별도 환경의 동시 worker용 공통 호출 예산 저장소는 추가 구현 대상입니다.

로컬 PostgreSQL은 `scripts/local-postgres.py setup`으로 시작합니다. 데이터는 OneDrive 밖의 영문 경로 `%LOCALAPPDATA%\guidejung-data-postgres`에 두며(`GUIDEJUNG_PG_HOME`으로 변경 가능), 예전 임시 폴더(ESTsoft CreatorTemp)에 있던 DB는 첫 실행 때 자동으로 옮깁니다. 전용 포트는 55432이고 자격증명은 Git에서 제외되는 `.env.postgres-local`에 저장됩니다. `verify-backup`은 별도 임시 DB에 백업을 복원해 주요 테이블의 건수를 확인합니다. 실제 운영 서버 설치와 도메인 연결은 사용자가 최종 확인한 후 수행합니다.

자동 구조검증만으로 SEO를 허용하지 않습니다. 검수한 JSON에 `verified_at`(YYYY-MM-DD), `boundary_verified: true`, `reviewer`를 기록하고 소개/주소/요금/운영시간을 확인한 뒤 가져옵니다. 30일 이내 검수·품질 임계값을 통과한 레코드만 indexable이 됩니다. 조건은 `condition_evidence`에 value·source·verified_at을 포함해야 합니다.

DB migration 기준은 `services/api/app/models.py`입니다. `python -m app.db`는 신규 v1 schema 생성용이며 기존 DB 변경/파괴를 수행하지 않습니다. 배포 후 schema 변경은 버전별 migration으로 추가해야 합니다. PostgreSQL PostGIS 인덱스 보조 SQL은 `deploy/postgis.sql`입니다. 현재 API 주변 검색은 정확한 Haversine 직선거리를 사용하며 대규모 운영 전에 공간 인덱스 조회로 전환해야 합니다.

## 검증

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s services/api/tests
npm run check
npm run test:ui
```

브라우저 검증은 로컬 서버가 실행된 상태에서 수행합니다. 아래 배포 안내를 따라 GitHub에 올릴 수 있습니다.

[배포 안내](docs/DEPLOY.md) · [설계 보고서](reports/GuideJung-설계보고서-2026-10-06.md)
