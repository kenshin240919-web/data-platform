import type { Metadata, Viewport } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './civil.css';
import '@guidejung/ui/dark';
import './civil.dark.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { ADS, SITE } from '../lib/fmt';

// GA·Clarity ID는 사용자에게 받으면 채움(비어 있으면 넣지 않음).
const GA_ID='G-NME313D4B7',CLARITY_ID='';
export const viewport:Viewport={colorScheme:'light dark'};
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'},manifest:'/manifest.webmanifest',title:{default:'내근처 서류 | 떼고, 뽑고, 부치는 곳 · 내 주변 무인민원발급기·주민센터·무인 프린트',template:'%s | 내근처 서류'},
  description:'지금 문 연 무인민원발급기(운영 시간·뗄 수 있는 서류), 주민센터, 구청 민원실 실시간 대기, 여권 발급 기관, 우체국, 무인 프린트를 가까운 순으로. 공공데이터로 매일 갱신합니다.',twitter:{card:'summary_large_image'},openGraph:{images:'/og.png',siteName:'내근처 서류',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head>{GA_ID&&<GaScript id={GA_ID}/>}{ADS&&<AdSenseScript/>}{CLARITY_ID&&<ClarityScript id={CLARITY_ID}/>}</head><body><JsonLd data={siteLd({...SITES.civil,description:metadata.description as string,search:`${SITE}/search?q={q}`})}/><Shell>{children}</Shell></body></html>;}
