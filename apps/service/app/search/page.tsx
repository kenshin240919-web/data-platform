import type {Metadata} from 'next';
import {Suspense} from 'react';
import Link from 'next/link';
import {SearchBox} from '../_components/SearchBox';
export const metadata:Metadata={title:'정비소·검사소 찾기',description:'정비소·검사소·세차장 이름이나 동네, 가전·휴대폰 브랜드로 찾아 위치와 전화번호를 확인하세요.',robots:{index:false,follow:true},alternates:{canonical:'/search'}};
export default function Search(){return <div className="page"><nav className="crumbs"><Link href="/">홈</Link> › 찾기</nav><h1>정비소·검사소 찾기</h1><Suspense><SearchBox/></Suspense><p className="muted small">가전·휴대폰은 브랜드 이름(삼성·LG·애플·쿠쿠 등)으로 찾거나 <Link href="/brand">가전·휴대폰 서비스센터 안내</Link>에서 내 주변 센터를 확인하세요.</p></div>;}
