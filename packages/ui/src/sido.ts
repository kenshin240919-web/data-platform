// 시도 표시 순서(행정 관례: 특별·광역시 먼저, 이어서 도). 지역 목록·고르기 상자는 이 순서 + 시도 안에서는 가나다순.
export const SIDO_ORDER=['서울특별시','부산광역시','대구광역시','인천광역시','광주광역시','전남광주통합특별시','대전광역시','울산광역시','세종특별자치시',
  '경기도','강원특별자치도','충청북도','충청남도','전북특별자치도','전라남도','경상북도','경상남도','제주특별자치도'];
export const sidoOf=(name:string)=>name.split(' ')[0];
const rank=(s:string)=>{const i=SIDO_ORDER.indexOf(s);return i<0?SIDO_ORDER.length:i;};
/** Regions grouped by 시도 in SIDO_ORDER; inside a 시도 by name (가나다). label: name without the 시도. */
export function groupBySido<T extends {name:string}>(items:T[]){
  const groups=new Map<string,T[]>();
  for(const r of items){const s=sidoOf(r.name);groups.set(s,[...(groups.get(s)??[]),r]);}
  return [...groups.entries()].sort((a,b)=>rank(a[0])-rank(b[0])||a[0].localeCompare(b[0],'ko'))
    .map(([sido,list])=>({sido,list:[...list].sort((a,b)=>a.name.localeCompare(b.name,'ko')).map(r=>({...r,label:r.name.slice(sido.length).trim()||r.name}))}));
}
