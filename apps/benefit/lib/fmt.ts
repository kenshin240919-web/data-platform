// Shared by the static pages and the browser: labels, links and the data shape (apps/benefit/data/benefits.json,
// scripts/collect-benefit.py — 행정안전부 「대한민국 공공서비스(혜택) 정보」).
export const SITE='https://benefit.guidejung.com';
export const BRAND='내근처 혜택';
export const TAGLINE='우리 동네 지원금, 놓친 거 없어?';

export type Field='living'|'house'|'birth'|'edu'|'job'|'health'|'care'|'culture'|'farm'|'safety';
/** 서비스분야(수집기 FIELDS와 같은 slug) */
export const FIELDS:Record<Field,{label:string;icon:string;q:string}>={
  birth:{label:'임신·출산',icon:'🤰',q:'출산지원금·산후조리·난임'},
  edu:{label:'보육·교육',icon:'🎒',q:'보육료·장학금·입학'},
  living:{label:'생활안정',icon:'💰',q:'생계·감면·바우처'},
  house:{label:'주거·자립',icon:'🏠',q:'월세·전세 이자·집수리'},
  job:{label:'고용·창업',icon:'💼',q:'일자리·창업·소상공인'},
  health:{label:'보건·의료',icon:'🏥',q:'검진·예방접종·의료비'},
  care:{label:'보호·돌봄',icon:'🤝',q:'어르신·장애·돌봄'},
  culture:{label:'문화·환경',icon:'🎭',q:'문화누리·체육·환경'},
  farm:{label:'농림축산어업',icon:'🌾',q:'농어업인 지원'},
  safety:{label:'행정·안전',icon:'🛡️',q:'안전·보훈·행정'},
};
export const FIELD_ORDER:Field[]=['birth','edu','living','house','job','health','care','culture','farm','safety'];

/** 지원조건 코드(수집기 CODES와 같은 순서). mask의 비트가 1이면 '그 사람은 못 받음'(원본 N). */
export const CODES=['JA0201','JA0202','JA0203','JA0204','JA0205',
  'JA0301','JA0302','JA0303','JA0313','JA0314','JA0315','JA0316','JA0317','JA0318','JA0319','JA0320',
  'JA0322','JA0326','JA0327','JA0328','JA0329','JA0330',
  'JA0401','JA0402','JA0403','JA0404','JA0410','JA0411','JA0412','JA0413','JA0414',
  'JA1101','JA1102','JA1103'] as const;
export type Code=typeof CODES[number];
export const CODE_LABEL:Record<Code,string>={JA0201:'중위소득 50% 이하',JA0202:'중위소득 51~75%',JA0203:'중위소득 76~100%',JA0204:'중위소득 101~200%',JA0205:'중위소득 200% 초과',
  JA0301:'예비부모·난임',JA0302:'임산부',JA0303:'출산·입양',JA0313:'농업인',JA0314:'어업인',JA0315:'축산업인',JA0316:'임업인',JA0317:'초등학생',JA0318:'중학생',JA0319:'고등학생',JA0320:'대학생·대학원생',
  JA0322:'해당 없음(일반)',JA0326:'직장인',JA0327:'구직자·실업자',JA0328:'장애인',JA0329:'국가보훈대상자',JA0330:'질병·질환자',
  JA0401:'다문화가족',JA0402:'북한이탈주민',JA0403:'한부모·조손가정',JA0404:'1인 가구',JA0410:'해당 없음(일반 가구)',JA0411:'다자녀 가구',JA0412:'무주택 세대',JA0413:'새로 전입',JA0414:'확대가족',
  JA1101:'예비 창업자',JA1102:'영업 중인 소상공인',JA1103:'생계 곤란·폐업 예정'};
export const INCOME:Code[]=['JA0201','JA0202','JA0203','JA0204','JA0205'];
export const LIFE:Code[]=['JA0301','JA0302','JA0303','JA0317','JA0318','JA0319','JA0320','JA0326','JA0327','JA0328','JA0329','JA0330','JA0313','JA0314','JA0315','JA0316'];
export const HOUSE:Code[]=['JA0411','JA0403','JA0404','JA0412','JA0413','JA0401','JA0402','JA0414'];
export const BIZ:Code[]=['JA1101','JA1102','JA1103'];
export const bit=(c:Code)=>CODES.indexOf(c);
/** 이 혜택이 그 코드의 사람에게 열려 있나(원본 Y) */
export const openTo=(mask:number,c:Code)=>Math.floor(mask/2**bit(c))%2===0;
/** 묶음 안에서 막힌 것이 있으면 열린 코드만(전부 열려 있으면 빈 목록 = 조건 없음) */
export const onlyFor=(mask:number,group:Code[],skip:Code[]=[])=>{const open=group.filter(c=>openTo(mask,c));return open.length===group.length?[]:open.filter(c=>!skip.includes(c));};

