import type { Metadata, Viewport } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
import './school.css';
import '@guidejung/ui/dark';
import './school.dark.css';
import { Shell } from './_components/Shell';
import { JsonLd, siteLd } from '@guidejung/ui/seo';
import { SITES } from '@guidejung/ui/network';
import { SITE } from '../lib/fmt';

// GA 측정 ID·Clarity 프로젝트 ID: 사용자에게 받으면 채움(빈 값이면 넣지 않음).
const GA_ID='G-FLG82C9D1P',CLARITY_ID='z0mb3371mh';
// Search engine ownership tags (do not remove: verification is rechecked periodically).
// 직접 만든 어두운 화면을 쓰도록 알림(휴대폰 브라우저가 색을 강제로 뒤집어 글자가 노랗게 보이던 것 방지).
export const viewport:Viewport={colorScheme:'light dark'};
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'},manifest:'/manifest.webmanifest',verification:{other:{'naver-site-verification':'aa3ec0ab032cc5e8dda67cc0208abe00b4e786ff','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},title:{default:'내 학교 | 오늘 급식 뭐야? 우리 학교 급식·학사일정·시간표',template:'%s | 내 학교'},
  description:'우리 학교 오늘 급식과 이번 주 급식(알레르기 표시), 시험·방학까지 D-day, 학년·반 시간표를 한 번에. 전국 초·중·고등학교 급식·학사일정을 나이스 공식 데이터로 보여 드려요.',twitter:{card:'summary_large_image'},openGraph:{images:'/og.png',siteName:'내 학교',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head>{GA_ID&&<GaScript id={GA_ID}/>}<AdSenseScript/>{CLARITY_ID&&<ClarityScript id={CLARITY_ID}/>}</head><body><JsonLd data={siteLd({...SITES.school,description:metadata.description as string,search:`${SITE}/search?q={q}`})}/><Shell>{children}</Shell></body></html>;}
