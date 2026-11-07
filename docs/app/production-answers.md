# 내근처 앱 — 프로덕션 신청 답변 초안 (2026-11-06 작성, 11/17 무렵 신청)

비공개 테스트 14일(테스터 12명 이상)이 채워지면 Play Console 대시보드 → **프로덕션 신청**에서 묻는 질문의 답입니다.
질문 순서·문구는 화면의 '질문 미리보기'와 다를 수 있으니 맞는 칸에 옮겨 넣으세요.
**[ ] 칸은 실제로 있었던 일로 채우세요** — 받은 의견을 지어내면 심사에서 문제가 될 수 있습니다.
한국어로 써도 되지만, 심사자가 바로 읽도록 영어 칸을 함께 둡니다(둘 중 하나만 넣으면 됩니다).

---

## 1부. 비공개 테스트

### 테스터를 모으기 얼마나 쉬웠나요? (선택형)
→ 실제 느낌대로 고르세요(보통 '보통' 또는 '어려움'). 정답이 따로 있는 질문이 아닙니다.

### 테스트 중 테스터 참여는 어땠나요?
```
테스터 [12]명이 비공개 테스트에 참여해 [약국·병원·날씨·주유소] 화면을 주로 써 봤습니다.
앱은 시작 주소에 ?source=twa 를 붙여 Google Analytics에서 앱 방문을 따로 셉니다.
테스트 기간 앱 방문 [N]회, 테스터 대부분이 위치 권한을 허용하고 내 주변 결과를 확인했습니다.
알림(매일 아침 날씨·일요일 문 연 약국)도 [N]명이 켜서 실제로 받아 봤습니다.
```
```
[12] testers joined the closed test and mainly used the pharmacy, hospital, weather and gas-price screens.
The app opens with ?source=twa so app visits are counted separately in Google Analytics:
[N] app visits during the test. Most testers allowed location and checked nearby results,
and [N] testers turned on notifications (morning weather, pharmacies open on Sundays) and received them.
```

### 받은 의견 요약과 모은 방법
```
의견은 [카카오톡 단톡방/개별 메시지]와 Play 비공개 테스트 의견 기능으로 받았습니다.
주요 의견:
- [예: 앱을 처음 열었을 때 '내 위치' 버튼을 따로 눌러야 해서 불편했다]
- [예: 맨 위 사이트 연결 줄이 휴대폰에서 너무 길어 화면을 많이 차지했다]
- [실제로 받은 의견 1~3개를 그대로]
```
```
Feedback was collected through [KakaoTalk group chat / direct messages] and Play's closed-testing feedback.
Main points:
- [e.g. On first launch you had to tap a separate "my location" button]
- [e.g. The top bar linking the 16 services took too much space on phones]
- [1–3 real comments]
```

---

## 2부. 앱 소개

### 앱의 대상 사용자는 누구인가요?
```
한국에 사는 성인 누구나 — 지금 문 연 약국·진료 중인 병원을 급히 찾는 보호자, 주유·주차·충전을 하는 운전자,
우리 동네 지원금과 생활 정보를 찾는 주민. 어린이 대상 앱이 아닙니다.
```
```
Adults living in Korea: parents looking for a pharmacy or clinic open right now, drivers looking for
cheap fuel, parking or EV chargers, and residents looking for local benefits and everyday information.
Not designed for children.
```

### 앱이 사용자에게 주는 가치
```
위치 한 번으로 16가지 생활 정보를 한 화면에 모아 보여 줍니다. 모두 공공기관 공개 데이터
(국립중앙의료원 약국·병의원 운영 시간, 기상청, 오피넷, 행정안전부·정부24 등)를 매일 새로 받아,
'지금 영업 중'처럼 바로 쓸 수 있는 형태로 계산합니다. 정확한 위치는 휴대폰 밖으로 보내지 않고
서버에는 약 2km 범위의 대략 위치만 씁니다. 회원가입 없이 쓰고, 알림은 원하는 주제만 받습니다.
```
```
With one location tap, the app shows 16 kinds of local information on one screen. Everything comes from
official open data (National Medical Center opening hours for pharmacies and clinics, Korea Meteorological
Administration, Opinet fuel prices, Ministry of the Interior / Gov24 benefits, etc.), refreshed daily and turned into
answers you can act on, such as "open now". The exact location never leaves the phone; servers only see
an approximate ~2 km area. No sign-up is needed, and notifications are opt-in by topic.
```

### 첫해 예상 설치 수 (선택형)
→ 처음이라 작게 고르는 편이 무난합니다(예: '1만 미만' 또는 '1천~1만'). 크게 고른다고 유리하지 않습니다.

---

## 3부. 출시 준비

### 테스트에서 배운 것으로 무엇을 바꿨나요?
(아래 네 가지는 테스트를 시작한 11/2 이후 실제로 고친 것입니다. 받은 의견과 이어지는 것을 앞에 두세요.)
```
- 앱을 처음 열 때 위치 권한을 한 번 바로 묻도록 바꿨습니다(전에는 화면의 버튼을 눌러야 했음).
  두 번 거절하면 다시 묻지 않도록 한 번만 묻습니다.
- Play 앱 서명 키 지문을 모든 사이트의 Digital Asset Links에 넣어, Play에서 받은 앱에서도
  주소창 없이 전체 화면으로 열리게 고쳤습니다.
- 휴대폰에서 맨 위 서비스 연결 줄이 화면을 많이 차지하던 것을 두 줄로 줄이고 헤더 높이를 낮췄습니다.
- 앱 안에서는 웹용 '홈 화면에 추가' 안내가 뜨지 않게 하고, 알림 아이콘을 안드로이드 규격(흰 모양)으로 바꿨습니다.
```
```
- The app now asks for location permission once on first launch (previously users had to tap a button).
- Added the Play app-signing key fingerprints to Digital Asset Links on every site, so the app installed
  from Play opens full-screen without a browser address bar.
- Made the top service bar and header much shorter on phones so content appears sooner.
- Hid the web "Add to home screen" prompt inside the app and switched to an Android-style monochrome notification icon.
```

### 출시 준비가 됐다고 판단한 근거
```
14일 이상 테스터 [12]명이 실제 휴대폰에서 써 보는 동안 앱이 멈추거나 빈 화면이 나온 보고가 [없었고],
Android vitals에도 비정상 종료·ANR이 [없었습니다]. 앱은 웹 서비스를 감싼 TWA라 내용 수정은
서버에서 바로 반영되고, 데이터는 매일 자동 수집·점검합니다. 개인정보처리방침·데이터 보안 양식·
콘텐츠 등급도 마쳤습니다.
```
```
For 14+ days, [12] testers used the app on real phones with [no] reports of crashes or blank screens,
and Android vitals showed [no] crashes or ANRs. The app is a TWA over our web service, so content fixes
ship from the server immediately, and the data is collected and checked automatically every day.
The privacy policy, Data safety form and content rating are complete.
```

---

## 신청 전 확인
- [ ] 대시보드에 '14일 이상 … 테스터 12명' 줄이 체크됐는지(11/17 무렵)
- [ ] Play Console → 품질 → Android vitals에서 비정상 종료·ANR 숫자 확인 → 위 [없었습니다] 칸
- [ ] GA(near 속성)에서 `source=twa` 방문 수 확인 → 위 [N] 칸 (원하시면 Claude가 GA에서 뽑아 드림)
- [ ] 받은 의견 1~3개 채우기
- 신청 뒤 심사는 보통 며칠 걸리고, 거절되면 테스트를 더 하라는 안내가 옵니다.
