import Link from 'next/link';
export default function NotFound(){return <section className="section empty"><h1>찾으시는 지역이 없습니다</h1><p>주소를 확인하거나 지역 목록에서 골라 보세요.</p><Link href="/region">전국 지역 보기</Link></section>;}
