import type { Metadata } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './parking.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { SITE } from '../lib/fmt';

// GA 측정 ID·Clarity 프로젝트 ID: 사용자에게 받으면 채움(빈 값이면 넣지 않음).
const GA_ID='G-NXZWMSBESF',CLARITY_ID='';
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg'},title:{default:'내근처 주차장 | 여기 주차 어디 해? 내 주변 공영·무료 주차장·요금',template:'%s | 내근처 주차장'},
  description:'내 주변 공영·무료 주차장을 가까운 순으로. 30분·1시간·2시간 세우면 얼마인지 예상 요금으로 싼 곳을 찾고, 지역별 무료·24시간 주차장을 확인하세요. 전국주차장정보표준데이터.',twitter:{card:'summary_large_image'},openGraph:{images:'/og.png',siteName:'내근처 주차장',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head>{GA_ID&&<GaScript id={GA_ID}/>}<AdSenseScript/>{CLARITY_ID&&<ClarityScript id={CLARITY_ID}/>}</head><body><JsonLd data={siteLd({...SITES.parking,description:metadata.description as string,search:`${SITE}/search?q={q}`})}/><Shell>{children}</Shell></body></html>;}
