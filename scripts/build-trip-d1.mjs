// Load the published trip dataset into D1 (guidejung-trip) for the trip Worker.
// Usage: node scripts/build-trip-d1.mjs [data.json] [--remote | --local] [--if-newer] [--upsert manifest.json]
//   data.json: full export from services/api (default runtime/trip-full.json, else apps/trip/data/trip.json).
//   Writes runtime/d1/trip-*.sql; --remote / --local also runs them with wrangler (remote needs `npx wrangler login` once).
// Rows go to places_next / regions_next and are swapped in by the last file, so the site never shows a half load.
//   --upsert manifest.json (GitHub Actions, services/api/app/trip_auto.py): when D1 still holds the version in the manifest,
//   send only new/changed/removed rows (D1 bills rows written; a full reload of 100k places every run would not fit),
//   otherwise a full load; the manifest is rewritten after a successful load.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
// Windows runs npx through cmd.exe, which splits unquoted arguments at spaces (the repo folder can be "data platform"):
// quote every argument there; elsewhere pass them as they are.
const wrangler=(args,opts={})=>process.platform==='win32'
  ?execFileSync(['npx','wrangler',...args].map(a=>/[\s"&|<>^]/.test(a)?`"${a.replace(/"/g,'""')}"`:a).join(' '),[],{cwd:ROOT,shell:true,...opts})
  :execFileSync('npx',['wrangler',...args],{cwd:ROOT,...opts});
// Files are passed relative to the repo (no spaces, no drive letter).
const rel=f=>relative(ROOT,f).split(sep).join('/');
const args=process.argv.slice(2);
const manifestPath=args.includes('--upsert')?args[args.indexOf('--upsert')+1]:null;
// Default: the computer's full export if there is one, else the git file (full until the first new-style export).
const input=args.find(a=>!a.startsWith('--')&&a!==manifestPath)??[join(ROOT,'runtime/trip-full.json'),join(ROOT,'apps/trip/data/trip.json')].find(f=>existsSync(f));
const mode=args.includes('--remote')?'--remote':args.includes('--local')?'--local':null;
// About 4MB of SQL per upload. 2,000 rows (~15MB) sometimes ended with wrangler "Not currently importing anything" on every retry (10/19).
const ROWS_PER_FILE=500;

const data=JSON.parse(readFileSync(input,'utf8'));
// The git build file (subset: true) only has card fields; loading it would replace the full set with a stub.
if(data.subset){console.log(`${input} is the small build file; D1 is loaded from the full export (GitHub Actions trip-collect).`);process.exit(0);}
const items=data.items??[];
if(!items.length)throw new Error(`no items in ${input}`);
const s=v=>v===null||v===undefined?'NULL':typeof v==='number'?(Number.isFinite(v)?String(v):'NULL'):`'${String(v).replace(/'/g,"''")}'`;
const flag=v=>v===true?1:'NULL';
// Same as listRank in packages/ui/src/search.ts: quality first, then photo · introduction length, "(구)…" names last.
const listRank=p=>[...String(p.id)].reduce((h,c)=>(h+c.charCodeAt(0))%97,0)/100+(p.quality_score??0)*100+(p.images?.length?40:0)+Math.min(Math.floor((p.description??'').length/20),40)-(String(p.name).startsWith('(')?30:0);
// Same slim fields the browser search index used.
const CARD=['id','name','kind','address','region_id','region_name','description','latitude','longitude','conditions','start_date','end_date','event_status','quality_score','is_demo','verified_at'];
const card=p=>{const c=Object.fromEntries(CARD.map(k=>[k,p[k]]));c.images=p.images?.slice(0,1);return JSON.stringify(c);};
// Same rule as packages/ui/src/rss.ts: the source's modifiedtime (KST), else the export time.
const changed=p=>{const m=String(p.source_modified_at||'').match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);const d=m?new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+09:00`):new Date(p.updated_at);return isNaN(+d)?null:d.toISOString();};
const text=p=>[p.name,p.address,p.region_name,p.description].join(' ').toLowerCase();

const schema=readFileSync(join(ROOT,'apps/trip/worker/schema.sql'),'utf8');
// Staging tables use the schema's own definitions (keys and types kept), renamed to *_next.
const table=name=>{const m=schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${name} \\([\\s\\S]*?\\);`));if(!m)throw new Error(`schema: ${name}`);return m[0].replace(`IF NOT EXISTS ${name} (`,`${name}_next (`);};
// Only the tables first (an index on a new column would fail on the old live table); indexes are made after the swap.
const tables=(schema.match(/CREATE TABLE IF NOT EXISTS [\s\S]*?\);/g)??[]).join('\n');
const head=`${tables}
DROP TABLE IF EXISTS places_next;
${table('places')}
DROP TABLE IF EXISTS regions_next;
${table('regions')}
`;
// OR REPLACE: a file re-sent after a network failure must not stop on rows it already wrote.
const insert=(p,into='INSERT OR REPLACE INTO places_next')=>`${into} (id,kind,name,region_id,lat,lon,start_date,end_date,quality,free,kids,pet,indoor,text,card,body,updated,indexable,changed) VALUES (${[
  s(p.id),s(p.kind),s(p.name),s(p.region_id),s(p.latitude),s(p.longitude),s(p.start_date||null),s(p.end_date||null),s(listRank(p)),
  flag(p.conditions?.free),flag(p.conditions?.kids),flag(p.conditions?.pet),flag(p.conditions?.indoor),s(text(p)),s(card(p)),s(JSON.stringify(p)),s(p.updated_at),p.indexable&&!p.is_demo?1:'NULL',s(changed(p))].join(',')});`;
