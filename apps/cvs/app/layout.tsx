import type { Metadata, Viewport } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './cvs.css';
import '@guidejung/ui/dark';
import './cvs.dark.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { ADS, SITE } from '../lib/fmt';

// GA·Clarity ID는 사용자에게 받아 넣음(새 사이트 규칙). 비어 있으면 스크립트를 넣지 않음.
const GA_ID='G-FC3F88WGY4',CLARITY_ID='zac9wzdb3n';
// 직접 만든 어두운 화면을 쓰도록 알림(휴대폰 브라우저가 색을 강제로 뒤집어 글자가 노랗게 보이던 것 방지).
export const viewport:Viewport={colorScheme:'light dark'};
// Search engine ownership tags (do not remove: verification is rechecked periodically).
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'},manifest:'/manifest.webmanifest',verification:{other:{'naver-site-verification':'e323209d3a951c93ac5bf925c775a0f836dbd7a8','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},title:{default:'내근처 편의점 | 밤에도 상비약 어디서? 내 주변 상비약 파는 편의점',template:'%s | 내근처 편의점'},
  description:'약국이 닫은 밤에도 해열진통제·소화제 같은 상비약을 살 수 있는 편의점을 가까운 순으로. 안전상비의약품 판매자로 등록된 CU·GS25·세븐일레븐·이마트24 매장과 지금 문 연 약국을 함께 보여 드립니다.',twitter:{card:'summary_large_image'},openGraph:{images:'/og.png?v=2',siteName:'내근처 편의점',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head>{GA_ID&&<GaScript id={GA_ID}/>}{ADS&&<AdSenseScript/>}{CLARITY_ID&&<ClarityScript id={CLARITY_ID}/>}</head><body><JsonLd data={siteLd({...SITES.cvs,description:metadata.description as string,search:`${SITE}/search?q={q}`})}/><Shell>{children}</Shell></body></html>;}
