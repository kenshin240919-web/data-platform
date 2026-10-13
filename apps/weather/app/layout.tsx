import type { Metadata } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import '@guidejung/ui/styles';
import './weather.css';
import { Shell } from './_components/Shell';
import { SITE } from '../lib/regions';

// Search engine ownership tags (do not remove: verification is rechecked periodically).
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg'},verification:{other:{'naver-site-verification':'5827fd09c38391b56f3293e06d57fff8b915b163','msvalidate.01':'94FB5F5FCBAB10DABDC0256A035F8369'}},title:{default:'날씨정보 | 오늘 날씨·미세먼지·주간 예보',template:'%s | 날씨정보'},
  description:'전국 시군구의 지금 날씨, 시간별·10일 예보, 미세먼지와 옷차림을 한눈에. 기상청 공식 예보 기반.',openGraph:{siteName:'날씨정보',locale:'ko_KR',type:'website'},alternates:{types:{'application/rss+xml':SITE+'/rss.xml'}}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head><AdSenseScript/></head><body><Shell>{children}</Shell></body></html>;}
