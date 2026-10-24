import type { Metadata } from 'next';
import { AdSenseScript, IMAGE_FALLBACK, Shell } from '@guidejung/ui';
import { ClarityScript } from '@guidejung/ui/clarity-script';
import { GaScript } from '@guidejung/ui/ga-script';
import '@guidejung/ui/styles';
// Search engine ownership tags (do not remove: verification is rechecked periodically).
export const metadata:Metadata={icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'},manifest:'/manifest.webmanifest',verification:{other:{'naver-site-verification':'195cb1e9feccc177b628910264a591df2668c259'}}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><head><GaScript id="G-WN326BYC7E"/><script dangerouslySetInnerHTML={{__html:IMAGE_FALLBACK}}/><AdSenseScript/><ClarityScript id="yxgv6hkcoz"/></head><body><Shell service="trip">{children}</Shell></body></html>;}
