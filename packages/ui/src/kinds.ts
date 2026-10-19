// Plain .ts (no JSX) so rss.ts and the Node checks can use it.
/** Kind → list URL, label, card tag and symbol. Detail URL: /{kind}/{id}. */
export const KIND:Record<string,{label:string;tag:string;icon:string;list:string}>={place:{label:'가볼만한곳',tag:'PLACE',icon:'⌖',list:'/place'},festival:{label:'축제·행사',tag:'FESTIVAL',icon:'✳',list:'/festival'},food:{label:'맛집',tag:'FOOD',icon:'🍽',list:'/food'},stay:{label:'숙소',tag:'STAY',icon:'🛏',list:'/stay'},course:{label:'여행코스',tag:'COURSE',icon:'🧭',list:'/course'},shop:{label:'쇼핑',tag:'SHOP',icon:'🛍',list:'/shop'}};
/** Every kind (URL segment); lists and menus for food·stay·course·shop appear only once the data has them. */
export const KINDS=Object.keys(KIND);
export const EXTRA_KINDS=KINDS.filter(k=>k!=='place'&&k!=='festival');
export const kindOf=(k:string)=>KIND[k]??KIND.place;
export function detailPath(p:{kind:string;id:string}){return `/${KIND[p.kind]?p.kind:'place'}/${p.id}`;}

// Hide a photo (its <figure>) whose image fails to load instead of showing a broken icon. Runs in <head> so it
// also catches errors of images in the first HTML; hiding (not removing) keeps React's DOM intact.
export const IMAGE_FALLBACK="document.addEventListener('error',function(e){var t=e.target;if(t&&t.tagName==='IMG'){var f=t.closest('figure')||t;f.style.display='none';var c=t.closest('.place-card');if(c)c.classList.add('no-photo')}},true);";

