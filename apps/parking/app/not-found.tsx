import Link from 'next/link';
export default function NotFound(){return <div className="page"><h1>페이지를 찾을 수 없어요</h1><p>없어졌거나 정보가 바뀐 주차장일 수 있어요.</p><p><Link href="/">내 주변 주차장</Link> · <Link href="/region">지역별 주차장</Link></p></div>;}
