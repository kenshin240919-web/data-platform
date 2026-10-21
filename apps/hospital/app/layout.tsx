import type { Metadata } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './hospital.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { SITE } from '../lib/fmt';

const GA_ID='G-NB6822FH1B',CLARITY_ID='z0vyg0ajsf';
// Search engine ownership tags (do not remove: verification is rechecked periodically).
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg'},verification:{other:{'naver-site-verification':'190ca42e43063fe3355b6a5edccf07d790c2cbfd','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},title:{default:'내근처 병원 | 지금 진료하는 병원 어디? 야간·주말·응급실',template:'%s | 내근처 병원'},
  description:'내 주변 지금 진료 중인 병원을 과목별로 가까운 순으로. 소아청소년과·내과·이비인후과 야간·일요일·공휴일 진료 병원과 응급실 실시간 남은 병상까지. 국립중앙의료원 공식 데이터.',twitter:{card:'summary_large_image'},openGraph:{images:'/og.png',siteName:'내근처 병원',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head>{GA_ID&&<GaScript id={GA_ID}/>}<AdSenseScript/>{CLARITY_ID&&<ClarityScript id={CLARITY_ID}/>}</head><body><JsonLd data={siteLd({...SITES.hospital,description:metadata.description as string,search:`${SITE}/search?q={q}`})}/><Shell>{children}</Shell></body></html>;}
