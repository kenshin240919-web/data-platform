// Shared by the static pages, the browser and the Worker: labels, links and the data shape (apps/market/data/market.json,
// scripts/collect-market.py). 가게 주소는 원본에 없어 위치는 소속 시장·상점가 단위(가게 위치는 상세에서 카카오로 방문 때마다 찾음).
export const SITE='https://market.guidejung.com';
export const BRAND='내근처 시장';
export const TAGLINE='온누리 어디서 써?';

export type Cat='food'|'cafe'|'meat'|'fish'|'fruit'|'side'|'mart'|'cloth'|'beauty'|'health'|'home'|'edu'|'leisure'|'flower'|'etc';
/** 품목 묶음(수집기 CATS와 같은 slug). q: 검색에 많이 쓰는 말(제목·설명용). */
export const CATS:Record<Cat,{label:string;icon:string;q:string}>={
  food:{label:'음식점',icon:'🍲',q:'식당·한식·치킨·분식'},
  cafe:{label:'카페·빵·간식',icon:'☕',q:'카페·빵집·간식'},
  meat:{label:'정육·계란',icon:'🥩',q:'정육점·닭·계란'},
  fish:{label:'수산·건어물',icon:'🐟',q:'생선·건어물·젓갈'},
  fruit:{label:'과일·채소',icon:'🍎',q:'과일가게·야채·쌀'},
  side:{label:'반찬·떡',icon:'🍱',q:'반찬가게·떡집·방앗간'},
  mart:{label:'식료품·마트',icon:'🛒',q:'마트·슈퍼·식료품'},
  cloth:{label:'옷·신발·잡화',icon:'👕',q:'옷가게·신발·가방'},
  beauty:{label:'미용·화장품',icon:'💇',q:'미용실·네일·화장품'},
  health:{label:'약국·안경·병원',icon:'💊',q:'약국·안경점·한의원'},
  home:{label:'생활·철물·가전',icon:'🧰',q:'철물점·그릇·생활용품'},
  edu:{label:'학원·운동·서점',icon:'📚',q:'학원·태권도·서점'},
  leisure:{label:'여가·숙박',icon:'🎳',q:'노래방·당구장·숙박'},
  flower:{label:'꽃·원예',icon:'💐',q:'꽃집·화원'},
  etc:{label:'기타',icon:'🏪',q:'그 밖의 가게'},
};
export const CAT_ORDER:Cat[]=['food','cafe','meat','fish','fruit','side','mart','cloth','beauty','health','home','edu','leisure','flower','etc'];
/** 시도 짧은 이름(weather 지역표 sidoShort) → 주소용 slug. 2026 전남·광주 통합은 '전남광주' 하나. */
export const SIDOS:[string,string,string][]=[['서울','seoul','서울특별시'],['부산','busan','부산광역시'],['대구','daegu','대구광역시'],['인천','incheon','인천광역시'],
  ['대전','daejeon','대전광역시'],['울산','ulsan','울산광역시'],['세종','sejong','세종특별자치시'],['경기','gyeonggi','경기도'],['강원','gangwon','강원특별자치도'],
  ['충북','chungbuk','충청북도'],['충남','chungnam','충청남도'],['전북','jeonbuk','전북특별자치도'],['전남광주','jeonnam-gwangju','전남·광주'],
  ['경북','gyeongbuk','경상북도'],['경남','gyeongnam','경상남도'],['제주','jeju','제주특별자치도']];
export const sidoSlug=(s:string)=>SIDOS.find(x=>x[0]===s)?.[1]??'etc';
export const sidoFull=(s:string)=>SIDOS.find(x=>x[0]===s)?.[2]??s;

export type Std={mtype?:string;cycle?:string;stores?:string;goods?:string;toilet?:boolean;parking?:boolean;year?:string;tel?:string};
/** 시장·상점가. geo: std(전통시장 표준데이터 좌표)·kakao(카카오 검색)·area(이름 속 시군구 중심 — 내 주변 검색엔 안 씀). */
export type Market={id:string;name:string;sido:string;addr?:string;jibun?:string;lat?:number;lon?:number;geo?:'std'|'kakao'|'area';region?:string;region_name?:string;
  std?:Std;n:number;d:number;new:number;cats:Partial<Record<Cat,number>>};
/** 가맹점 한 줄: [id, 이름, 시장 번호, 품목 묶음, 취급품목 원문, 디지털 가맹(1/0), 가맹 등록년도] — 모두 지류형 가맹. */
export type StoreRow=[string,string,number,Cat,string|null,0|1,number|null];
export type Status={updated_at:string;base:string|null;count:number;markets:number;latest_year:number|null;digital:number;located:number;std:boolean;cats:Partial<Record<Cat,number>>};
export type Data={status:Status;markets:Market[];stores:StoreRow[]};

export const n=(v:number)=>v.toLocaleString('ko-KR');
export const pct=(a:number,b:number)=>b?Math.round(a/b*100):0;
export const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export const marketPath=(id:string)=>`/market/${id}`;
export const storePath=(id:string)=>`/store/${id}`;
export const located=(m:Pick<Market,'geo'>)=>m.geo==='std'||m.geo==='kakao';
export const km=(v:number)=>v<1?`${Math.round(v*1000)}m`:`${v.toFixed(1)}km`;
export const distKm=(aLat:number,aLon:number,bLat:number,bLon:number)=>{const r=Math.PI/180,dLat=(bLat-aLat)*r,dLon=(bLon-aLon)*r;const h=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(h));};
export const mapUrl=(p:{name:string;lat?:number|null;lon?:number|null;addr?:string|null})=>p.lat!=null&&p.lon!=null?`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lon}`:`https://map.kakao.com/?q=${encodeURIComponent(p.addr??p.name)}`;
export const telHref=(t:string)=>`tel:${t.replace(/[^0-9]/g,'')}`;
const jong=(w:string)=>{const t=w.trim(),c=(t[t.length-1]??'').charCodeAt(0)-0xac00;return c>=0&&c<11172&&c%28!==0;};
export const eun=(w:string)=>w+(jong(w)?'은':'는');
export const ga=(w:string)=>w+(jong(w)?'이':'가');
export const eul=(w:string)=>w+(jong(w)?'을':'를');
/** 시장 이름 뒤 '시장'이 없으면(상점가·상권구역) 그대로. 화면에서 '○○ 온누리상품권 사용처' */
export const isMarket=(m:Pick<Market,'name'|'std'>)=>!!m.std||/시장|장터|장$/.test(m.name);
export const topCats=(cats:Partial<Record<Cat,number>>,k=3)=>CAT_ORDER.filter(c=>c!=='etc'&&(cats[c]??0)>0).sort((a,b)=>(cats[b]??0)-(cats[a]??0)).slice(0,k);
/** 브라우저로 보내는 가벼운 시장 카드 */
export const slimMarket=(m:Market)=>({id:m.id,name:m.name,region_name:m.region_name??m.sido,lat:m.lat??null,lon:m.lon??null,n:m.n,d:m.d,top:topCats(m.cats)});
export type SlimMarket=ReturnType<typeof slimMarket>&{km?:number;hit?:number};
export type SlimStore={id:string;name:string;cat:Cat;item:string|null;d:0|1;market:string;mid:string;lat?:number|null;lon?:number|null;km?:number};
export const updatedLabel=(iso:string)=>{const d=new Date(iso);return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;};
export const baseLabel=(b:string|null)=>b?`${+b.slice(0,4)}년 ${+b.slice(5,7)}월 ${+b.slice(8,10)}일`:'최신';
export const CAT_MIN=10;  // 지역×품목 페이지는 가맹점이 이만큼 있을 때만
