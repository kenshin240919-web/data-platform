import Link from 'next/link';
export default function NotFound(){return <div className="page"><h1>페이지를 찾을 수 없어요</h1><p>오늘 최저가 목록에서 빠진 주유소일 수 있어요.</p><p><Link href="/">내 주변 최저가</Link> · <Link href="/region">지역별 휘발유</Link></p></div>;}
