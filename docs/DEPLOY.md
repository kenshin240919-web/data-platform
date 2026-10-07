# GitHub 업로드 및 신규 서버 배포

> 현재 웹사이트는 Cloudflare Workers 정적 사이트로 배포합니다(README "웹사이트 배포"). 아래 서버 절차는 API를 별도 서버로 운영할 때만 해당하며, 웹 화면 컨테이너(Dockerfile.web·Caddy)는 제거했습니다.

## GitHub 업로드

사용자가 저장소를 생성하고 업로드합니다. 이 프로젝트는 원격 저장소를 만들거나 push하지 않았습니다.

```powershell
git init
git add .
git commit -m "Build GuideJung trip platform"
git branch -M main
git remote add origin <새로운-GitHub-저장소-URL>
git push -u origin main
```

업로드 전 `git status --short`로 `.env`, runtime, node_modules, .venv가 제외되는지 확인하세요. API 키·관리자 토큰·DB 비밀번호를 코드에 넣지 않습니다. `.github/workflows/verify.yml`은 타입/빌드/API 테스트만 수행하며 배포하지 않습니다.

## 신규 전용 서버

기존 사이트와 다른 서버·DB·환경·계정을 준비합니다. 신규 Linux 서버에 Docker Compose를 설치하고 저장소를 clone합니다. 포트 80/443을 기존 서버에서 넘겨받지 않습니다.

1. `.env.example`을 신규 `.env`로 복사합니다.
2. APP_ENV=production, DATA_MODE=live, DATABASE_URL=postgresql://신규주소, 강한 ADMIN_TOKEN, TOURAPI_SERVICE_KEY, 신규 TRIP_PUBLIC_URL을 입력합니다. SEO_ENABLED=false로 시작합니다.
3. `docker compose build` 후 `docker compose run --rm api python -m app.db`로 **신규 DB만** 초기화합니다. DB 접속 주소가 기존 사이트와 다른지 직접 확인합니다.
4. 공식 지역 원장·소규모 데이터를 먼저 가져옵니다. CLI 입력 파일은 컨테이너에 read-only volume으로 전달하세요. 컨테이너 경로의 DB/RAW를 git에 넣지 않습니다.
5. `docker compose up -d` 후 health·검색·상세·샘플 미노출·관리자 인증을 확인합니다.
6. DNS 관리 화면의 기존 전체 레코드를 확인합니다. `trip` 이름이 비어 있을 때 **추가만** 합니다. 이미 있는 값은 바꾸지 않습니다.

기본 Caddy 구성은 신규 여행 호스트 HTTPS를 직접 처리합니다. CloudFront를 앞에 두는 경우 신규 distribution과 신규 원본 인증서/호스트를 별도로 만들고 Caddy Host 라우팅·TLS를 확인해야 합니다. 기존 CloudFront/Cloudflare 설정을 복사해 수정하지 않습니다. 이 저장소는 CDN·DNS를 자동 생성하지 않습니다.

## 공개 전 남은 확인

- 실제 PostgreSQL/Supabase 접속·권한·PostGIS·복구 테스트
- TourAPI 키·한도·법정동 코드 필드의 실제 표본 확인
- 주소/좌표 경계 정합성과 조건별 근거 검수
- 공식 API delta/삭제 대조 및 전국 데이터 규모에 맞는 쿼리 최적화
- 운영 담당자·접속로그 보관정책·Analytics/AdSense 사용 여부 고지
- 각 신규 호스트 Search Console URL-prefix property 신규 등록

SEO_ENABLED=true는 검수 데이터가 충분하고 공개 의도를 확인한 뒤 활성화합니다. 샘플/검색/미확인 상세는 계속 noindex입니다. 기존 guidejung.com의 Search Console·sitemap·Analytics·AdSense는 그대로 둡니다.

## 백업 / 업데이트

정기 관광정보 동기화는 매월 1일 오전 6시(KST), 월 1회입니다. `deploy/guidejung-trip-sync.service`와 `.timer`를 신규 서버에 등록합니다. 서비스의 `/srv/guidejung-data` 및 `/usr/bin/docker` 경로는 실제 배포 위치와 일치시켜야 합니다. Docker API 컨테이너가 실행 중이어야 하며 runtime volume은 호출 예산·watermark·오류 이력을 보존합니다. 타이머는 미실행분을 서버 재시작 후 한 번 실행합니다. 설치 후 `systemd-analyze calendar '*-*-01 06:00:00 Asia/Seoul'`로 시간을 확인하고 활성화합니다. 현재 로컬 PC에는 예약 작업을 등록하지 않았습니다.

월간 동기화 실패는 관리자 현황에서 확인하고 수동 재실행합니다. 전체 변경 목록이 처리 한도보다 커지거나 호출 예산에 도달하면 이전 공개 버전을 유지하므로, 운영 전에 월간 변경량으로 시험해야 합니다. 항목별 검수 유지·초기화는 별도 개선 대상이며 현재 구현은 변경된 콘텐츠 전체의 검수를 초기화합니다.

Supabase 일일 백업 외에 암호화 pg_dump를 신규 private 객체 저장소에 일별 30일·월별 3개월 보관하고 정기 복구합니다. `.env`는 별도 비밀 저장소에서 관리합니다. 앱 업데이트는 새 이미지 빌드→상태 확인→교체하며 이전 이미지와 공개 dataset ID를 보관합니다. 백업·CDN purge·대규모 수집 스케줄은 실제 운영계정 준비 후 적용합니다.
