# 내근처 일자리 데이터 표본 2026-11-02 22:18 KST

## 유료직업소개소(15155093)

`apis.data.go.kr/1741000/paid_job_centers/info`

- 매개변수 {'returnType': 'json'} → 전체 60,300줄, 받은 줄 8,100
- 항목: BPLC_NM, CLSBIZ_YMD, CORP_SE_NM, CRD_INFO_X, CRD_INFO_Y, DAT_UPDT_PNT, DAT_UPDT_SE, DTL_SALS_STTS_CD, DTL_SALS_STTS_NM, LAST_MDFCN_PNT, LCPMT_YMD, LCTN_ZIP, LOTNO_ADDR, MNG_NO, OPN_ATMY_GRP_CD, ROAD_NM_ADDR, ROAD_NM_ZIP, SALS_STTS_CD, SALS_STTS_NM, SE_NM, TELNO
- 영업상태(SALS_STTS_CD): 01 5,626, 03 2,079, 05 383, 04 12
- 영업 중으로 본 줄 8,100 · 좌표 있음 7,882/8,100 (['CRD_INFO_X']/['CRD_INFO_Y'])
- 시도(영업 중): 경기도 1,839, 서울특별시 1,174, 전남광주통합특별시 810, 경상남도 652, 충청남도 532, 경상북도 462, 부산광역시 398, 전북특별자치도 393, 대구광역시 381, 인천광역시 360, 충청북도 350, 대전광역시 224, 강원특별자치도 219, 울산광역시 163, 제주특별자치도 96, 세종특별자치시 37, (빈칸) 8, 광주광역시 2
- 이름에 든 낱말(영업 중): 인력 3,486, 간병 617, 파출 172, 건설 78, 용역 62, 도우미 42, 산후 40, 서치 22, 가사 19, 외국인 17, 요양 11, 청소 6, 베이비 5, 경비 5, 해외 3, 헤드헌 3, 식당 1, 선원 1, 유흥 1
- CORP_SE_NM: 개인 6,814, 법인 1,281, (빈칸) 5
- SE_NM: 유료 8,095, (빈칸) 5

## 무료직업소개소(15155099)

`apis.data.go.kr/1741000/free_job_centers/info`

- 매개변수 {'returnType': 'json'} → 전체 2,910줄, 받은 줄 2,910
- 항목: BPLC_NM, CLSBIZ_YMD, CORP_SE_NM, CRD_INFO_X, CRD_INFO_Y, DAT_UPDT_PNT, DAT_UPDT_SE, DTL_SALS_STTS_CD, DTL_SALS_STTS_NM, LAST_MDFCN_PNT, LCPMT_YMD, LCTN_ZIP, LOTNO_ADDR, MNG_NO, OPN_ATMY_GRP_CD, ROAD_NM_ADDR, ROAD_NM_ZIP, SALS_STTS_CD, SALS_STTS_NM, SE_NM, TELNO
- 영업상태(SALS_STTS_CD): 03 1,333, 01 1,307, 05 257, 04 13
- 영업 중으로 본 줄 2,910 · 좌표 있음 2,616/2,910 (['CRD_INFO_X']/['CRD_INFO_Y'])
- 시도(영업 중): 서울특별시 713, 경기도 441, 전남광주통합특별시 215, (빈칸) 198, 부산광역시 176, 경상북도 147, 대구광역시 132, 전북특별자치도 122, 경상남도 119, 충청남도 113, 강원특별자치도 110, 충청북도 106, 인천광역시 106, 대전광역시 77, 울산광역시 57, 제주특별자치도 39, 세종특별자치시 14, 광주광역시 10
- 이름에 든 낱말(영업 중): 인력 141, 건설 43, 청소 18, 외국인 5, 간병 5, 경비 4, 요양 4, 선원 2, 해외 1, 도우미 1, 모델 1
- CORP_SE_NM: 법인 2,706, 개인 177, (빈칸) 27
- SE_NM: 무료 2,910

## 새일센터 직업교육훈련(15078161)

`apis.data.go.kr/1383000/nwis/newWorkEducationService/getNewWorkEducationList`

