import type {Metadata} from 'next';
import {items,n,status} from '../../lib/data';
export const metadata:Metadata={title:'서비스 소개',description:'내근처 혜택은 사는 시군구와 나이·상황으로 받을 수 있는 정부·지자체 지원금과 혜택을 찾아 주는 서비스입니다.',alternates:{canonical:'/about'}};
export default function About(){return <div className="page prose"><h1>내근처 혜택 소개</h1>
  <p>내근처 혜택은 “우리 동네 지원금, 놓친 거 없어?”에 답하는 서비스입니다. 행정안전부가 공개한 정부24 공공서비스(혜택) 정보 {n(items.length)}가지({status.updated_at.slice(0,10)} 기준)를 사는 시군구와 나이·상황별로 보여 드립니다.</p>
  <ul><li>원문(지원 대상·선정 기준·지원 내용·신청 방법·구비서류·문의처)을 그대로 보여 드리고, 금액이나 조건을 지어내지 않습니다.</li><li>‘나에게 맞는 혜택 찾기’는 정부24에 등록된 ‘받을 수 있는 사람’ 표시(나이·소득·상황)로 맞춘 것이라 실제 조건과 다를 수 있습니다.</li><li>이 사이트는 정부·지자체와 관계없는 민간 정보 서비스입니다. 신청은 정부24나 담당 기관에서 하세요.</li></ul>
  <p>내근처 서류·병원·약국·학교·학원·시장 등 내근처 사이트를 GuideJung이 함께 운영합니다.</p></div>;}
