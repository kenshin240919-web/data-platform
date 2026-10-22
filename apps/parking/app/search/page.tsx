import type {Metadata} from 'next';
import {Suspense} from 'react';
import Link from 'next/link';
import {SearchBox} from '../_components/SearchBox';
export const metadata:Metadata={title:'주차장 찾기',description:'주차장 이름이나 동네로 공영 주차장을 찾아 요금과 운영 시간을 확인하세요.',robots:{index:false,follow:true},alternates:{canonical:'/search'}};
export default function Search(){return <div className="page"><nav className="crumbs"><Link href="/">홈</Link> › 주차장 찾기</nav><h1>주차장 찾기</h1><Suspense><SearchBox/></Suspense></div>;}
