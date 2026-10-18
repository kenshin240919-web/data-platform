import type { Metadata } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './charge.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { SITE } from '../lib/regions';

// Search engine ownership tags (do not remove: verification is rechecked periodically).
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg'},verification:{other:{'naver-site-verification':'f8f3585df76d56b1b2fb599348e0bd4d0a10678c','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},title:{default:'내근처 충전소 | 지금 바로 충전 가능한 전기차 충전소',template:'%s | 내근처 충전소'},
  description:'내 주변 전기차 충전소와 지금 비어 있는 충전기를 실시간으로. 급속·완속, 무료 주차, 24시간 충전소를 지역별로 찾아보세요.',twitter:{card:'summary_large_image'},openGraph:{images:'/og.png',siteName:'내근처 충전소',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head><GaScript id="G-2DF9TG7EP5"/><AdSenseScript/><ClarityScript id="yxl5298cyt"/></head><body><JsonLd data={siteLd({...SITES.charge,description:metadata.description as string})}/><Shell>{children}</Shell></body></html>;}
