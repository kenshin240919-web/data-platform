import {SITE as SITE_} from '../../lib/regions';
import {Faq,JsonLd,breadcrumbLd} from '@guidejung/ui/seo';
import type {Metadata} from 'next';
import {Connect,GENERIC,TRAFFIC_URL} from '@guidejung/ui/network';
import {AdSlot} from '@guidejung/ui/ads';
import {WeekendBoard} from '../_components/WeekendBoard';
import {label,sidos,SITE} from '../../lib/regions';
import {dayLabel,todayKST,weekendRow,type WeekendRow} from '../../lib/format';
import type {WeatherResponse} from '../../lib/types';

export const metadata:Metadata={title:'이번 주말 날씨 - 전국 맑은 곳 순위',description:'이번 주말 토요일·일요일 전국 날씨. 비 올 확률이 낮은 지역부터 보고 주말 나들이 갈 곳을 찾아보세요.',alternates:{canonical:SITE+'/weekend'}};
// 11/19: 빌드 때 시도 대표 지역 주말 예보를 받아 정적 HTML에 넣음(검색 입구인데 본문이 약 430자뿐이었음). 실패하면 전처럼 브라우저에서만.
async function buildRows(spots:WeekendRow['spot'][]){
  const today=todayKST();
  const rows=await Promise.all(spots.map(async s=>{try{const r=await fetch(`${SITE}/api/weather?code=${s.code}`,{signal:AbortSignal.timeout(20000)});
    return r.ok?weekendRow(s,await r.json() as WeatherResponse,today):null;}catch{return null;}}));
  return rows.filter((r):r is WeekendRow=>!!r).sort((a,b)=>a.rain-b.rain);
}
const pop=(r:WeekendRow)=>r.days.map(d=>`${dayLabel(d.date,todayKST()).sub} ${d.pm.sky||d.am.sky||''} ${d.min??'-'}~${d.max??'-'}° 강수 ${Math.max(d.am.pop??0,d.pm.pop??0)}%`).join(', ');
export default async function WeekendPage(){
  const spots=sidos.map(s=>({code:s.capital.code,label:label(s.capital),sido:s.short,trip:s.capital.trip}));
  const rows=await buildRows(spots);
  const kst=new Date(Date.now()+9*3600e3);const built=`${kst.getUTCMonth()+1}월 ${kst.getUTCDate()}일 ${kst.getUTCHours()}시`;
  const sunny=rows.filter(r=>r.rain<30),rainy=rows.filter(r=>r.rain>=60);
  const all=rows.flatMap(r=>r.days.map(d=>({r,d})));
  const cold=all.filter(x=>x.d.min!=null).sort((a,b)=>a.d.min!-b.d.min!)[0],warm=all.filter(x=>x.d.max!=null).sort((a,b)=>b.d.max!-a.d.max!)[0];
  const faq:[string,string][]=rows.length?[
    ['이번 주말 날씨 맑은 곳은 어디인가요?',sunny.length?`${built} 기준으로 ${sunny.map(r=>r.spot.sido).join('·')} 등 ${sunny.length}곳이 주말 비 올 확률 30% 밑이에요.`:`${built} 기준으로 비 올 확률이 30% 밑인 시도가 없어요. 가장 낮은 곳은 ${rows[0].spot.sido}(${rows[0].rain}%)예요.`],
    ['이번 주말 비 오는 곳은?',rainy.length?`${rainy.map(r=>`${r.spot.sido}(${r.rain}%)`).join('·')}은 주말 비 올 확률이 60% 이상이에요.`:`${built} 기준으로 주말 비 올 확률이 60% 넘는 시도는 없어요.`],
    ['이번 주말 가장 추운 곳·더운 곳은?',cold&&warm?`아침 최저는 ${cold.r.spot.sido} ${cold.d.min}°(${dayLabel(cold.d.date,todayKST()).sub}), 낮 최고는 ${warm.r.spot.sido} ${warm.d.max}°(${dayLabel(warm.d.date,todayKST()).sub})예요.`:''],
    ['주말 날씨는 언제 바뀌나요?','기상청 단기예보는 하루 8번(2·5·8·11·14·17·20·23시), 중기예보는 하루 2번(6·18시) 새로 나와요. 이 페이지는 열 때마다 최신 예보로 다시 계산해요.'],
  ]:[];
  return <section className="section"><div className="eyebrow">WEEKEND</div><h1>이번 주말 전국 날씨</h1><WeekendBoard spots={spots} initial={rows} built={built}/>
    {rows.length>0&&<div className="section wx-block"><h2>시도별 주말 예보 요약 <span className="muted small">{built} 기준</span></h2><ul className="small">{rows.map(r=><li key={r.spot.code}><b>{r.spot.sido}</b>({r.spot.label}): {pop(r)}</li>)}</ul></div>}
    <Faq title="이번 주말 날씨 자주 묻는 질문" items={faq}/>
    <Connect title="주말 나들이 준비" items={[GENERIC.trip,{icon:'🛣️',title:'주말 고속도로 정체',desc:'떠나기 전 막히는 구간·CCTV',href:TRAFFIC_URL},GENERIC.charge]}/><AdSlot/><JsonLd data={breadcrumbLd([['내근처 날씨',SITE_+'/'],['주말 날씨',SITE_+'/weekend']])}/></section>;
}
