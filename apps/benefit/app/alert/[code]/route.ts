import {byViews,changed,dueSoon,localItems,regions,region,sidoItems,today} from '../../../lib/data';
// 내근처 알림(near Worker, apps/near/worker/alerts.ts)이 아침마다 읽는 '우리 동네 혜택' 묶음. 화면에는 쓰지 않음.
// ids: 시군구+시도 혜택 [id, 이름] 전체(새로 생긴 것 = 어제 받은 목록과 비교), due: 2주 안 마감(날짜가 정확한 것만), ch: 최근 7일 내용이 바뀐 것.
export const dynamic='force-static';
export function generateStaticParams(){return regions.map(r=>({code:r.code}));}
export async function GET(_:Request,{params}:{params:Promise<{code:string}>}){
  const r=region((await params).code)!;const mine=[...localItems(r.code),...sidoItems(r.sido)].sort(byViews);
  const week=new Date(Date.parse(today)-7*864e5).toISOString().slice(0,10);
  const ch=changed(mine,mine.length).filter(i=>i.mod!.slice(0,10)>=week);
  return Response.json({code:r.code,name:r.name,today,ids:mine.map(i=>[i.id,i.name]),
    due:dueSoon(mine,14).filter(i=>i.due_exact).map(i=>[i.id,i.name,i.due]),dueN:dueSoon(mine,31).length,
    ch:ch.length,chTop:[...ch].sort(byViews).slice(0,5).map(i=>[i.id,i.name])});
}
