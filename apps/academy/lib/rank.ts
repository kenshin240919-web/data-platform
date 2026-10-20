// 과목별 수강료 순위(정적): 시군구마다 그 과목 공개 수강료 중앙값. 금액 표본이 적은 곳은 흔들려서 뺌.
import {nation,regions,SUBJECTS} from './data';
export const MIN_FEES=10;
export type RankRow={id:string;name:string;median:number;min:number;max:number;n:number;count:number};
export function rankOf(subject:string):RankRow[]{
  return regions.flatMap(r=>{const s=r.subjects[subject];return s?.fees&&s.fees.n>=MIN_FEES?[{id:r.id,name:r.name,median:s.fees.median,min:s.fees.min,max:s.fees.max,n:s.fees.n,count:s.count}]:[];})
    .sort((a,b)=>b.median-a.median||b.n-a.n);
}
/** 순위 페이지를 만들 과목: 비교할 지역이 5곳 이상. */
export const RANK_SUBJECTS=Object.keys(SUBJECTS).filter(k=>nation[k]?.fees&&rankOf(k).length>=5);
