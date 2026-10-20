import type {Metadata} from 'next';
import {Suspense} from 'react';
import Link from 'next/link';
import {SearchBox} from '../_components/SearchBox';
export const metadata:Metadata={title:'약국 찾기',description:'약국 이름이나 동네로 약국을 찾아 운영 시간과 지금 영업 여부를 확인하세요.',robots:{index:false,follow:true},alternates:{canonical:'/search'}};
export default function Search(){return <div className="page"><nav className="crumbs"><Link href="/">홈</Link> › 약국 찾기</nav><h1>약국 찾기</h1><Suspense><SearchBox/></Suspense></div>;}
