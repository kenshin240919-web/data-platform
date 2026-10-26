import type { Metadata, Viewport } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './rest.css';
import '@guidejung/ui/dark';
import './rest.dark.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { ADS, SITE } from '../lib/fmt';

const GA_ID='G-M9FGX8WRZJ',CLARITY_ID='z3hjcim9p7';
// Search engine ownership tags (do not remove: verification is rechecked periodically).
// 직접 만든 어두운 화면을 쓰도록 알림(휴대폰 브라우저가 색을 강제로 뒤집어 글자가 노랗게 보이던 것 방지).
export const viewport:Viewport={colorScheme:'light dark'};
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'},manifest:'/manifest.webmanifest',verification:{other:{'naver-site-verification':'bad5d787e723fba6871d04a61b515140f7a62c34','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},title:{default:'내근처 휴식 | 오늘 어디서 쉬지? 내 주변 찜질방·사우나·1인 목욕탕',template:'%s | 내근처 휴식'},
  description:'내 주변 찜질방·사우나·목욕탕, 1인·프라이빗 목욕탕과 세신샵, 안마원, 피부관리실을 가까운 순으로. 지자체에 신고된 업소만 공공데이터로 매일 갱신합니다.',twitter:{card:'summary_large_image'},openGraph:{images:'/og.png',siteName:'내근처 휴식',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head>{GA_ID&&<GaScript id={GA_ID}/>}{ADS&&<AdSenseScript/>}{CLARITY_ID&&<ClarityScript id={CLARITY_ID}/>}</head><body><JsonLd data={siteLd({...SITES.rest,description:metadata.description as string,search:`${SITE}/search?q={q}`})}/><Shell>{children}</Shell></body></html>;}
