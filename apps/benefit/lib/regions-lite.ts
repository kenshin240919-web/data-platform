// 브라우저로 보내는 시군구 목록(가장 가까운 시군구 고르기·맞춤 찾기 선택 상자)
import {regions,SIDO_ORDER} from './data';
import type {RegionLite} from '../app/_components/Live';
export const regionsLite:RegionLite[]=[...regions].sort((a,b)=>SIDO_ORDER.indexOf(a.sido)-SIDO_ORDER.indexOf(b.sido)||a.zone.localeCompare(b.zone,'ko')).map(r=>({c:r.code,n:r.name,s:r.sido,a:r.lat,o:r.lon}));
