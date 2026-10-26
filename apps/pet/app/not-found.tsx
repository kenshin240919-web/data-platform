import Link from 'next/link';
export default function NotFound(){return <div className="page"><h1>페이지를 찾을 수 없어요</h1><p>문을 닫았거나 정보가 바뀐 곳일 수 있어요.</p><p><Link href="/">내 주변 동물병원</Link> · <Link href="/24h">24시 동물병원</Link> · <Link href="/region">지역별</Link></p></div>;}
