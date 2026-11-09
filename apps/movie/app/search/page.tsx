import type {Metadata} from 'next';
import {Suspense} from 'react';
import Link from 'next/link';
import {SearchBox} from '../_components/SearchBox';
export const metadata:Metadata={title:'영화관 찾기',description:'영화관을 극장 이름이나 동네로 찾아 오늘 남은 상영과 주차장을 확인하세요.',robots:{index:false,follow:true},alternates:{canonical:'/search'}};
export default function Search(){return <div className="page"><nav className="crumbs"><Link href="/">홈</Link> › 찾기</nav><h1>영화관 찾기</h1><Suspense><SearchBox/></Suspense></div>;}
