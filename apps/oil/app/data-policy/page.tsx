import type {Metadata} from 'next';
import {n,status,updated} from '../../lib/data';
export const metadata:Metadata={title:'데이터·출처 안내',description:'내근처 주유소의 데이터 출처(한국석유공사 오피넷), 갱신 주기, 표시 범위를 안내합니다.',alternates:{canonical:'/data-policy'}};
export default function DataPolicy(){return <div className="page prose"><h1>데이터·출처 안내</h1>
  <h2>출처</h2><p><b>한국석유공사 오피넷</b> 무료 API로 전국·시도·시군구 평균 가격, 시군구별 휘발유 최저가 주유소 20곳, 시도별 경유 최저가 20곳을 받습니다. 마지막 갱신: {updated()}, 주유소 {n(status.stations)}곳.</p>
  <h2>갱신 주기·범위</h2><p>하루 한 번(아침) 받습니다. 그래서 낮에 바뀐 가격은 다음 날 반영됩니다. 최저가 목록에 들어간 주유소만 보여 드리므로, 모든 주유소가 나오지는 않습니다. 셀프 여부는 주유소 이름으로 판단합니다.</p>
  <h2>정확도</h2><p>가격은 주유소가 오피넷에 보고한 값입니다. <b>주유 전 현장 가격을 확인하세요.</b></p></div>;}
