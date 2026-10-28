import {allFor,byViews,dueSoon,localItems,regions,region,row,sidoItems,nationItems} from '../../../lib/data';
// 첫 화면 '우리 동네' 요약(브라우저가 내 위치에서 가장 가까운 시군구를 골라 받음).
export const dynamic='force-static';
export function generateStaticParams(){return regions.map(r=>({code:r.code}));}
export async function GET(_:Request,{params}:{params:Promise<{code:string}>}){
  const r=region((await params).code)!;const all=allFor(r);const local=localItems(r.code);
  return Response.json({code:r.code,name:r.name,zone:r.zone,sido:r.sido,local:local.length,sidoN:sidoItems(r.sido).length,nation:nationItems.length,total:all.length,
    due:dueSoon(all,31).slice(0,5).map(row),dueN:dueSoon(all,31).length,top:[...local].sort(byViews).slice(0,6).map(row)});
}
