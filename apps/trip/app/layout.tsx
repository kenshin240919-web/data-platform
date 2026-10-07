import type { Metadata } from 'next';
import { Shell } from '@guidejung/ui';
import '@guidejung/ui/styles';
// Search engine ownership tags (do not remove: verification is rechecked periodically).
export const metadata:Metadata={icons:{icon:'/icon.svg'},verification:{other:{'naver-site-verification':'195cb1e9feccc177b628910264a591df2668c259'}}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><body><Shell service="trip">{children}</Shell></body></html>;}
