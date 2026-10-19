// SEO·GEO·AEO helpers shared by every site: schema.org JSON-LD and a visible Q&A block.
// Answer engines (Google AI Overviews, ChatGPT, Perplexity …) quote short, factual question–answer text
// that is in the static HTML, so every Faq is rendered on the page and mirrored as FAQPage JSON-LD.
type Site={url:string;brand:string;tagline:string;description:string;search?:string};

export function JsonLd({data}:{data:object|object[]}){
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,'\\u003c')}}/>;
}
/** WebSite + Organization for the layout of each site (search: URL with {q} for the site search box). */
export function siteLd(s:Site){
  const org={'@type':'Organization','@id':'https://guidejung.com/#org',name:'GuideJung',url:'https://guidejung.com'};
  return {'@context':'https://schema.org','@graph':[org,{'@type':'WebSite','@id':s.url+'/#website',url:s.url+'/',name:s.brand,alternateName:`${s.brand} - ${s.tagline}`,description:s.description,inLanguage:'ko-KR',publisher:{'@id':org['@id']},
    ...(s.search?{potentialAction:{'@type':'SearchAction',target:{'@type':'EntryPoint',urlTemplate:s.search.replace('{q}','{search_term_string}')},'query-input':'required name=search_term_string'}}:{})}]};
}
/** items: [name, absolute url] from the home page down to the current page. */
export function breadcrumbLd(items:[string,string][]){
  return {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))};
}
export type QA=[question:string,answer:string];
export function faqLd(items:QA[]){
  return {'@context':'https://schema.org','@type':'FAQPage',mainEntity:items.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))};
}
/** Visible "자주 묻는 질문" + FAQPage JSON-LD. Answers are plain sentences built from the page's own data. */
export function Faq({items,title='자주 묻는 질문'}:{items:QA[];title?:string}){
  const qa=items.filter(([,a])=>a);if(!qa.length)return null;
  return <section className="gj-faq" aria-label={title}><h2>{title}</h2><dl>{qa.map(([q,a])=><div key={q}><dt>{q}</dt><dd>{a}</dd></div>)}</dl><JsonLd data={faqLd(qa)}/></section>;
}
/** Korean topic particle: 은 after a final consonant, else 는 (non-Hangul endings count as 는). */
export function eun(word:string){const c=word.trim().charCodeAt(word.trim().length-1)-0xac00;return word+(c>=0&&c<11172&&c%28?'은':'는');}
/** Korean subject particle: 이 after a final consonant, else 가. */
export function ga(word:string){const c=word.trim().charCodeAt(word.trim().length-1)-0xac00;return word+(c>=0&&c<11172&&c%28?'이':'가');}
