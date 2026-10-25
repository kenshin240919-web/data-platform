import type { Metadata, Viewport } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './parking.css';
import '@guidejung/ui/dark';
import './parking.dark.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { SITE } from '../lib/fmt';

// GA 측정 ID·Clarity 프로젝트 ID: 사용자에게 받으면 채움(빈 값이면 넣지 않음).
const GA_ID='G-NXZWMSBESF',CLARITY_ID='z1x59koafu';
// Search engine ownership tags (do not remove: verification is rechecked periodically).
// 직접 만든 어두운 화면을 쓰도록 알림(휴대폰 브라우저가 색을 강제로 뒤집어 글자가 노랗게 보이던 것 방지).
export const viewport:Viewport={colorScheme:'light dark'};
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'},manifest:'/manifest.webmanifest',verification:{other:{'naver-site-verification':'72783f871259b2b44a62cd6f2793733da7d42ec0','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},title:{default:'내근처 주차장 | 여기 주차 어디 해? 내 주변 공영·무료 주차장·요금',template:'%s | 내근처 주차장'},
  description:'내 주변 공영·무료 주차장을 가까운 순으로. 30분·1시간·2시간 세우면 얼마인지 예상 요금으로 싼 곳을 찾고, 지역별 무료·24시간 주차장을 확인하세요. 전국주차장정보표준데이터.',twitter:{card:'summary_large_image'},openGraph:{images:'/og.png',siteName:'내근처 주차장',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head>{GA_ID&&<GaScript id={GA_ID}/>}<AdSenseScript/>{CLARITY_ID&&<ClarityScript id={CLARITY_ID}/>}</head><body><JsonLd data={siteLd({...SITES.parking,description:metadata.description as string,search:`${SITE}/search?q={q}`})}/><Shell>{children}</Shell></body></html>;}
