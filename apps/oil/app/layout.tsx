import type { Metadata } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './oil.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { SITE } from '../lib/fmt';

// GA 측정 ID·Clarity 프로젝트 ID: 사용자에게 받으면 채움(빈 값이면 넣지 않음).
const GA_ID='G-45BQ6EFDMZ',CLARITY_ID='z138lzljci';
// Search engine ownership tags (do not remove: verification is rechecked periodically).
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'},manifest:'/manifest.webmanifest',verification:{other:{'naver-site-verification':'f38155c979c51ba05d41203f1d6c1e9f156ab5e8','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},title:{default:'내근처 주유소 | 기름값 제일 싼 곳 어디? 오늘 휘발유·경유 최저가',template:'%s | 내근처 주유소'},
  description:'내 주변 휘발유·경유 가장 싼 주유소를 가격·거리순으로. 시군구별 최저가 주유소와 평균 가격, 전국 기름값 추이를 매일 갱신합니다. 한국석유공사 오피넷 데이터.',twitter:{card:'summary_large_image'},openGraph:{images:'/og.png',siteName:'내근처 주유소',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head>{GA_ID&&<GaScript id={GA_ID}/>}<AdSenseScript/>{CLARITY_ID&&<ClarityScript id={CLARITY_ID}/>}</head><body><JsonLd data={siteLd({...SITES.oil,description:metadata.description as string})}/><Shell>{children}</Shell></body></html>;}