// Bump SCHEMA when the table layout or a stored value rule changes (3: quality = listRank) so unchanged data is sent again.
const SCHEMA=3;
const version=`${data.status?.updated_at??new Date().toISOString()}#s${SCHEMA}`;
const tail=`${(data.regions??[]).map(r=>`INSERT INTO regions_next (id,name,code,count) VALUES (${s(r.id)},${s(r.name)},${s(r.code)},${s(r.count??0)});`).join('\n')}
DROP TABLE places;
ALTER TABLE places_next RENAME TO places;
DROP TABLE regions;
ALTER TABLE regions_next RENAME TO regions;
CREATE INDEX IF NOT EXISTS places_kind_quality ON places(kind, quality DESC, name);
CREATE INDEX IF NOT EXISTS places_region ON places(region_id, quality DESC);
CREATE INDEX IF NOT EXISTS places_lat ON places(lat);
CREATE INDEX IF NOT EXISTS places_dates ON places(start_date, end_date);
CREATE INDEX IF NOT EXISTS places_changed ON places(indexable, changed DESC);
INSERT OR REPLACE INTO meta (key,value) VALUES ('status',${s(JSON.stringify(data.status??null))});
INSERT OR REPLACE INTO meta (key,value) VALUES ('version',${s(JSON.stringify(version))});
`;

const out=join(ROOT,'runtime/d1');rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
const files=[];
const write=(sql)=>{const name=join(out,`trip-${String(files.length+1).padStart(3,'0')}.sql`);writeFileSync(name,sql);files.push(name);};
const hash=p=>createHash('sha1').update(insert(p,'INSERT INTO places_next')).digest('hex');  // fixed text: manifests stay valid
const remote=()=>{const res=JSON.parse(wrangler(['d1','execute','guidejung-trip',mode,'--json','--command',"SELECT (SELECT value FROM meta WHERE key='version') AS version, (SELECT COUNT(*) FROM places) AS n"],{encoding:'utf8'}));return res?.[0]?.results?.[0]??{};};
// Each file is safe to send twice (OR REPLACE, version written last), so a dropped connection is retried.
const run=()=>{for(const f of files)for(let n=1;;n++){console.log(`wrangler d1 execute ${mode} ${rel(f)}${n>1?` (retry ${n})`:''}`);
  try{wrangler(['d1','execute','guidejung-trip',mode,'--file',rel(f),'-y'],{stdio:'inherit'});break;}
  catch(e){if(n>=4)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,30000*n);}}};
const saveManifest=()=>{if(manifestPath)writeFileSync(manifestPath,JSON.stringify({version,hashes:Object.fromEntries(items.map(p=>[p.id,hash(p)]))}));};

if(manifestPath&&mode){
  let row={};try{row=remote();}catch(e){console.log('D1 not initialised yet (first load)');}
  // Never let a smaller file replace a bigger D1 (a wrong or empty input).
  if(Number(row.n)>items.length*1.1){console.log(`D1 has ${row.n} places, the file only ${items.length}: not loading.`);process.exit(1);}
  const manifest=existsSync(manifestPath)?JSON.parse(readFileSync(manifestPath,'utf8')):null;
  if(manifest&&row.version===JSON.stringify(manifest.version)){
    if(manifest.version===version){console.log(`D1 already holds ${version}`);process.exit(0);}
    const changed=items.filter(p=>manifest.hashes[p.id]!==hash(p)),ids=new Set(items.map(p=>p.id));
    const removed=Object.keys(manifest.hashes).filter(id=>!ids.has(id));
    for(let i=0;i<changed.length;i+=ROWS_PER_FILE)write((i===0?tables+'\n':'')+changed.slice(i,i+ROWS_PER_FILE).map(p=>insert(p,'INSERT OR REPLACE INTO places')).join('\n')+'\n');
    write(`${tables}
${removed.map(id=>`DELETE FROM places WHERE id=${s(id)};`).join('\n')}
DELETE FROM regions;
${(data.regions??[]).map(r=>`INSERT INTO regions (id,name,code,count) VALUES (${s(r.id)},${s(r.name)},${s(r.code)},${s(r.count??0)});`).join('\n')}
${tail.slice(tail.indexOf('CREATE INDEX'))}`);
    console.log(`D1 upsert: ${changed.length} changed, ${removed.length} removed (${items.length} places), version ${version}`);
    run();saveManifest();process.exit(0);
  }
}
for(let i=0;i<items.length;i+=ROWS_PER_FILE){
  const chunk=items.slice(i,i+ROWS_PER_FILE).map(p=>insert(p)).join('\n');
  write((i===0?head:'')+chunk+'\n'+(i+ROWS_PER_FILE>=items.length?tail:''));
}
console.log(`D1 SQL ${items.length}건 → ${files.length}개 파일 (${out}), version ${version}`);
// --if-newer: skip when D1 already holds this version or more places (e.g. the full set loaded from the computer,
// while git only carries the smaller build file). Used by the Cloudflare build so every push does not reload.
if(mode&&args.includes('--if-newer')){
  try{
    const row=remote();
    if(row.version===JSON.stringify(version)||Number(row.n)>items.length){console.log(`D1 skip: version ${row.version}, ${row.n} places`);process.exit(0);}
  }catch(e){console.log('D1 not initialised yet (first load)');}
}
if(mode){
  // A full load replaces everything: refuse a file clearly smaller than D1 (e.g. the computer's export after GitHub
  // Actions has collected more), unless --force.
  let row={};try{row=remote();}catch(e){}
  if(Number(row.n)>items.length*1.1&&!args.includes('--force')){console.log(`D1에 ${row.n}건이 있어 이 파일(${items.length}건)로 덮어쓰지 않습니다. 자동 수집(GitHub Actions)이 더 많이 모았을 수 있습니다. 의도한 경우 --force.`);process.exit(1);}
  run();saveManifest();
}
