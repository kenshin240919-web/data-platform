import type { Metadata, Viewport } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './weather.css';
import '@guidejung/ui/dark';
import './weather.dark.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { SITE } from '../lib/regions';

// Search engine ownership tags (do not remove: verification is rechecked periodically).
// 직접 만든 어두운 화면을 쓰도록 알림(휴대폰 브라우저가 색을 강제로 뒤집어 글자가 노랗게 보이던 것 방지).
export const viewport:Viewport={colorScheme:'light dark'};
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'},manifest:'/manifest.webmanifest',verification:{other:{'naver-site-verification':'5827fd09c38391b56f3293e06d57fff8b915b163','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},title:{default:'내근처 날씨 | 오늘 날씨 어때? 지금 날씨·미세먼지·주간 예보',template:'%s | 내근처 날씨'},
  description:'전국 시군구의 지금 날씨, 시간별·10일 예보, 미세먼지와 옷차림을 한눈에. 기상청 공식 예보 기반.',twitter:{card:'summary_large_image'},openGraph:{images:'/og.png?v=2',siteName:'내근처 날씨',locale:'ko_KR',type:'website'},alternates:{types:{'application/rss+xml':SITE+'/rss.xml'}}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head><GaScript id="G-MFS9C8WXBV"/><AdSenseScript/><ClarityScript id="yxh23x6e9n"/></head><body><JsonLd data={siteLd({...SITES.weather,description:metadata.description as string})}/><Shell>{children}</Shell></body></html>;}
