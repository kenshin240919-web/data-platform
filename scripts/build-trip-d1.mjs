// Load the published trip dataset into D1 (guidejung-trip) for the trip Worker.
// Usage: node scripts/build-trip-d1.mjs [data.json] [--remote | --local] [--if-newer]
//   data.json: export from services/api (default apps/trip/data/trip.json: {status, regions, items}).
//   Writes runtime/d1/trip-*.sql; --remote / --local also runs them with wrangler (remote needs `npx wrangler login` once).
// Rows go to places_next / regions_next and are swapped in by the last file, so the site never shows a half load.
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const input=args.find(a=>!a.startsWith('--'))??join(ROOT,'apps/trip/data/trip.json');
const mode=args.includes('--remote')?'--remote':args.includes('--local')?'--local':null;
const ROWS_PER_FILE=4000;  // keeps each upload a manageable size

const data=JSON.parse(readFileSync(input,'utf8'));
const items=data.items??[];
if(!items.length)throw new Error(`no items in ${input}`);
const s=v=>v===null||v===undefined?'NULL':typeof v==='number'?(Number.isFinite(v)?String(v):'NULL'):`'${String(v).replace(/'/g,"''")}'`;
const flag=v=>v===true?1:'NULL';
// Same slim fields the browser search index used.
const CARD=['id','name','kind','address','region_id','region_name','description','latitude','longitude','conditions','start_date','end_date','event_status','quality_score','is_demo','verified_at'];
const card=p=>{const c=Object.fromEntries(CARD.map(k=>[k,p[k]]));c.images=p.images?.slice(0,1);return JSON.stringify(c);};
const text=p=>[p.name,p.address,p.region_name,p.description].join(' ').toLowerCase();

const schema=readFileSync(join(ROOT,'apps/trip/worker/schema.sql'),'utf8');
// Staging tables use the schema's own definitions (keys and types kept), renamed to *_next.
const table=name=>{const m=schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${name} \\([\\s\\S]*?\\);`));if(!m)throw new Error(`schema: ${name}`);return m[0].replace(`IF NOT EXISTS ${name} (`,`${name}_next (`);};
const head=`${schema}
DROP TABLE IF EXISTS places_next;
${table('places')}
DROP TABLE IF EXISTS regions_next;
${table('regions')}
`;
const insert=p=>`INSERT INTO places_next (id,kind,name,region_id,lat,lon,start_date,end_date,quality,free,kids,pet,indoor,text,card,body,updated) VALUES (${[
  s(p.id),s(p.kind),s(p.name),s(p.region_id),s(p.latitude),s(p.longitude),s(p.start_date||null),s(p.end_date||null),s(p.quality_score??0),
  flag(p.conditions?.free),flag(p.conditions?.kids),flag(p.conditions?.pet),flag(p.conditions?.indoor),s(text(p)),s(card(p)),s(JSON.stringify(p)),s(p.updated_at)].join(',')});`;
const version=String(data.status?.updated_at??new Date().toISOString());
const tail=`${(data.regions??[]).map(r=>`INSERT INTO regions_next (id,name,code,count) VALUES (${s(r.id)},${s(r.name)},${s(r.code)},${s(r.count??0)});`).join('\n')}
DROP TABLE places;
ALTER TABLE places_next RENAME TO places;
DROP TABLE regions;
ALTER TABLE regions_next RENAME TO regions;
CREATE INDEX IF NOT EXISTS places_kind_quality ON places(kind, quality DESC, name);
CREATE INDEX IF NOT EXISTS places_region ON places(region_id, quality DESC);
CREATE INDEX IF NOT EXISTS places_lat ON places(lat);
CREATE INDEX IF NOT EXISTS places_dates ON places(start_date, end_date);
INSERT OR REPLACE INTO meta (key,value) VALUES ('status',${s(JSON.stringify(data.status??null))});
INSERT OR REPLACE INTO meta (key,value) VALUES ('version',${s(JSON.stringify(version))});
`;

const out=join(ROOT,'runtime/d1');rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
const files=[];
for(let i=0;i<items.length;i+=ROWS_PER_FILE){
  const chunk=items.slice(i,i+ROWS_PER_FILE).map(insert).join('\n');
  const name=join(out,`trip-${String(files.length+1).padStart(3,'0')}.sql`);
  writeFileSync(name,(i===0?head:'')+chunk+'\n'+(i+ROWS_PER_FILE>=items.length?tail:''));files.push(name);
}
console.log(`D1 SQL ${items.length}건 → ${files.length}개 파일 (${out}), version ${version}`);
// --if-newer: skip when D1 already holds this version or more places (e.g. the full set loaded from the computer,
// while git only carries the smaller build file). Used by the Cloudflare build so every push does not reload.
if(mode&&args.includes('--if-newer')){
  try{
    const res=JSON.parse(execFileSync('npx',['wrangler','d1','execute','guidejung-trip',mode,'--json','--command',"SELECT (SELECT value FROM meta WHERE key='version') AS version, (SELECT COUNT(*) FROM places) AS n"],{cwd:ROOT,encoding:'utf8',shell:process.platform==='win32'}));
    const row=res?.[0]?.results?.[0]??{};
    if(row.version===JSON.stringify(version)||Number(row.n)>items.length){console.log(`D1 skip: version ${row.version}, ${row.n} places`);process.exit(0);}
  }catch(e){console.log('D1 not initialised yet (first load)');}
}
if(mode)for(const f of files){
  console.log(`wrangler d1 execute ${mode} ${f}`);
  execFileSync('npx',['wrangler','d1','execute','guidejung-trip',mode,'--file',f,'-y'],{cwd:ROOT,stdio:'inherit',shell:process.platform==='win32'});
}
