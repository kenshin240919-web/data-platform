import type { Metadata, Viewport } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './pharmacy.css';
import '@guidejung/ui/dark';
import './pharmacy.dark.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { SITE } from '../lib/fmt';

// GA 측정 ID·Clarity 프로젝트 ID: 사용자에게 받으면 채움(빈 값이면 넣지 않음).
const GA_ID='G-6LD4WJJCTH',CLARITY_ID='z0plxn8j1f';
// Search engine ownership tags (do not remove: verification is rechecked periodically).
// 직접 만든 어두운 화면을 쓰도록 알림(휴대폰 브라우저가 색을 강제로 뒤집어 글자가 노랗게 보이던 것 방지).
export const viewport:Viewport={colorScheme:'light dark'};
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'},manifest:'/manifest.webmanifest',verification:{other:{'naver-site-verification':'858d953dff637dec7ed8210dc4dde19b161695bc','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},title:{default:'내근처 약국 | 지금 문 연 약국 어디? 심야·일요일·공휴일 약국',template:'%s | 내근처 약국'},
  description:'내 주변 지금 영업 중인 약국을 가까운 순으로. 밤 10시 이후 심야 약국, 일요일·공휴일에 여는 약국을 지역별로 찾아보세요. 국립중앙의료원 공식 데이터.',twitter:{card:'summary_large_image'},openGraph:{images:'/og.png',siteName:'내근처 약국',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head>{GA_ID&&<GaScript id={GA_ID}/>}<AdSenseScript/>{CLARITY_ID&&<ClarityScript id={CLARITY_ID}/>}</head><body><JsonLd data={siteLd({...SITES.pharmacy,description:metadata.description as string,search:`${SITE}/search?q={q}`})}/><Shell>{children}</Shell></body></html>;}
