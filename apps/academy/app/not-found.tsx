import Link from 'next/link';
export default function NotFound(){return <div className="page"><h1>페이지를 찾을 수 없어요</h1><p>폐원했거나 주소가 바뀐 학원일 수 있어요.</p><p><Link href="/region">지역별 학원 보기</Link> · <Link href="/search">학원 찾기</Link></p></div>;}
