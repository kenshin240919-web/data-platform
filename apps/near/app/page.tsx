import Link from 'next/link';
import {AREAS,SITES,type Site} from '@guidejung/ui/network';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,JsonLd} from '@guidejung/ui/seo';
import {Dashboard} from './_components/Dashboard';
import {SITUATIONS} from '../lib/situations';
import {SITE} from '../lib/site';

// 사이트마다 한 줄 소개(정적 HTML에 남는 내용 — 검색·AI 답변용).
const ABOUT:Partial<Record<Site,string>>={trip:'한국관광공사 공식 데이터로 내 주변 가볼만한곳·축제·맛집·숙소를 가까운 순으로',weather:'기상청·에어코리아 데이터로 지금 날씨·48시간·10일 예보·미세먼지',traffic:'한국도로공사 실시간 고속도로 정체·CCTV·휴게소 기름값',charge:'한국환경공단 데이터로 지금 충전 가능한 전기차 급속·완속 충전기',academy:'교육청 공개 수강료로 우리 동네 학원과 학원비',school:'나이스 데이터로 우리 학교 오늘 급식·학사일정·시간표',pharmacy:'국립중앙의료원 데이터로 지금 문 연 약국·심야·일요일·공휴일 약국',hospital:'국립중앙의료원 데이터로 지금 진료 중인 병원·응급실 남은 병상',oil:'오피넷 데이터로 내 주변 휘발유·경유 최저가 주유소',parking:'전국주차장정보표준데이터로 무료 공영 주차장과 시간별 예상 요금',service:'공공데이터로 자동차 정비소·검사소·세차장, 가전·휴대폰 서비스센터 안내'};
const LIST=(Object.keys(SITES) as Site[]).filter(k=>k!=='near'&&!SITES[k].hidden);

export default function Home(){
  const areas=AREAS;
  const qa:[string,string][]=[['내근처는 어떤 서비스인가요?',`위치 하나로 날씨·문 연 약국·진료 중인 병원·최저가 주유소·무료 주차장·전기차 충전기·가볼만한곳을 한 화면에 보여 주는 서비스예요. ${LIST.length}개 내근처 사이트의 공공데이터를 함께 씁니다.`],
    ['내 위치는 저장되나요?','위치는 버튼을 눌러 허용한 경우에만 쓰고, 이 브라우저와 내근처 사이트 안에서 30분 동안만 기억해요. 서버에 위치를 저장하지 않아요.'],
    ['정보는 얼마나 자주 바뀌나요?','약국·병원 진료 여부는 지금 시각 기준으로 계산하고, 날씨·충전기·응급실 병상은 실시간에 가깝게, 주유소 가격은 매일 갱신해요.']];
  return <div className="page">
    <section className="nr-hero"><h1>내 주변, 지금 한 번에</h1><p>날씨 · 문 연 약국 · 진료 중인 병원 · 최저가 주유소 · 무료 주차장 · 충전기 · 가볼만한곳</p></section>
    <Dashboard areas={areas}/>
    <section><h2>이럴 땐 한 번에</h2><div className="nr-situations">{SITUATIONS.map(s=><Link key={s.slug} href={`/situation/${s.slug}`} className="nr-situation"><span aria-hidden="true">{s.icon}</span><b>{s.title}</b><small>{s.lead}</small></Link>)}</div></section>
    <AdSlot/>
    <section><h2>내근처 서비스 {LIST.length}곳</h2><div className="nr-sites">{LIST.map(k=><a key={k} href={SITES[k].url} className="nr-site"><span aria-hidden="true">{SITES[k].icon}</span><span><b>{SITES[k].brand}</b><small>{SITES[k].tagline} — {ABOUT[k]}</small></span></a>)}</div></section>
    <Faq items={qa}/>
    <JsonLd data={{'@context':'https://schema.org','@type':'ItemList',name:'내근처 서비스',itemListElement:LIST.map((k,i)=>({'@type':'ListItem',position:i+1,name:SITES[k].brand,url:SITES[k].url+'/'}))}}/>
    <p className="muted small">주소: {SITE}</p>
  </div>;
}
