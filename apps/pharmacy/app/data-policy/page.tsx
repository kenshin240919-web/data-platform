import type {Metadata} from 'next';
import {n,status,updated} from '../../lib/data';
export const metadata:Metadata={title:'데이터·출처 안내',description:'내근처 약국의 데이터 출처(국립중앙의료원 전국 약국 정보), 갱신 주기, 영업 여부 계산 방법을 안내합니다.',alternates:{canonical:'/data-policy'}};
export default function DataPolicy(){return <div className="page prose"><h1>데이터·출처 안내</h1>
  <h2>출처</h2><p>공공데이터포털의 <b>국립중앙의료원 전국 약국 정보 조회 서비스</b>를 매일 받아 정리합니다. 마지막 갱신: {updated()}, 약국 {n(status.count)}곳.</p>
  <h2>지금 영업 중 계산</h2><p>약국이 신고한 요일별(월~일·공휴일) 시작·끝 시각과 지금 한국 시각으로 계산합니다. 밤 12시를 넘겨 여는 시간(예: 25:00)은 다음 날 새벽까지로 봅니다. 공휴일에는 공휴일 운영 시간만 보고, 공휴일 시간이 없으면 휴무로 봅니다. 공휴일·대체공휴일은 정부 발표를 코드에 넣어 둡니다.</p>
  <h2>정확도</h2><p>명절·임시 휴무, 바뀐 운영 시간은 원본에 늦게 반영될 수 있습니다. <b>가기 전에 전화로 확인하세요.</b> 잘못된 정보는 관할 보건소에 정정을 요청하시면 다음 갱신 때 반영됩니다.</p></div>;}
