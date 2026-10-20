import type {Metadata} from 'next';
import {Suspense} from 'react';
import Link from 'next/link';
import {SearchBox} from './SearchBox';
export const metadata:Metadata={title:'병원 찾기',description:'병원 이름·동네·과목으로 병원을 찾아 진료 시간과 지금 진료 여부를 확인하세요.',robots:{index:false,follow:true},alternates:{canonical:'/search'}};
export default function Search(){return <div className="page"><nav className="crumbs"><Link href="/">홈</Link> › 병원 찾기</nav><h1>병원 찾기</h1><Suspense><SearchBox/></Suspense></div>;}
