import type { Metadata, Viewport } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './academy.css';
import '@guidejung/ui/dark';
import './academy.dark.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { SITE } from '../lib/fmt';

// Search engine ownership tags (do not remove: verification is rechecked periodically).
// 직접 만든 어두운 화면을 쓰도록 알림(휴대폰 브라우저가 색을 강제로 뒤집어 글자가 노랗게 보이던 것 방지).
export const viewport:Viewport={colorScheme:'light dark'};
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'},manifest:'/manifest.webmanifest',verification:{other:{'naver-site-verification':'499488ca71b12e8ca6e8e335381177d4a7bd2459','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},title:{default:'내근처 학원 | 우리 동네 학원비 얼마야? 학원·수강료 찾기',template:'%s | 내근처 학원'},
  description:'우리 동네 학원·교습소와 교육청에 공개된 과정별 수강료를 한눈에. 수학·영어·국어·피아노·미술 학원을 지역·과목·학년별로 비교해 보세요.',twitter:{card:'summary_large_image'},openGraph:{images:'/og.png?v=2',siteName:'내근처 학원',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head><GaScript id="G-2GK6W3WQ5C"/><AdSenseScript/><ClarityScript id="z0707tb574"/></head><body><JsonLd data={siteLd({...SITES.academy,description:metadata.description as string,search:`${SITE}/search?q={q}`})}/><Shell>{children}</Shell></body></html>;}
