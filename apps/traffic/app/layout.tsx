import type { Metadata } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './traffic.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { SITE } from '../lib/format';

// Search engine ownership tags (do not remove: verification is rechecked periodically).
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg'},verification:{other:{'naver-site-verification':'cc389b26dbb26ff5602d78da26f1c646c5c3ece2','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},title:{default:'내근처 고속도로 | 지금 길 막혀? 실시간 고속도로 교통정보·CCTV·휴게소',template:'%s | 내근처 고속도로'},
  description:'전국 고속도로 실시간 교통정보: 정체 구간과 지금 가장 막히는 곳, CCTV, 휴게소 대표 음식·기름값, 사고·공사 정보를 한눈에 확인하세요.',twitter:{card:'summary_large_image'},openGraph:{images:'/og.png',siteName:'내근처 고속도로',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head><GaScript id="G-1S5MH65EE3"/><AdSenseScript/><ClarityScript id="yxymh7qfew"/></head><body><JsonLd data={siteLd({...SITES.traffic,description:metadata.description as string})}/><Shell>{children}</Shell></body></html>;}
