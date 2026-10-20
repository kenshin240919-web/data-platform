import type {Metadata} from 'next';
import {Suspense} from 'react';
import Link from 'next/link';
import {SearchBox} from './SearchBox';
export const metadata:Metadata={title:'학교 찾기',description:'학교 이름이나 내 주변에서 우리 학교를 찾아 오늘 급식·학사일정·시간표를 보세요.',robots:{index:false,follow:true},alternates:{canonical:'/search'}};
export default function Search(){return <div className="page"><nav className="crumbs"><Link href="/">홈</Link> › 학교 찾기</nav><h1>학교 찾기</h1><Suspense><SearchBox/></Suspense></div>;}
