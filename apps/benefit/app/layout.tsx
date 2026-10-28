import type { Metadata, Viewport } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './benefit.css';
import '@guidejung/ui/dark';
import './benefit.dark.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { SITE } from '../lib/fmt';

const GA_ID='G-8SJBVG4TJ5',CLARITY_ID='z4pv2r53t3';
export const viewport:Viewport={colorScheme:'light dark'};
// Search engine ownership tags (do not remove: verification is rechecked periodically).
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'},manifest:'/manifest.webmanifest',verification:{other:{'naver-site-verification':'548a96958e917da2753f20ba396866ec572a848f','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},
  title:{default:'내근처 혜택 | 우리 동네 지원금·혜택 찾기 — 시군구·나이·상황별',template:'%s | 내근처 혜택'},
  description:'우리 동네 지원금, 놓친 거 없어? 사는 시군구와 나이·상황으로 받을 수 있는 정부·지자체 지원금과 혜택을 찾아 드려요. 마감 임박·새로 생긴 혜택·준비 서류까지. 정부24 공공서비스 정보 기준.',
  twitter:{card:'summary_large_image'},openGraph:{images:'/og.png?v=2',siteName:'내근처 혜택',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head>{GA_ID&&<GaScript id={GA_ID}/>}<AdSenseScript/>{CLARITY_ID&&<ClarityScript id={CLARITY_ID}/>}</head><body><JsonLd data={siteLd({...SITES.benefit,description:metadata.description as string,search:`${SITE}/search?q={q}`})}/><Shell>{children}</Shell></body></html>;}
