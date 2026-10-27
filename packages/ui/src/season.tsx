'use client';
// 시기 띠: 정해진 기간에만 관련 사이트 맨 위(연결 바 아래)에 '내근처' 시기 페이지 안내를 한 줄 띄운다. 날짜는 브라우저에서 한국 시각으로 판단
// (정적 HTML에는 넣지 않음 — 지난 띠가 검색엔진에 남지 않게). ✕를 누르면 그 띠는 다시 보이지 않는다.
import {useEffect,useState} from 'react';

type Banner={id:string;from:string;to:string;sites:string[];text:string;href:string};
const NEAR='https://near.guidejung.com';
// 해마다 날짜와 문구만 바꾼다(주소는 그대로).
export const SEASON_BANNERS:Banner[]=[
  {id:'foliage-2026',from:'2026-10-27',to:'2026-11-12',sites:['trip','weather','traffic','parking','near'],text:'🍁 단풍 절정 — 내장산 11월 4일·한라산 11월 6일, 내 주변 단풍 명소',href:`${NEAR}/season/foliage`},
  {id:'suneung-2027',from:'2026-10-25',to:'2026-11-19',sites:['school','academy','weather','pharmacy','hospital','near'],text:'📝 11월 19일 수능날 — 당일 교통 안내·시험장 날씨·문 연 약국',href:`${NEAR}/season/suneung`},
  {id:'winter-car-2026',from:'2026-10-25',to:'2027-01-31',sites:['service','oil','charge','traffic','parking'],text:'❄️ 겨울 오기 전 차량 점검 — 배터리·타이어·냉각수, 내 주변 정비소',href:`${NEAR}/season/winter-car`},
  {id:'new-year-2027',from:'2026-12-15',to:'2027-01-01',sites:['trip','weather','traffic','near'],text:'🌅 새해 첫 해돋이 — 지역별 해 뜨는 시각·내 주변 명소',href:`${NEAR}/season/new-year`},
];
const OFF='gj.season.off';
export function SeasonBanner({site}:{site:string}){
  const [b,setB]=useState<Banner|null>(null);
  useEffect(()=>{const today=new Date(Date.now()+9*3600e3).toISOString().slice(0,10);let off:string[]=[];try{off=JSON.parse(localStorage.getItem(OFF)??'[]');}catch{}
    setB(SEASON_BANNERS.find(x=>x.sites.includes(site)&&x.from<=today&&today<=x.to&&!off.includes(x.id)&&!(site==='near'&&location.pathname.startsWith(new URL(x.href).pathname)))??null);},[site]);
  if(!b)return null;
  const close=()=>{try{const off=JSON.parse(localStorage.getItem(OFF)??'[]');localStorage.setItem(OFF,JSON.stringify([...off,b.id].slice(-20)));}catch{}setB(null);};
  return <div className="gj-season"><a href={b.href}>{b.text} →</a><button type="button" onClick={close} aria-label="닫기">✕</button></div>;
}
