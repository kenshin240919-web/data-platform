import type {Metadata} from 'next';
import {Suspense} from 'react';
import Link from 'next/link';
import {SearchBox} from '../_components/SearchBox';
export const metadata:Metadata={title:'민원 장소 찾기',description:'무인민원발급기·주민센터·구청 민원실·여권 발급 기관·우체국을 이름이나 동네로 찾으세요.',robots:{index:false,follow:true},alternates:{canonical:'/search'}};
export default function Search(){return <div className="page"><nav className="crumbs"><Link href="/">홈</Link> › 찾기</nav><h1>민원 장소 찾기</h1><Suspense><SearchBox/></Suspense></div>;}
