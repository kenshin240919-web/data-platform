// Plain .ts (no JSX) so rss.ts and the Node checks can use it.
/** Kind → list URL, label, card tag and symbol. Detail URL: /{kind}/{id}. */
export const KIND:Record<string,{label:string;tag:string;icon:string;list:string}>={place:{label:'가볼만한곳',tag:'PLACE',icon:'⌖',list:'/place'},festival:{label:'축제·행사',tag:'FESTIVAL',icon:'✳',list:'/festival'},food:{label:'맛집',tag:'FOOD',icon:'🍽',list:'/food'},stay:{label:'숙소',tag:'STAY',icon:'🛏',list:'/stay'}};
export const kindOf=(k:string)=>KIND[k]??KIND.place;
export function detailPath(p:{kind:string;id:string}){return `/${KIND[p.kind]?p.kind:'place'}/${p.id}`;}
