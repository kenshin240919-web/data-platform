// Load runtime/academy/full.json (scripts/collect-academy.py) into D1 guidejung-academy for the academy Worker.
// Usage: node scripts/build-academy-d1.mjs [full.json] --remote|--local [--manifest runtime/academy/d1-manifest.json]
// Same approach as scripts/build-trip-d1.mjs: when D1 still holds the manifest's version only new/changed/removed rows are
// sent (D1 bills rows written), otherwise a full load into academies_next that the last file swaps in.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const DB='guidejung-academy';
const args=process.argv.slice(2);
const opt=k=>args.includes(k)?args[args.indexOf(k)+1]:null;
const manifestPath=opt('--manifest')??join(ROOT,'runtime/academy/d1-manifest.json');
const input=args.find(a=>!a.startsWith('--')&&a!==manifestPath)??join(ROOT,'runtime/academy/full.json');
const mode=args.includes('--remote')?'--remote':args.includes('--local')?'--local':null;
const ROWS_PER_FILE=500;
const wrangler=(a,o={})=>execFileSync('npx',['wrangler',...a,'-c','apps/academy/wrangler.jsonc'],{cwd:ROOT,...o});
const rel=f=>relative(ROOT,f).split(sep).join('/');

const data=JSON.parse(readFileSync(input,'utf8'));
const items=data.items??[];
if(!items.length)throw new Error(`no items in ${input}`);
const s=v=>v===null||v===undefined?'NULL':typeof v==='number'?(Number.isFinite(v)?String(v):'NULL'):`'${String(v).replace(/'/g,"''")}'`;
const pad=a=>` ${(a??[]).join(' ')} `;
const CARD=['id','name','type','region_id','region_name','subjects','grades','fee_min','fee_max','address','lat','lon','established'];
const card=a=>JSON.stringify(Object.fromEntries(CARD.map(k=>[k,a[k]??null])));
const text=a=>[a.name,a.address,a.region_name,...(a.courses??[]).flatMap(c=>[c.course,c.list]),...(a.fees??[]).map(f=>f.name)].filter(Boolean).join(' ').toLowerCase();
const row=(a,into)=>`${into} (id,name,type,region_id,lat,lon,subjects,grades,realm,fee_min,fee_max,fee_n,rank,text,card,body,first_seen,stage) VALUES (${[
  s(a.id),s(a.name),s(a.type),s(a.region_id),s(a.lat),s(a.lon),s(pad(a.subjects)),s(pad(a.grades)),s(a.realm),s(a.fee_min),s(a.fee_max),s(a.fees?.length??0),
  s(a.rank??0),s(text(a)),s(card(a)),s(JSON.stringify(a)),s(a.first_seen),s(a.stage??3)].join(',')});`;

// Regions with counts, the centre of their academies and the fee·정원 statistics the detail page compares with.
const regions=Object.values(items.reduce((m,a)=>{const r=m[a.region_id]??={id:a.region_id,name:a.region_name,sido:a.region_name.split(' ')[0],zone:a.zone??'',count:0,lat:0,lon:0,n:0};
  r.count++;if(a.lat!=null){r.lat+=a.lat;r.lon+=a.lon;r.n++;}return m;},{}));
const regionSql=into=>regions.map(r=>`${into} (id,name,sido,zone,count,lat,lon,stats) VALUES (${[s(r.id),s(r.name),s(r.sido),s(r.zone),s(r.count),s(r.n?+(r.lat/r.n).toFixed(5):null),s(r.n?+(r.lon/r.n).toFixed(5):null),s(JSON.stringify(data.stats?.regions?.[r.id]??{}))].join(',')});`).join('\n');

