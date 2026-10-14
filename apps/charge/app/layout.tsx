import type { Metadata } from 'next';
import { AdSenseScript } from '@guidejung/ui/adsense-script';
import '@guidejung/ui/styles';
import './charge.css';
import { Shell } from './_components/Shell';
import { SITE } from '../lib/regions';

export const metadata:Metadata={metadataBase:new URL(SITE),icons:{icon:'/icon.svg'},title:{default:'충전소정보 | 내 주변 전기차 충전소 실시간',template:'%s | 충전소정보'},
  description:'내 주변 전기차 충전소와 지금 비어 있는 충전기를 실시간으로. 급속·완속, 무료 주차, 24시간 충전소를 지역별로 찾아보세요.',openGraph:{siteName:'충전소정보',locale:'ko_KR',type:'website'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head><AdSenseScript/></head><body><Shell>{children}</Shell></body></html>;}
