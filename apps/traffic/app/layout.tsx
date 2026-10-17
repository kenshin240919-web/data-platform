import type { Metadata } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import '@guidejung/ui/styles';
import './traffic.css';
import { Shell } from './_components/Shell';
import { SITE } from '../lib/format';

// Search engine ownership tags (do not remove: verification is rechecked periodically).
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg'},verification:{other:{'naver-site-verification':'cc389b26dbb26ff5602d78da26f1c646c5c3ece2','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},title:{default:'내근처 고속도로 | 지금 길 막혀? 실시간 정체·CCTV·휴게소',template:'%s | 내근처 고속도로'},
  description:'전국 고속도로 실시간 정체 구간과 지금 가장 막히는 곳, 휴게소 대표 음식·기름값, 사고·공사 정보를 한눈에 확인하세요.',openGraph:{siteName:'내근처 고속도로',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head><AdSenseScript/><ClarityScript id="yxymh7qfew"/></head><body><Shell>{children}</Shell></body></html>;}
