// 가전·휴대폰 브랜드 서비스센터 안내(공공 데이터가 없어 목록 대신 공식 안내만). 각 값은 공식 누리집에서 확인한 것만 적음.
// 확인일 2026-10-23. 확인 못 한 내용(센터별 운영 시간 등)은 적지 않고 공식 '센터 찾기'로 보냄. 해마다·변경 공지 때 다시 확인할 것.
export type Phone={label:string;tel:string;note?:string};
/** near: 카카오 로컬 키워드 검색(실시간, 저장하지 않음)으로 '내 주변 센터'를 찾을 때의 검색어와 걸러 낼 카카오 분류명·이름 조건(10/23 강남·대전·제주 표본으로 확인). */
export type Near={query:string;category?:string;name?:string;exclude?:string};
export type Brand={slug:string;name:string;company:string;icon:string;products:string;phones:Phone[];hours?:string;notes:string[];links:[string,string][];checked:string;near?:Near};
export const BRANDS:Brand[]=[
  {slug:'samsung',near:{query:'삼성전자서비스',category:'삼성전자서비스'},name:'삼성전자서비스',company:'삼성전자서비스',icon:'📺',products:'TV·냉장고·세탁기·에어컨·휴대폰(갤럭시)·노트북 등 삼성전자 제품',
    phones:[{label:'대표전화',tel:'1588-3366',note:'통화요금 발신자 부담'}],
    notes:['방문 전 누리집이나 대표전화로 예약하면 기다리는 시간을 줄일 수 있어요.','센터마다 운영 시간이 달라요. 공식 누리집의 센터 찾기에서 가까운 센터 시간을 확인하세요.'],
    links:[['삼성전자서비스 누리집(센터 찾기·예약)','https://www.samsungsvc.co.kr/']],checked:'2026-10-23'},
  {slug:'lg',near:{query:'LG전자서비스',category:'LG전자서비스센터'},name:'LG전자 서비스',company:'LG전자',icon:'🧊',products:'TV·냉장고·세탁기·건조기·에어컨·청소기·공기청정기 등 LG전자 제품',
    phones:[{label:'고객센터(구매·서비스·구독)',tel:'1544-7777'}],hours:'전화상담 평일 09:00~18:00(주말·공휴일 휴무)',
    notes:['평일 저녁 출장 서비스(이브닝 서비스)를 사전 예약으로 운영해요 — 평일 18:00~20:30, 냉장고·세탁기·건조기·TV·청소기·공기청정기 대상(센터 상황에 따라 다를 수 있음).','센터 방문은 예약 없이도 가능하다고 안내돼 있지만, 센터마다 시간이 달라요.'],
    links:[['LG전자 고객지원(센터 찾기·출장 예약)','https://www.lge.co.kr/support']],checked:'2026-10-23'},
  {slug:'coway',name:'코웨이',company:'코웨이',icon:'💧',products:'정수기·공기청정기·비데·매트리스 등 코웨이 제품',
    phones:[{label:'콜센터',tel:'1588-5200'}],hours:'상담 평일 09:00~18:00(점심 12:00~13:00), 긴급 상담 365일 24시간',
    notes:['렌탈 제품의 방문 관리·점검 일정도 콜센터나 누리집에서 확인할 수 있어요.'],
    links:[['코웨이 누리집','https://www.coway.com/']],checked:'2026-10-23'},
  {slug:'cuckoo',near:{query:'쿠쿠 서비스센터',name:'쿠쿠서비스센터'},name:'쿠쿠',company:'쿠쿠홈시스·쿠쿠전자',icon:'🍚',products:'전기밥솥·정수기·공기청정기 등 쿠쿠 제품',
    phones:[{label:'구매 제품 A/S',tel:'1588-8899',note:'일반 구매 제품 A/S·서비스'},{label:'렌탈(구독) 고객 서비스',tel:'1577-0010',note:'렌탈 A/S·설치·점검·요금'}],
    hours:'상담 평일 09:00~18:00(점심 12:00~13:00), 토요일 09:00~13:00',
    notes:['렌탈(구독) 제품과 일반 구매 제품의 번호가 달라요.'],
    links:[['쿠쿠 누리집','https://www.cuckoo.co.kr/']],checked:'2026-10-23'},
  {slug:'skmagic',name:'SK매직',company:'SK매직',icon:'🚰',products:'정수기·공기청정기·식기세척기·가스레인지 등 SK매직 제품',
    phones:[{label:'통합고객센터',tel:'1600-1661'},{label:'구독·구매 문의',tel:'1600-6446'},{label:'배송 문의',tel:'1644-7272'}],
    notes:['누리집의 서비스센터 메뉴와 채팅 상담도 이용할 수 있어요.'],
    links:[['SK매직 누리집','https://www.skmagic.com/']],checked:'2026-10-23'},
  {slug:'winia',near:{query:'위니아 서비스센터',name:'서비스센',exclude:'애플'},name:'위니아·딤채 (큐에이드)',company:'큐에이드',icon:'🥬',products:'딤채 김치냉장고·위니아 에어컨·제습기 등',
    phones:[{label:'위니아 콜센터',tel:'1588-9588',note:'2026.09.30 이전 구입 제품'},{label:'위니아전자 콜센터',tel:'1588-1588',note:'2026.09.30 이전 구입 제품'},{label:'위니아딤채 콜센터',tel:'1668-5590',note:'2026.10.01 이후 구입 제품'},{label:'가전 세척 서비스',tel:'1800-9588'}],
    notes:['구입 시기(2026년 10월 1일 전후)와 제품에 따라 번호가 달라요. 영수증이나 제품 표시의 제조·구입 날짜를 먼저 확인하세요.','누리집에서 시·도를 골라 서비스센터·판매점을 찾을 수 있어요.'],
    links:[['큐에이드(위니아 서비스) 누리집','https://www.winiaaid.com/']],checked:'2026-10-23'},
  {slug:'apple',near:{query:'애플 공인 서비스',category:'Apple 공인서비스센터'},name:'Apple 공인 서비스',company:'Apple',icon:'🍎',products:'iPhone·iPad·Mac·Apple Watch·AirPods',
    phones:[],notes:['국가별 Apple 지원 전화번호는 Apple 지원 문의 페이지에서 확인할 수 있어요.','가까운 Apple 공인 서비스 제공업체는 Apple 위치 찾기에서 지역으로 찾을 수 있어요. 방문 전 예약을 권해요.'],
    links:[['Apple 지원 문의','https://support.apple.com/ko-kr/contact'],['Apple 공인 서비스 위치 찾기','https://locate.apple.com/kr/ko/']],checked:'2026-10-23'},
];
export const brand=(slug:string)=>BRANDS.find(b=>b.slug===slug);
