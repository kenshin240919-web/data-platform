import type {Metadata} from 'next';
import {ComparePage} from '../_components/ComparePage';
// 비교함 내용은 방문자마다 달라 검색 노출하지 않음(지역 페이지가 검색 입구).
export const metadata:Metadata={title:'학원 비교',description:'관심 학원 최대 4곳의 공개 수강료·과정·정원·위치를 나란히 비교해 보세요.',robots:{index:false,follow:true},alternates:{canonical:'/compare'}};
export default function Compare(){return <div className="page"><h1>학원 비교</h1><ComparePage/></div>;}
