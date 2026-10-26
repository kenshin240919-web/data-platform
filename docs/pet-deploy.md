# pet.guidejung.com (내근처 동물병원) 배포 안내

- 앱: `apps/pet` (Next 정적 `out` + Worker `guidejung-pet`, `apps/pet/worker/index.ts`). D1·KV·Secret 없음.
- 데이터: `scripts/collect-pet.py` → `apps/pet/data/places.json` (Actions `pet-collect.yml`, 매일 05:17 KST — 약국 수집 04:27 뒤).
  - LOCALDATA 파일 `animal_hospitals`·`animal_pharmacies`·`animal_boarding`·`animal_exhibition`·`animal_transport` (활용신청 불필요).
  - 동물약국 영업 시간: `apps/pharmacy/data/pharmacies.json`과 이름+도로명(없으면 150m 안 같은 이름)으로 맞춤.
  - '지금 상태' 계산은 `apps/pharmacy/lib/fmt.ts` `statusOf`를 그대로 씀 → 공휴일 표 `HOLIDAYS`는 약국 쪽 하나만 고치면 됨.
- 배포: Actions `pet-deploy.yml` (push: apps/pet·apps/pharmacy/lib/fmt.ts·packages 등, 매일 수집 뒤, 수동). 도메인은 wrangler `routes` custom_domain.
- 로컬 시험: `npx wrangler deploy --dry-run -c apps/pet/wrangler.jsonc --outdir runtime/tmp/pet-bundle`(→ apps/pet/runtime/tmp/pet-bundle) + `node runtime/tmp/pet-harness.mjs`(포트 8790).
- 2단계(10/26 활용신청 승인 확인): 농림축산검역본부 구조동물(`1543061/abandonmentPublicService_v2`)·동물보호센터(`animalShelterSrvc_v2/shelterInfo_v2`)·분실동물(`lossInfoService/lossInfo`) — 표본 `scripts/pet-sample.py`.
