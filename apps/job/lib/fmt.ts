// Shared by the static pages, the browser and the Worker: labels, links and the place shape.
// 내근처 일자리(A안, 11/2 사용자): 채용 공고는 싣지 않는다 — 직업안정법 제23조 직업정보제공사업 신고 전이라
// '일자리 찾을 때 가는 곳'(고용센터·직업소개소·새일센터·노인일자리 기관·대학일자리센터)만. reports/job-설계안-2026-11-02.md A장.
export const SITE='https://job.guidejung.com';
export const BRAND='내근처 일자리';
export const TAGLINE='일자리 찾을 때 가는 곳';
export const ADS=true;

export type Kind='center'|'agency'|'free'|'women'|'senior'|'campus';
/** region: weather 시군구 코드(일반구는 시 코드). center: juris(관할 지역 코드)·juris_text(관할구역 원문)·org(청·지청).
 * agency: sub(이름으로 나눈 종류)·corp(개인/법인)·since(등록 연도). campus: org(관할 고용센터 이름). */
export type Place={id:string;kind:Kind;name:string;addr:string|null;jibun?:string|null;lat:number|null;lon:number|null;region:string;region_name:string;
  org?:string|null;tel?:string|null;juris?:string[];juris_text?:string|null;sub?:Sub|null;corp?:string|null;since?:string|null};
export type Sub='care'|'home'|'labor'|'search'|'foreign';
export const SUBS:Record<Sub,string>={labor:'인력·건설',care:'간병·요양',home:'가사·산후·돌봄',search:'헤드헌팅',foreign:'외국인·해외'};
export const KINDS:Record<Kind,{label:string;icon:string;title:string;desc:string;ld:string;src:string}>={
  center:{label:'고용센터',icon:'🏛️',title:'고용복지플러스센터',desc:'실업급여·국민취업지원제도 신청과 구직 상담을 하는 고용노동부 센터',ld:'GovernmentOffice',src:'고용노동부 고용복지플러스센터 현황'},
  agency:{label:'직업소개소',icon:'🔨',title:'유료직업소개소(인력사무소)',desc:'인력·건설 일용직, 간병, 가사·산후 도우미 등을 소개하는 지자체 등록 업소',ld:'EmploymentAgency',src:'행정안전부 유료직업소개소 조회서비스(지자체 인허가 정보)'},
  free:{label:'무료 소개소',icon:'🤝',title:'무료직업소개소',desc:'지자체·공공기관·단체가 수수료 없이 운영하는 직업소개소',ld:'EmploymentAgency',src:'행정안전부 무료직업소개소 조회서비스(지자체 인허가 정보)'},
  women:{label:'새일센터',icon:'👩',title:'여성새로일하기센터',desc:'경력이 끊긴 여성의 구직 상담·직업교육·인턴을 하는 센터',ld:'GovernmentOffice',src:'성평등가족부 여성새로일하기센터 현황'},
  senior:{label:'노인일자리',icon:'👴',title:'노인일자리 수행기관',desc:'시니어클럽·노인복지관 등 노인일자리 사업을 하는 기관',ld:'LocalBusiness',src:'한국노인인력개발원 자립형일자리 수행기관 정보'},
  campus:{label:'대학일자리센터',icon:'🎓',title:'대학일자리플러스센터',desc:'대학 안에서 진로·취업 상담을 하는 고용노동부 지원 센터',ld:'GovernmentOffice',src:'고용노동부 대학일자리플러스센터 운영 현황'},
};
export const KIND_ORDER:Kind[]=['center','agency','free','women','senior','campus'];
export const n=(v:number)=>v.toLocaleString('ko-KR');
export const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export const placePath=(id:string)=>`/place/${id}`;
export const km=(v:number)=>v<1?`${Math.round(v*1000)}m`:`${v.toFixed(1)}km`;
const jong=(w:string)=>{const t=w.trim().replace(/\s*\([^()]*\)$/,''),c=(t[t.length-1]??'').charCodeAt(0)-0xac00;return c>=0&&c<11172&&c%28!==0;};
export const eun=(w:string)=>w+(jong(w)?'은':'는');
export const ga=(w:string)=>w+(jong(w)?'이':'가');
export const eul=(w:string)=>w+(jong(w)?'을':'를');
type Loc={name:string;lat?:number|null;lon?:number|null;addr?:string|null;jibun?:string|null};
export const mapUrl=(p:Loc)=>p.lat!=null?`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lon}`:`https://map.kakao.com/?q=${encodeURIComponent(p.addr??p.jibun??p.name)}`;
export const naverUrl=(p:Loc)=>`https://map.naver.com/p/search/${encodeURIComponent(`${p.name} ${(p.addr??p.jibun??'').split(' ').slice(1,3).join(' ')}`.trim())}`;
export const telHref=(t:string)=>`tel:${t.replace(/[^0-9~-]/g,'').split('~')[0].replace(/-/g,'')}`;
export const distKm=(aLat:number,aLon:number,bLat:number,bLon:number)=>{const r=Math.PI/180,dLat=(bLat-aLat)*r,dLon=(bLon-aLon)*r;const h=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(h));};
export const unit=(k:Kind)=>k==='agency'||k==='free'?'곳':'곳';
/** 카드 아래 작은 꼬리표 */
export const tagsOf=(p:Pick<Place,'kind'|'sub'|'corp'|'since'|'org'>)=>[p.kind==='agency'&&p.sub?SUBS[p.sub]:null,p.kind==='center'&&p.org?`${p.org}${/청$/.test(p.org)?'':' 지청'}`.replace(/청 지청$/,'청'):null,
  (p.kind==='agency'||p.kind==='free')&&p.corp?p.corp:null].filter((x):x is string=>!!x);

/** 브라우저로 보내는 가벼운 카드 */
export const slim=(p:Place)=>({id:p.id,kind:p.kind,name:p.name,addr:p.addr??p.jibun??null,lat:p.lat,lon:p.lon,tel:p.tel??null,tags:tagsOf(p),region_name:p.region_name});
export type Slim=ReturnType<typeof slim>&{km?:number};
export const COND_MIN=3;

// 공식 안내(링크만 — 숫자·조건은 적지 않음)
export const LINKS={work24:'https://www.work24.go.kr',senior:'https://www.seniorro.or.kr',saeil:'https://saeil.mogef.go.kr',moel:'https://www.moel.go.kr'};
