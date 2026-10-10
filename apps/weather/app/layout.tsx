import type { Metadata } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import '@guidejung/ui/styles';
import './weather.css';
import { Shell } from './_components/Shell';
import { SITE } from '../lib/regions';

export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg'},title:{default:'날씨정보 | 오늘 날씨·미세먼지·주간 예보',template:'%s | 날씨정보'},
  description:'전국 시군구의 지금 날씨, 시간별·10일 예보, 미세먼지와 옷차림을 한눈에. 기상청 공식 예보 기반.',openGraph:{siteName:'날씨정보',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head><AdSenseScript/></head><body><Shell>{children}</Shell></body></html>;}
