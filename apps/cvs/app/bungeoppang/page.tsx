import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Gs25Near} from '../_components/Gs25Near';
import {Ad} from '../_components/Ad';
import {GsLinks} from '../_components/GsLinks';
import {COND_MIN,n,nation,regions,SITE} from '../../lib/data';
export const metadata:Metadata={title:'붕어빵 파는 편의점 · 내 주변 GS25 붕어빵·군고구마',description:'내 위치에서 1.5km 안 붕어빵·군고구마 파는 GS25를 가까운 순으로. GS25 앱에 매장이 등록한 서비스 정보를 방문할 때 바로 확인해 보여 드리고, 전화번호·거리도 함께 알려 드려요.',alternates:{canonical:'/bungeoppang'}};
const PICKS=[{key:'fish',label:'붕어빵',props:['붕어빵']},{key:'yam',label:'군고구마',props:['군고구마']},{key:'both',label:'붕어빵·군고구마',props:['붕어빵','군고구마']}];
export default function Bungeoppang(){
  const top=regions.filter(r=>r.brands.gs25>=COND_MIN).sort((a,b)=>b.brands.gs25-a.brands.gs25).slice(0,12);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 붕어빵 파는 편의점</nav>
    <h1>🐟 내 주변 붕어빵 파는 편의점</h1>
    <p className="muted">GS25 앱에 ‘붕어빵’·‘군고구마’ 서비스를 등록한 매장을 내 위치에서 가까운 순으로 보여 드려요.</p>
    <Gs25Near title="붕어빵 파는 편의점" picks={PICKS}/>
    <Ad/>
    <section className="cv-guide"><h2>🐟 헛걸음 안 하려면</h2><ol>
      <li><b>가기 전에 전화로 확인하세요</b><span>편의점 붕어빵·군고구마는 매장에서 기계로 굽는 경우가 많아, 굽는 시간과 남은 수량이 매장마다 달라요.</span></li>
      <li><b>가까운 곳 두세 곳을 함께 보세요</b><span>목록은 가까운 순이에요. 첫 매장이 다 팔렸으면 다음 매장으로.</span></li>
      <li><b>목록에 없는 매장도 있어요</b><span>GS25 앱에 등록한 서비스만 보여 드려요. CU·세븐일레븐·이마트24 등은 이 정보를 받을 수 없어 보이지 않을 뿐이에요.</span></li>
    </ol></section>
    <GsLinks here="/bungeoppang"/>
    <section><h2>GS25 매장이 많은 지역</h2><p className="muted small">상비약 판매자로 등록된 GS25 기준이에요. 지역 페이지에서 매장 주소·전화를 볼 수 있어요.</p>
      <ol className="cv-rank">{top.map(r=><li key={r.id}><Link href={`/region/${r.id}/gs25`}><b>{r.name}</b><span>{n(r.brands.gs25)}곳</span></Link></li>)}</ol></section>
    <Faq items={[
      ['편의점 붕어빵은 어디서 파나요?','이 페이지는 GS25 앱에 ‘붕어빵’ 서비스를 등록한 매장을 내 위치에서 1.5km 안, 가까운 순으로 보여 드립니다. 내 위치 주변 보기를 누르면 바로 확인할 수 있어요.'],
      ['군고구마 파는 편의점도 찾을 수 있나요?','네. 위의 ‘군고구마’ 버튼을 누르면 GS25 앱에 군고구마 서비스를 등록한 매장만 보여 드립니다.'],
      ['목록에 있으면 지금 바로 살 수 있나요?','아니요. 매장이 등록한 서비스 정보라서 굽는 시간·남은 수량은 알 수 없어요. 가기 전에 매장에 전화로 확인하세요.'],
      ['CU·세븐일레븐 붕어빵은 왜 안 보이나요?','다른 편의점은 매장별 서비스 정보를 받을 수 없어서 GS25만 보여 드립니다. 다른 편의점에 붕어빵이 없다는 뜻은 아닙니다.'],
    ]}/>
    <p className="muted small">GS25 앱에 공개된 매장 정보를 방문할 때마다 바로 확인합니다(GS25 본사와 관계없는 비공식 안내, 저장하지 않음). 전국 상비약 판매 GS25 {n(nation.brands.gs25)}곳은 <Link href="/brand/gs25">GS25 매장</Link>에서 볼 수 있어요.</p>
    <JsonLd data={breadcrumbLd([['내근처 편의점',SITE+'/'],['붕어빵 파는 편의점',SITE+'/bungeoppang']])}/>
  </div>;
}
