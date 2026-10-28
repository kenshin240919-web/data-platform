import type { Metadata, Viewport } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './market.css';
import '@guidejung/ui/dark';
import './market.dark.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { SITE } from '../lib/fmt';

// GA·Clarity ID는 사용자에게 받아 넣음(비어 있으면 넣지 않음).
const GA_ID='G-L2J6MMPR8B',CLARITY_ID='z4hemv3oh7';
// 직접 만든 어두운 화면을 쓰도록 알림(휴대폰 브라우저가 색을 강제로 뒤집어 글자가 노랗게 보이던 것 방지).
export const viewport:Viewport={colorScheme:'light dark'};
// Search engine ownership tags (do not remove: verification is rechecked periodically).
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'},manifest:'/manifest.webmanifest',verification:{other:{'naver-site-verification':'65639cd18f5e4092ee3961843528ec314c090bc7','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},
  title:{default:'내근처 시장 | 온누리상품권 사용처 가맹점 찾기 — 내 주변 전통시장·상점가',template:'%s | 내근처 시장'},
  description:'온누리상품권 어디서 써? 내 주변 온누리상품권 사용처(가맹점)를 전통시장·상점가별, 시군구별, 품목별(음식점·카페·정육·미용실…)로 찾아 드려요. 소상공인시장진흥공단 공식 가맹점 목록 기준.',
  twitter:{card:'summary_large_image'},openGraph:{images:'/og.png?v=2',siteName:'내근처 시장',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head>{GA_ID&&<GaScript id={GA_ID}/>}<AdSenseScript/>{CLARITY_ID&&<ClarityScript id={CLARITY_ID}/>}</head><body><JsonLd data={siteLd({...SITES.market,description:metadata.description as string,search:`${SITE}/search?q={q}`})}/><Shell>{children}</Shell></body></html>;}
