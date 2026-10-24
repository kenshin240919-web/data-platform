import type {Metadata} from 'next';
import {SITES,type Site} from '@guidejung/ui/network';
export const metadata:Metadata={title:'서비스 소개',description:'내근처는 위치 하나로 내 주변 날씨·약국·병원·주유소·주차장·충전기·여행 정보를 한 화면에 보여 주는 서비스입니다.',alternates:{canonical:'/about'}};
const LIST=(Object.keys(SITES) as Site[]).filter(k=>k!=='near'&&!SITES[k].hidden);
export default function About(){return <div className="page prose"><h1>내근처 소개</h1>
  <p>내근처는 ‘지금 내 주변’ 질문에 3초 안에 답하는 것을 목표로 합니다. 위치를 한 번 허용하면 날씨, 지금 문 연 약국, 진료 중인 병원, 가까운 최저가 주유소, 무료 공영 주차장, 충전 가능한 전기차 충전기, 가볼만한곳을 한 화면에 모아 보여 드립니다.</p>
  <p>각 정보는 아래 {LIST.length}개 내근처 사이트가 공공데이터로 만든 것이며, 카드를 누르면 해당 사이트의 자세한 화면으로 이동합니다.</p>
  <ul>{LIST.map(k=><li key={k}><a href={SITES[k].url}>{SITES[k].icon} {SITES[k].brand}</a> — {SITES[k].tagline}</li>)}</ul>
  <p>회원가입 없이 무료로 이용할 수 있고, 광고(Google AdSense)로 운영합니다.</p></div>;}
