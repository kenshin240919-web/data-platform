// Load runtime/hospital/full.json (scripts/collect-hospital.py) into D1 guidejung-hospital for the hospital Worker.
// Usage: node scripts/build-hospital-d1.mjs [full.json] --remote|--local [--manifest runtime/hospital/d1-manifest.json]
// Same approach as scripts/build-trip-d1.mjs: when D1 still holds the manifest's version only new/changed/removed rows are
// sent (D1 bills rows written), otherwise a full load into hospitals_next that the last file swaps in. Same as build-academy-d1.mjs.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const DB='guidejung-hospital';
const args=process.argv.slice(2);
const opt=k=>args.includes(k)?args[args.indexOf(k)+1]:null;
const manifestPath=opt('--manifest')??join(ROOT,'runtime/hospital/d1-manifest.json');
const input=args.find(a=>!a.startsWith('--')&&a!==manifestPath)??join(ROOT,'runtime/hospital/full.json');
const mode=args.includes('--remote')?'--remote':args.includes('--local')?'--local':null;
const ROWS_PER_FILE=500;
const wrangler=(a,o={})=>execFileSync('npx',['wrangler',...a,'-c','apps/hospital/wrangler.jsonc'],{cwd:ROOT,...o});
const rel=f=>relative(ROOT,f).split(sep).join('/');

const data=JSON.parse(readFileSync(input,'utf8'));
const items=data.items??[];
if(!items.length)throw new Error(`no items in ${input}`);
const s=v=>v===null||v===undefined?'NULL':typeof v==='number'?(Number.isFinite(v)?String(v):'NULL'):`'${String(v).replace(/'/g,"''")}'`;
const pad=a=>` ${(a??[]).join(' ')} `;
const CARD=['id','name','div','address','tel','lat','lon','hours','depts','er'];
const card=h=>JSON.stringify(Object.fromEntries(CARD.map(k=>[k,h[k]??null])));
const text=h=>[h.name,h.address,h.region_name,h.div].filter(Boolean).join(' ').toLowerCase();
const b=v=>v?1:0;
const row=(h,into)=>`${into} (id,name,div,region_id,sido,lat,lon,depts,er,night,sat,sun,hol,rank,text,card,body,stage) VALUES (${[
  s(h.id),s(h.name),s(h.div),s(h.region),s(h.sido),s(h.lat),s(h.lon),s(pad(h.depts)),b(h.er),b(h.night),b(h.sat),b(h.sun),b(h.hol),s(h.rank??0),s(text(h)),s(card(h)),s(JSON.stringify(h)),s(h.stage??3)].join(',')});`;
// 시군구별 진료과목 통계(collect-hospital.py region_stats)는 매번 통째로 바꿈(232행).
const regionSql=`DELETE FROM regions;\n${Object.entries(data.stats??{}).map(([id,st])=>`INSERT INTO regions (id,stats) VALUES (${s(id)},${s(JSON.stringify(st))});`).join('\n')}`;

const schema=readFileSync(join(ROOT,'apps/hospital/worker/schema.sql'),'utf8');
const tables=(schema.match(/CREATE TABLE IF NOT EXISTS [\s\S]*?\);/g)??[]).join('\n');
const indexes=(schema.match(/CREATE INDEX IF NOT EXISTS[^\n]*/g)??[]).join('\n');
const next=name=>schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${name} \\([\\s\\S]*?\\);`))[0].replace(`IF NOT EXISTS ${name} (`,`${name}_next (`);
const SCHEMA=2;  // bump when the table layout or a stored value rule changes (a new SCHEMA always does a full load)
const version=`${data.status?.updated_at}#s${SCHEMA}`;
const metaSql=`INSERT OR REPLACE INTO meta (key,value) VALUES ('status',${s(JSON.stringify(data.status??null))});
INSERT OR REPLACE INTO meta (key,value) VALUES ('version',${s(JSON.stringify(version))});`;

const out=join(ROOT,'runtime/d1-hospital');rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
const files=[];
const write=sql=>{const f=join(out,`hospital-${String(files.length+1).padStart(3,'0')}.sql`);writeFileSync(f,sql);files.push(f);};
const hash=a=>createHash('sha1').update(row(a,'INSERT')).digest('hex');
const run=()=>{for(const f of files)for(let n=1;;n++){console.log(`wrangler d1 execute ${mode} ${rel(f)}${n>1?` (retry ${n})`:''}`);
  try{wrangler(['d1','execute',DB,mode,'--file',rel(f),'-y'],{stdio:'inherit'});break;}
  catch(e){if(n>=4)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,30000*n);}}};
const saveManifest=()=>writeFileSync(manifestPath,JSON.stringify({version,hashes:Object.fromEntries(items.map(a=>[a.id,hash(a)]))}));

let live={};
if(mode)try{live=JSON.parse(wrangler(['d1','execute',DB,mode,'--json','--command',"SELECT (SELECT value FROM meta WHERE key='version') AS version, (SELECT COUNT(*) FROM hospitals) AS n"],{encoding:'utf8'}))?.[0]?.results?.[0]??{};}catch{console.log('D1 not initialised yet (first load)');}
if(Number(live.n)>items.length*1.1&&!args.includes('--force')){console.log(`D1 has ${live.n} hospitals, the file only ${items.length}: not loading (--force).`);process.exit(1);}
const manifest=existsSync(manifestPath)?JSON.parse(readFileSync(manifestPath,'utf8')):null;
if(mode&&manifest&&live.version===JSON.stringify(manifest.version)&&manifest.version.endsWith(`#s${SCHEMA}`)){
  if(manifest.version===version){console.log(`D1 already holds ${version}`);process.exit(0);}
  const changed=items.filter(a=>manifest.hashes[a.id]!==hash(a)),ids=new Set(items.map(a=>a.id));
  const removed=Object.keys(manifest.hashes).filter(id=>!ids.has(id));
  for(let i=0;i<changed.length;i+=ROWS_PER_FILE)write(changed.slice(i,i+ROWS_PER_FILE).map(a=>row(a,'INSERT OR REPLACE INTO hospitals')).join('\n')+'\n');
  write(`${removed.map(id=>`DELETE FROM hospitals WHERE id=${s(id)};`).join('\n')}\n${regionSql}\n${indexes}\n${metaSql}\n`);
  console.log(`D1 upsert: ${changed.length.toLocaleString()} changed, ${removed.length.toLocaleString()} removed (${items.length.toLocaleString()} hospitals), version ${version}`);
  run();saveManifest();process.exit(0);
}
const head=`${tables}\nDROP TABLE IF EXISTS hospitals_next;\n${next('hospitals')}\n`;
const tail=`DROP TABLE hospitals;
ALTER TABLE hospitals_next RENAME TO hospitals;
${regionSql}
${indexes}
${metaSql}
`;
for(let i=0;i<items.length;i+=ROWS_PER_FILE)
  write((i===0?head:'')+items.slice(i,i+ROWS_PER_FILE).map(a=>row(a,'INSERT OR REPLACE INTO hospitals_next')).join('\n')+'\n'+(i+ROWS_PER_FILE>=items.length?tail:''));
console.log(`D1 SQL ${items.length.toLocaleString()}곳 → ${files.length}개 파일 (${rel(out)}), version ${version}`);
if(mode){run();saveManifest();}
