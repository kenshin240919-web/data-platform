import type { Metadata, Viewport } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './pet.css';
import '@guidejung/ui/dark';
import './pet.dark.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { SITE } from '../lib/fmt';

// GA·Clarity ID는 사용자에게 받아 넣음(비어 있으면 넣지 않음).
// Search engine ownership tags (do not remove: verification is rechecked periodically).
const GA_ID='G-QWM4LNN23V',CLARITY_ID='z3ob33o5cc';
// 직접 만든 어두운 화면을 쓰도록 알림(휴대폰 브라우저가 색을 강제로 뒤집어 글자가 노랗게 보이던 것 방지).
export const viewport:Viewport={colorScheme:'light dark'};
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'},manifest:'/manifest.webmanifest',verification:{other:{'naver-site-verification':'e6ef58adab34b862c16471e4fe0bc943643305af','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},title:{default:'내근처 동물병원 | 우리 아이 아플 때 어디로? 24시 동물병원·동물약국',template:'%s | 내근처 동물병원'},
  description:'내 주변 동물병원·24시 동물병원, 지금 문 연 동물약국, 펫호텔·애견 카페·펫택시를 가까운 순으로. 지자체에 신고된 곳만 공공데이터로 매일 갱신합니다.',twitter:{card:'summary_large_image'},openGraph:{images:'/og.png',siteName:'내근처 동물병원',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head>{GA_ID&&<GaScript id={GA_ID}/>}<AdSenseScript/>{CLARITY_ID&&<ClarityScript id={CLARITY_ID}/>}</head><body><JsonLd data={siteLd({...SITES.pet,description:metadata.description as string,search:`${SITE}/search?q={q}`})}/><Shell>{children}</Shell></body></html>;}
