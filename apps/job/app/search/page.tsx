import type {Metadata} from 'next';
import {Suspense} from 'react';
import Link from 'next/link';
import {SearchBox} from '../_components/SearchBox';
export const metadata:Metadata={title:'기관 찾기',description:'고용센터·직업소개소·새일센터·노인일자리 기관·대학일자리플러스센터를 이름이나 동네로 찾으세요.',robots:{index:false,follow:true},alternates:{canonical:'/search'}};
export default function Search(){return <div className="page"><nav className="crumbs"><Link href="/">홈</Link> › 찾기</nav><h1>일자리 기관 찾기</h1><Suspense><SearchBox/></Suspense></div>;}
