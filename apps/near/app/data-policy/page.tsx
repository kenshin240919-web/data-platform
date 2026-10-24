import type {Metadata} from 'next';
export const metadata:Metadata={title:'데이터·출처 안내',description:'내근처 첫 화면과 상황별 페이지에 보이는 정보의 출처와 갱신 주기 안내입니다.',alternates:{canonical:'/data-policy'}};
const ROWS:[string,string,string][]=[['날씨·미세먼지','기상청 단기·중기예보, 에어코리아','발표 시각마다'],['약국·병원 진료 여부','국립중앙의료원 약국·병의원 정보(신고된 운영 시간으로 지금 시각 기준 계산)','매일'],['응급실 남은 병상','국립중앙의료원 응급의료 정보','몇 분 단위'],['주유소 가격','한국석유공사 오피넷','매일'],['공영 주차장','전국주차장정보표준데이터(공공데이터포털)','매일 확인(원천은 지자체별)'],['전기차 충전기','한국환경공단 충전기 정보·상태','5분 단위'],['가볼만한곳·행사','한국관광공사 TourAPI','6시간마다'],['정비소·검사소','전국자동차정비업체·자동차검사소 표준데이터, 지방행정 인허가데이터','매일']];
export default function DataPolicy(){return <div className="page prose"><h1>데이터·출처 안내</h1>
  <p>내근처는 자체 데이터를 만들지 않고, 각 내근처 사이트가 공공데이터로 만든 정보를 그대로 불러와 보여 줍니다.</p>
  <table className="nr-table"><thead><tr><th>정보</th><th>출처</th><th>갱신</th></tr></thead><tbody>{ROWS.map(r=><tr key={r[0]}>{r.map(c=><td key={c}>{c}</td>)}</tr>)}</tbody></table>
  <p>운영 시간·가격·병상 수는 기관이 등록하거나 신고한 값이라 실제와 다를 수 있어요. 중요한 일정은 가기 전에 전화나 공식 안내로 확인하세요. 상황별 페이지의 행동 요령은 119·한국도로공사 등 공식 기관 안내를 바탕으로 썼어요.</p></div>;}
