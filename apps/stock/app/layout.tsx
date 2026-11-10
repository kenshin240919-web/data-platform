import type { Metadata, Viewport } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './stock.css';
import '@guidejung/ui/dark';
import './stock.dark.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { ADS, SITE } from '../lib/fmt';

const GA_ID='G-H47KL7L0CJ',CLARITY_ID='zbh4eizuq0';
// 직접 만든 어두운 화면을 쓰도록 알림(휴대폰 브라우저가 색을 강제로 뒤집어 글자가 노랗게 보이던 것 방지).
export const viewport:Viewport={colorScheme:'light dark'};
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'},manifest:'/manifest.webmanifest',title:{default:'내근처 재고 | 그거 근처 매장에 있어? 다이소 재고 내 동네에서 찾기',template:'%s | 내근처 재고'},
  description:'핫팩·건전지·우산처럼 급하게 필요한 물건이 내 동네 다이소 어느 매장에 있는지 가까운 순으로. 매장별 수량·영업 시간·전화를 한 번에 보여 드립니다(비공식 안내).',twitter:{card:'summary_large_image'},openGraph:{images:'/og.png?v=2',siteName:'내근처 재고',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head>{GA_ID&&<GaScript id={GA_ID}/>}{ADS&&<AdSenseScript/>}{CLARITY_ID&&<ClarityScript id={CLARITY_ID}/>}</head><body><JsonLd data={siteLd({...SITES.stock,description:metadata.description as string})}/><Shell>{children}</Shell></body></html>;}
