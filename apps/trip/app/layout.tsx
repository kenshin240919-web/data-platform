import type { Metadata } from 'next';
import { Shell } from '@guidejung/ui';
import '@guidejung/ui/styles';
export const metadata:Metadata={icons:{icon:'/icon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><body><Shell service="trip">{children}</Shell></body></html>;}