export type Scope='local'|'sido'|'nation';
export type Item={id:string;name:string;sum?:string;purpose?:string;org?:string;otype?:string;dept?:string;user?:string[];field:Field;kind?:string[];
  target?:string;crit?:string;content?:string;how?:string;howd?:string;deadline?:string;docs?:string;docs_off?:string;docs_self?:string;recv?:string;tel?:string;
  url?:string;apply?:string;law?:string;ordin?:string;rule?:string;views?:number;reg?:string;mod?:string;scope:Scope;sido?:string;region?:string;region_name?:string;
  age?:[number|null,number|null];mask:number;amount?:number;due?:string;due_exact?:boolean;doclinks?:string[];key?:string};
export type Data={status:{updated_at:string;count:number;scope:Record<string,number>};items:Item[]};
/** 브라우저 맞춤 찾기·검색용 한 줄: [id, 이름, 범위 열쇠(시군구 코드|시도 이름|''), 분야, 금액, 마감일, 나이 시작, 나이 끝, mask, 대상(1 개인·2 가구·4 소상공인·8 법인), 조회수] */
export type Row=[string,string,string,Field,number,string,number,number,number,number,number];

export const n=(v:number)=>v.toLocaleString('ko-KR');
export const won=(v:number)=>v>=1e8?`${n(Math.round(v/1e7)/10)}억 원`:v>=1e4?`${n(Math.round(v/1e3)/10)}만 원`:`${n(v)}원`;
export const benefitPath=(id:string)=>`/b/${id}`;
export const DOC_TITLES:Record<string,string>={resident:'주민등록등본·초본',family:'가족관계증명서',basic:'기본증명서',marriage:'혼인관계증명서',income:'소득금액증명','health-premium':'건강보험료 납부확인서',
  health:'건강보험 자격득실 확인서',business:'사업자등록증명','national-tax':'국세 납세증명서',tax:'지방세 납세증명서',building:'건축물대장',registry:'등기사항증명서',school:'재학·졸업증명서',
  welfare:'장애인·한부모·수급자 증명서',veteran:'보훈·국가유공자 확인서',employment:'고용보험 자격이력',pension:'국민연금 가입증명',car:'자동차등록원부',driving:'운전경력증명서'};
export const docUrl=(slug:string)=>`https://minwon.guidejung.com/doc/${slug}`;
const jong=(w:string)=>{const t=w.trim().replace(/\([^)]*\)$/,''),c=(t[t.length-1]??'').charCodeAt(0)-0xac00;return c>=0&&c<11172&&c%28!==0;};
export const eun=(w:string)=>w+(jong(w)?'은':'는');
export const ga=(w:string)=>w+(jong(w)?'이':'가');
export const eul=(w:string)=>w+(jong(w)?'을':'를');
export const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
/** 한국 날짜 YYYY-MM-DD */
export const kstToday=(t=Date.now())=>new Date(t+9*3600e3).toISOString().slice(0,10);
export const daysTo=(due:string,today=kstToday())=>Math.round((Date.parse(due)-Date.parse(today))/864e5);
export const dueLabel=(due:string,exact?:boolean,today=kstToday())=>{const d=daysTo(due,today);const md=`${+due.slice(5,7)}월 ${+due.slice(8,10)}일`;
  return d<0?`신청 기간 지남(${md})`:d===0?'오늘 마감':exact?`D-${d} · ${md}까지`:`${+due.slice(5,7)}월 중 마감`;};
export const ageLabel=(a?:[number|null,number|null])=>{if(!a)return null;const [s,e]=a;if((s??0)<=0&&(e==null||e>=100))return null;
  return s!=null&&e!=null&&e<100?`${s}~${e}세`:s!=null&&s>0?`${s}세 이상`:e!=null?`${e}세 이하`:null;};
export const userFlags=(u?:string[])=>(u??[]).reduce((a,x)=>a|(x==='개인'?1:x==='가구'?2:x==='소상공인'?4:8),0);
export const scopeLabel=(it:Pick<Item,'scope'|'sido'|'region_name'|'org'>)=>it.scope==='local'?it.region_name??it.org??'':it.scope==='sido'?`${it.sido} 전체`:'전국';
/** 맞춤 찾기 조건 */
export type Ask={region?:string;sido?:string;age?:number|null;inc?:number|null;life:Code[];house:Code[];biz?:Code|null};
export function matches(r:Row,q:Ask){
  const [, , key, , , , a0, a1, mask, who]=r;
  if(key&&key!==q.region&&key!==q.sido)return false;
  if(q.biz){if(!(who&4)||!openTo(mask,q.biz))return false;}
  else{if(!(who&3))return false;
    if(q.age!=null&&((a0>=0&&q.age<a0)||(a1>=0&&q.age>a1)))return false;
    if(q.inc!=null&&!openTo(mask,INCOME[q.inc]))return false;
    const life=q.life.length?q.life:['JA0322' as Code];if(!life.some(c=>openTo(mask,c)))return false;
    const house=q.house.length?q.house:['JA0410' as Code];if(!house.some(c=>openTo(mask,c)))return false;}
  return true;
}
