// GS25 매장 서비스 페이지 목록(붕어빵·반값택배·현금 출금·마감할인) — 서로 연결 카드·첫 화면 바로가기에 씀.
// 서비스 이름은 GS25 앱 매장 정보의 propertyNames(11/11 공개 중계로 확인: 반값택배접수·반값택배픽업·국내택배접수·현금출금·현금 입/출금·스마트ATM·마감할인·붕어빵·군고구마).
export const GS_PAGES=[
  {path:'/bungeoppang',icon:'🐟',label:'붕어빵·군고구마',desc:'붕어빵·군고구마 파는 GS25'},
  {path:'/half-delivery',icon:'📦',label:'반값택배',desc:'반값택배 보내기·받기 되는 GS25'},
  {path:'/atm',icon:'🏧',label:'현금 출금',desc:'현금 출금·입금 되는 GS25'},
  {path:'/closing-sale',icon:'🏷️',label:'마감할인',desc:'마감할인 하는 GS25'},
] as const;
