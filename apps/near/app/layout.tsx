import type { Metadata } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './near.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { SITE } from '../lib/site';

// GA 측정 ID·Clarity 프로젝트 ID: 사용자에게 받으면 채움(빈 값이면 넣지 않음).
const GA_ID='G-E02X7KDB7H',CLARITY_ID='z31ia5ufen';
// Search engine ownership tags (do not remove: verification is rechecked periodically).
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'},manifest:'/manifest.webmanifest',verification:{other:{'naver-site-verification':'051a9285924d858ee750a90a7805c38ee1b52eae','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},title:{default:'내근처 | 내 근처에 뭐가 있지? 날씨·문 연 약국·병원·최저가 주유소·무료 주차장 한 번에',template:'%s | 내근처'},
  description:'내 위치 하나로 지금 날씨, 문 연 약국, 진료 중인 병원, 가까운 최저가 주유소, 무료 공영 주차장, 충전 가능한 전기차 충전기, 가볼만한곳을 한 화면에. 공공데이터 기반 내근처 시리즈.',twitter:{card:'summary_large_image'},openGraph:{images:'/og.png',siteName:'내근처',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head>{GA_ID&&<GaScript id={GA_ID}/>}<AdSenseScript/>{CLARITY_ID&&<ClarityScript id={CLARITY_ID}/>}</head><body><JsonLd data={siteLd({...SITES.near,description:metadata.description as string})}/><Shell>{children}</Shell></body></html>;}
