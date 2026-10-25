import Link from 'next/link';
export default function NotFound(){return <div className="page"><h1>페이지를 찾을 수 없어요</h1><p>주소가 바뀌었거나 없는 페이지예요.</p><p><Link href="/">내 근처 모아보기</Link> · <Link href="/situation/sick-kid">아이 아플 때</Link> · <Link href="/situation/weekend">주말 나들이</Link></p></div>;}
