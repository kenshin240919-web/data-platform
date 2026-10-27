// Shared by the static pages and the Worker (no imports): labels, money and the card shape.
export const SITE='https://academy.guidejung.com';
export const BRAND='내근처 학원';
export const SUBJECTS:Record<string,string>={math:'수학',english:'영어',korean:'국어',science:'과학',social:'사회',essay:'논술·독서',coding:'코딩·컴퓨터',foreign:'제2외국어',
  music:'음악',art:'미술',dance:'무용·댄스',baduk:'바둑',study:'독서실',general:'보습·입시 종합',job:'자격증·직업'};
export const SUBJECT_ICON:Record<string,string>={math:'➗',english:'🔤',korean:'📖',science:'🔬',social:'🌏',essay:'✍️',coding:'💻',foreign:'🈶',music:'🎹',art:'🎨',dance:'💃',baduk:'⚫',study:'📚',general:'🏫',job:'🛠️'};
// 첫 화면 과목 버튼(학부모가 가장 많이 찾는 순).
export const MAIN_SUBJECTS=['math','english','korean','science','essay','coding','music','art','dance'];
export const GRADES:Record<string,string>={kinder:'유아',elem:'초등',middle:'중등',high:'고등',adult:'성인'};
// 카드·통계에 쓰는 수강료 범위(scripts/collect-academy.py FEE_OK와 같게).
export const FEE_MIN=30000,FEE_MAX=3000000;
export type Card={id:string;name:string;type:string|null;region_id?:string;region_name?:string;subjects:string[];grades:string[];fee_min:number|null;fee_max:number|null;address:string|null;lat:number|null;lon:number|null;established?:string|null;km?:number};
export type FeeStats={n:number;min:number;p25?:number;median:number;p75?:number;max:number}|null;

export const n=(v:number)=>v.toLocaleString('ko-KR');
/** 268000 → "26.8만 원", 1000000 → "100만 원" */
export const man=(won:number)=>{const m=won/10000;return `${Number.isInteger(m)?n(m):m.toFixed(1)}만 원`;};
export const won=(v:number)=>`${n(v)}원`;
export const feeRange=(c:{fee_min:number|null;fee_max:number|null})=>c.fee_min==null?null:c.fee_min===c.fee_max?man(c.fee_min):`${man(c.fee_min)}~${man(c.fee_max!)}`;
export const ymd=(s?:string|null)=>s&&/^\d{8}$/.test(s)?`${s.slice(0,4)}.${s.slice(4,6)}.${s.slice(6,8)}`:null;
export const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export const subjectLabel=(k:string)=>SUBJECTS[k]??k;
export const academyPath=(id:string)=>`/academy/${id}`;
/** 은/는 (same rule as @guidejung/ui/seo eun; digits read in Korean: 0·1·3·6·7·8 end in a consonant). */
export const eun=(w:string)=>{const t=w.trim(),last=t[t.length-1]??'';const c=last.charCodeAt(0)-0xac00;
  const batchim=c>=0&&c<11172?c%28!==0:/[013678]/.test(last)?true:/[A-Za-z]/.test(last)?/[lmnr]$/i.test(last):false;return w+(batchim?'은':'는');};
