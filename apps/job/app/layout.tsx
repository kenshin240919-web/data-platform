import type { Metadata, Viewport } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './job.css';
import '@guidejung/ui/dark';
import './job.dark.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { ADS, SITE } from '../lib/fmt';

// Search engine ownership tags (do not remove: verification is rechecked periodically). GA·Clarity ID(11/2 사용자).
const GA_ID='G-VEN2MP6Q50',CLARITY_ID='z7di8lc5jn';
export const viewport:Viewport={colorScheme:'light dark'};
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'},manifest:'/manifest.webmanifest',verification:{other:{'naver-site-verification':'8ad2fe25c1f870e1f841cbb49f96dfead2652c97','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},title:{default:'내근처 일자리 | 일자리 찾을 때 가는 곳 · 내 관할 고용센터·직업소개소·새일센터',template:'%s | 내근처 일자리'},
  description:'우리 동네 관할 고용센터(실업급여 신청), 가까운 직업소개소(인력사무소·간병·가사), 여성새로일하기센터, 노인일자리 기관, 대학일자리플러스센터를 가까운 순으로. 공공데이터로 매일 갱신합니다.',twitter:{card:'summary_large_image'},openGraph:{images:'/og.png?v=2',siteName:'내근처 일자리',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head>{GA_ID&&<GaScript id={GA_ID}/>}{ADS&&<AdSenseScript/>}{CLARITY_ID&&<ClarityScript id={CLARITY_ID}/>}</head><body><JsonLd data={siteLd({...SITES.job,description:metadata.description as string,search:`${SITE}/search?q={q}`})}/><Shell>{children}</Shell></body></html>;}
