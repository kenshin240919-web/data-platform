import type {Metadata} from 'next';
import {Suspense} from 'react';
import {SearchPage} from '../_components/SearchPage';
// Results depend on the query string, so this page is not indexed (region pages are the search-engine entry points).
export const metadata:Metadata={title:'학원 찾기',description:'학원 이름·동네·과정으로 학원과 공개 수강료를 찾아보세요.',robots:{index:false,follow:true},alternates:{canonical:'/search'}};
export default function Search(){return <div className="page"><h1>학원 찾기</h1><Suspense fallback={<p className="muted">불러오는 중…</p>}><SearchPage/></Suspense></div>;}