- {'type': 'json'}: 줄 없음 — "{'OpenAPI_ServiceResponse': {'cmmMsgHeader': {'errMsg': 'HTTP_ERROR', 'returnAuthMsg': 'HTTP 에러', 'returnReasonCode': '04'}}}"
- {'returnType': 'json'}: 줄 없음 — "{'OpenAPI_ServiceResponse': {'cmmMsgHeader': {'errMsg': 'HTTP_ERROR', 'returnAuthMsg': 'HTTP 에러', 'returnReasonCode': '04'}}}"
- {'resultType': 'json'}: 줄 없음 — "{'OpenAPI_ServiceResponse': {'cmmMsgHeader': {'errMsg': 'HTTP_ERROR', 'returnAuthMsg': 'HTTP 에러', 'returnReasonCode': '04'}}}"
- {}: 줄 없음 — '<?xml version="1.0" encoding="UTF-8"?>\n<OpenAPI_ServiceResponse>\n<cmmMsgHeader>\n  <errMsg>HTTP_ERROR</errMsg>\n  <returnAuthMsg>HTTP 에러</returnAuthMsg>\n  <returnReasonCode>04</returnReasonCode>\n</cmmMsgHeader>\n</OpenAPI_ServiceResponse>\n'

## e새일 직업교육훈련일정(15106174)

`apis.data.go.kr/1383000/nwis/workTrainningEducationScheduleService/getWorkTrainningEducationScheduleList`

- 매개변수 {'type': 'json'} → 전체 328,814줄, 받은 줄 60,100
- 항목: lectNm, eduYmd, crEduBgngHr, crEduEndHr, dataCrtrYmd
- lectNm: 예 ['13:30', '13:30', '13:30']
- eduYmd: 예 ['19000101', '19000102', '19000103']
- crEduBgngHr: 예 ['꿈날개', '장경숙', '장경숙']
- crEduEndHr: 예 ['09:30', '09:30', '09:30']
- dataCrtrYmd: 예 ['20220829', '20220829', '20220829']

## 노인 자립형일자리 수행기관(15056961)

`apis.data.go.kr/B552474/JobBsnInfoService/getJobOperInsttList`

- {'type': 'json'}: 줄 없음 — '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header><body><items><item><dtlAddr>317-25</dtlAddr><faxNum>******</faxNum><orgCd>0000002</orgCd><orgName>성가정노인종합복지관</orgName><orgTypeNm>수행기관</orgTypeNm><telNum>'
- {'returnType': 'json'}: 줄 없음 — '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header><body><items><item><dtlAddr>317-25</dtlAddr><faxNum>******</faxNum><orgCd>0000002</orgCd><orgName>성가정노인종합복지관</orgName><orgTypeNm>수행기관</orgTypeNm><telNum>'
- 매개변수 {'_type': 'json'} → 전체 1,482줄, 받은 줄 582
- 항목: dtlAddr, faxNum, orgCd, orgName, orgTypeNm, telNum, zipAddr, zipCode
- 첫 줄 예(주소 등): {"dtlAddr": "317-25", "faxNum": "******", "orgCd": "0000002", "orgName": "성가정노인종합복지관", "orgTypeNm": "수행기관", "telNum": "******", "zipAddr": "서울특별시 강동구고덕동 ", "zipCode": 134878}
- orgTypeNm: 수행기관 582

## 고용복지플러스센터 현황(파일) 15066368

- 133줄 · 항목: 연번, 청(지청), 센터명, 관할구역, 소재지, 대표전화
- 청(지청): 의정부 6, 성남 6, 대구청 5, 광주청 5, 대전청 5, 안양 4, 창원 4, 진주 4, 목포 4, 천안 4, 보령 4, 경기청 3, 평택 3, 인천북부 3, 강원 3, 강릉 3, 양산 3, 통영 3, 대구서부 3, 영주 3
- 관할구역이 여러 곳인 센터 61 · 예: ['서울특별시 중구ㆍ종로구ㆍ동대문구', '서울특별시 서초구', '서울특별시 강남구', '서울특별시 송파구ㆍ강동구']

## 여성새로일하기센터 현황(파일) 3034802

- 159줄 · 항목: 연번, 시도, 기초, 센터명, 리플릿 번호, 주소
- 시도: 경기 29, 서울 25, 부산 11, 충남 11, 강원 10, 인천 9, 전북 9, 전남 9, 경북 9, 경남 9, 충북 6, 대구 5, 광주 5, 울산 5, 대전 3, 제주 3, 세종 1

API·파일 호출 185회
