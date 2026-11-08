import type {Metadata} from 'next';
import {n,status} from '../../lib/data';
export const metadata:Metadata={title:'서비스 소개',description:'내근처 편의점은 약국이 닫은 밤에도 상비약을 살 수 있는 편의점을 등록된 곳만 가까운 순으로 찾아 주는 서비스입니다.',alternates:{canonical:'/about'}};
export default function About(){return <div className="page prose"><h1>내근처 편의점 소개</h1>
  <p>내근처 편의점은 “밤에 약국이 다 닫았는데 상비약 어디서 사지?”에 바로 답하는 서비스입니다. 안전상비의약품 판매자로 등록된 편의점·마트 {n(status.count)}곳을 가까운 순으로 보여 드리고, 지금 문 연 약국과 가장 가까운 응급실을 함께 알려 드립니다.</p>
  <ul><li>공공데이터 원문(이름·주소·전화·등록일)만 보여 드리고, 재고·가격은 지어내지 않습니다.</li><li>약을 추천하거나 복용법을 안내하지 않습니다.</li><li>편의점 본사·가맹점과 관계없는 비공식 안내입니다.</li></ul>
  <p>내근처 약국·병원·주차장·날씨 등 내근처 시리즈를 GuideJung이 함께 운영합니다.</p></div>;}
