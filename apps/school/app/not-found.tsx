import Link from 'next/link';
export default function NotFound(){return <div className="page"><h1>페이지를 찾을 수 없어요</h1><p>문을 닫았거나 학교 코드가 바뀐 학교일 수 있어요.</p><p><Link href="/search">학교 찾기</Link> · <Link href="/region">지역별 학교</Link></p></div>;}
