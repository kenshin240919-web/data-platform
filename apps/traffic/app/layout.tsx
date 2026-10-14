import type { Metadata } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import '@guidejung/ui/styles';
import './traffic.css';
import { Shell } from './_components/Shell';
import { SITE } from '../lib/format';

// Clarity and search-engine verification tags are added once the user creates them for traffic.guidejung.com.
export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg'},title:{default:'교통정보 | 고속도로 실시간 정체·휴게소·기름값',template:'%s | 교통정보'},
  description:'전국 고속도로 실시간 정체 구간과 지금 가장 막히는 곳, 휴게소 대표 음식·기름값, 사고·공사 정보를 한눈에 확인하세요.',openGraph:{siteName:'교통정보',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head><AdSenseScript/></head><body><Shell>{children}</Shell></body></html>;}
