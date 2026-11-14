// 첫 화면 '📍 ○○구' 칩이 없는 페이지(소아과 3곳 미만·야간/일요일 0곳)로 가지 않게: 시군구 코드 → 있는 페이지(11/14).
import {COND_KEY,MIN_DEPT,regions} from '../../lib/data';
export const dynamic='force-static';
export function GET(){
  const out:Record<string,string[]>={};
  for(const r of regions)out[r.id]=[...Object.entries(r.depts).filter(([,d])=>d.count>=MIN_DEPT).map(([k])=>k),...Object.entries(COND_KEY).filter(([,k])=>r.cond[k]).map(([s])=>s)];
  return Response.json(out);
}
