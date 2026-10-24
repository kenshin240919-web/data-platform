import type { Metadata } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './service.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { SITE } from '../lib/fmt';

const GA_ID='G-KKTGJHYGKE',CLARITY_ID='z24l1c06so';
// Search engine ownership tags (do not remove: verification is rechecked periodically).
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'},manifest:'/manifest.webmanifest',verification:{other:{'naver-site-verification':'7c573051310a536ce390b0dccba214960fde3417','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},title:{default:'내근처 서비스센터 | 고장 났다, 어디로 가지? 내 주변 자동차 정비소·검사소',template:'%s | 내근처 서비스센터'},
  description:'내 주변 자동차 정비소(종합·소형·전문 정비)와 자동차 검사소·세차장·배출가스 정비를 가까운 순으로. 검사 기한·과태료 계산기와 정비 맡기기 전 체크리스트까지. 공공데이터 기반.',twitter:{card:'summary_large_image'},openGraph:{images:'/og.png',siteName:'내근처 서비스센터',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head>{GA_ID&&<GaScript id={GA_ID}/>}<AdSenseScript/>{CLARITY_ID&&<ClarityScript id={CLARITY_ID}/>}</head><body><JsonLd data={siteLd({...SITES.service,description:metadata.description as string,search:`${SITE}/search?q={q}`})}/><Shell>{children}</Shell></body></html>;}
