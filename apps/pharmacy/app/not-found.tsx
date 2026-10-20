import Link from 'next/link';
export default function NotFound(){return <div className="page"><h1>페이지를 찾을 수 없어요</h1><p>문을 닫았거나 정보가 바뀐 약국일 수 있어요.</p><p><Link href="/">지금 문 연 약국</Link> · <Link href="/region">지역별 약국</Link></p></div>;}
