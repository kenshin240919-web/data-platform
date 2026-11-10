import Link from 'next/link';
export default function NotFound(){return <div className="page"><h1>페이지를 찾을 수 없어요</h1><p><Link href="/">재고 찾기</Link> · <Link href="/daiso">자주 찾는 물건</Link></p></div>;}
