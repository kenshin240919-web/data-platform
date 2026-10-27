import type {Metadata} from 'next';
import {Suspense} from 'react';
import Link from 'next/link';
import {SearchBox} from '../_components/SearchBox';
export const metadata:Metadata={title:'온누리상품권 가맹점 찾기',description:'가게·시장 이름이나 품목으로 온누리상품권 가맹점을 찾아보세요.',robots:{index:false,follow:true},alternates:{canonical:'/search'}};
export default function Search(){return <div className="page"><nav className="crumbs"><Link href="/">홈</Link> › 가게 찾기</nav><h1>온누리상품권 가맹점 찾기</h1><Suspense><SearchBox/></Suspense></div>;}
