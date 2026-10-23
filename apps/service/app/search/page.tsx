import type {Metadata} from 'next';
import {Suspense} from 'react';
import Link from 'next/link';
import {SearchBox} from '../_components/SearchBox';
export const metadata:Metadata={title:'정비소·검사소 찾기',description:'정비소·검사소·세차장 이름이나 동네로 찾아 위치와 전화번호를 확인하세요.',robots:{index:false,follow:true},alternates:{canonical:'/search'}};
export default function Search(){return <div className="page"><nav className="crumbs"><Link href="/">홈</Link> › 찾기</nav><h1>정비소·검사소 찾기</h1><Suspense><SearchBox/></Suspense></div>;}
