import type {Metadata} from 'next';
import {Search} from '../_components/Live';
export const metadata:Metadata={title:'혜택 검색',robots:{index:false,follow:true},alternates:{canonical:'/search'}};
export default function SearchPage(){return <div className="page"><h1>혜택 이름으로 찾기</h1><Search/></div>;}