const schema=readFileSync(join(ROOT,'apps/academy/worker/schema.sql'),'utf8');
const tables=(schema.match(/CREATE TABLE IF NOT EXISTS [\s\S]*?\);/g)??[]).join('\n');
const indexes=(schema.match(/CREATE INDEX IF NOT EXISTS[^\n]*/g)??[]).join('\n');
const next=name=>schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${name} \\([\\s\\S]*?\\);`))[0].replace(`IF NOT EXISTS ${name} (`,`${name}_next (`);
const SCHEMA=2;  // bump when the table layout or a stored value rule changes (a new SCHEMA always does a full load)
const version=`${data.status?.updated_at}#s${SCHEMA}`;
const metaSql=`INSERT OR REPLACE INTO meta (key,value) VALUES ('status',${s(JSON.stringify(data.status??null))});
INSERT OR REPLACE INTO meta (key,value) VALUES ('nation',${s(JSON.stringify(data.stats?.nation??{}))});
INSERT OR REPLACE INTO meta (key,value) VALUES ('version',${s(JSON.stringify(version))});`;

const out=join(ROOT,'runtime/d1-academy');rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
const files=[];
const write=sql=>{const f=join(out,`academy-${String(files.length+1).padStart(3,'0')}.sql`);writeFileSync(f,sql);files.push(f);};
const hash=a=>createHash('sha1').update(row(a,'INSERT')).digest('hex');
const run=()=>{for(const f of files)for(let n=1;;n++){console.log(`wrangler d1 execute ${mode} ${rel(f)}${n>1?` (retry ${n})`:''}`);
  try{wrangler(['d1','execute',DB,mode,'--file',rel(f),'-y'],{stdio:'inherit'});break;}
  catch(e){if(n>=4)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,30000*n);}}};
const saveManifest=()=>writeFileSync(manifestPath,JSON.stringify({version,hashes:Object.fromEntries(items.map(a=>[a.id,hash(a)]))}));

let live={};
if(mode)try{live=JSON.parse(wrangler(['d1','execute',DB,mode,'--json','--command',"SELECT (SELECT value FROM meta WHERE key='version') AS version, (SELECT COUNT(*) FROM academies) AS n"],{encoding:'utf8'}))?.[0]?.results?.[0]??{};}catch{console.log('D1 not initialised yet (first load)');}
if(Number(live.n)>items.length*1.1&&!args.includes('--force')){console.log(`D1 has ${live.n} academies, the file only ${items.length}: not loading (--force).`);process.exit(1);}
const manifest=existsSync(manifestPath)?JSON.parse(readFileSync(manifestPath,'utf8')):null;
if(mode&&manifest&&live.version===JSON.stringify(manifest.version)&&manifest.version.endsWith(`#s${SCHEMA}`)){
  if(manifest.version===version){console.log(`D1 already holds ${version}`);process.exit(0);}
  const changed=items.filter(a=>manifest.hashes[a.id]!==hash(a)),ids=new Set(items.map(a=>a.id));
  const removed=Object.keys(manifest.hashes).filter(id=>!ids.has(id));
  for(let i=0;i<changed.length;i+=ROWS_PER_FILE)write(changed.slice(i,i+ROWS_PER_FILE).map(a=>row(a,'INSERT OR REPLACE INTO academies')).join('\n')+'\n');
  write(`${removed.map(id=>`DELETE FROM academies WHERE id=${s(id)};`).join('\n')}\nDELETE FROM regions;\n${regionSql('INSERT INTO regions')}\n${indexes}\n${metaSql}\n`);
  console.log(`D1 upsert: ${changed.length.toLocaleString()} changed, ${removed.length.toLocaleString()} removed (${items.length.toLocaleString()} academies), version ${version}`);
  run();saveManifest();process.exit(0);
}
const head=`${tables}\nDROP TABLE IF EXISTS academies_next;\n${next('academies')}\nDROP TABLE IF EXISTS regions_next;\n${next('regions')}\n`;
const tail=`${regionSql('INSERT INTO regions_next')}
DROP TABLE academies;
ALTER TABLE academies_next RENAME TO academies;
DROP TABLE regions;
ALTER TABLE regions_next RENAME TO regions;
${indexes}
${metaSql}
`;
for(let i=0;i<items.length;i+=ROWS_PER_FILE)
  write((i===0?head:'')+items.slice(i,i+ROWS_PER_FILE).map(a=>row(a,'INSERT OR REPLACE INTO academies_next')).join('\n')+'\n'+(i+ROWS_PER_FILE>=items.length?tail:''));
console.log(`D1 SQL ${items.length.toLocaleString()}곳 → ${files.length}개 파일 (${rel(out)}), version ${version}`);
if(mode){run();saveManifest();}
