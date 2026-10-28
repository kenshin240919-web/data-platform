import Link from 'next/link';
export default function NotFound(){return <div className="page"><h1>페이지를 찾지 못했어요</h1><p>주소가 바뀌었거나 끝난 혜택이에요. <Link href="/">우리 동네 혜택</Link>이나 <Link href="/search">혜택 검색</Link>에서 다시 찾아보세요.</p></div>;}
