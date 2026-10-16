"""Unattended trip collection for GitHub Actions — no PostgreSQL.

The published set lives in runtime/trip-auto/full.json (kept between runs by the Actions cache) and in D1.
Each run: merge D1 into the file if someone else loaded D1 → list TourAPI ids (all pages, once a day at most) →
enrich new ids until the time/call budget ends → write full.json + the small git build file (apps/trip/data/trip.json).
scripts/build-trip-d1.mjs --upsert then sends only new/changed rows to D1.
Usage: python -m services.api.app.trip_auto [--types 12,14,28,15,39,32] [--minutes 300]
"""
import argparse,json,os,subprocess,time
from datetime import date,datetime,timedelta,timezone
from types import SimpleNamespace
from uuid import NAMESPACE_URL,uuid5
import httpx
from . import config
from .config import ROOT
from .full_trip import write_json
from .pipeline import stable
from .tourapi import TourAPI
from .trip100 import enrich
from .validation import checks,normalize

KST=timezone(timedelta(hours=9))
WORK=ROOT/'runtime'/'trip-auto'
FULL=WORK/'full.json'
MANIFEST=WORK/'d1-manifest.json'  # written by scripts/build-trip-d1.mjs --upsert: what D1 holds (version + row hashes)
SOURCE_URL='https://www.data.go.kr/data/15101578/openapi.do'
ALL_TYPES='12,14,28,15,39,32'
MAX_FAILS_IN_ROW=20
PAGE=50

def now():return datetime.now(KST)

# --- D1 (read through wrangler; the Actions job has CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID) -----------------
def d1(sql):
    out=subprocess.run(['npx','wrangler','d1','execute','guidejung-trip','--remote','--json','--command',sql],cwd=ROOT,capture_output=True,text=True,check=True).stdout
    return json.loads(out)[0]['results']

def d1_version():
    try:
        rows=d1("SELECT value FROM meta WHERE key='version'")
        return json.loads(rows[0]['value']) if rows else None
    except (subprocess.CalledProcessError,ValueError,KeyError,IndexError):return None

def d1_dataset():
    """The whole published set from D1 (same shape as runtime/trip-full.json)."""
    items=[];offset=0
    while True:
        rows=d1(f'SELECT body FROM places ORDER BY id LIMIT 2000 OFFSET {offset}')
        items+=[json.loads(r['body']) for r in rows];offset+=len(rows)
        if len(rows)<2000:break
    meta=d1("SELECT value FROM meta WHERE key='status'")
    regions=d1('SELECT id,name,code,count FROM regions')
    return {'status':json.loads(meta[0]['value']) if meta else {},'regions':regions,'items':items}

# --- regions (법정동 시군구: id = uuid5('MOIS_LEGAL:'+code), the same ids the PostgreSQL pipeline uses) -------------
def region_id(code):return str(uuid5(NAMESPACE_URL,'MOIS_LEGAL:'+code))

def load_regions(api,full):
    """code → region. Names already published win (they come from the official 법정동 file); TourAPI ldongCode2 fills the rest."""
    path=WORK/'ldong.json'
    table=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    if not table:
        try:
            for province in api.call('ldongCode2',numOfRows=100,pageNo=1)['items']:
                pc=str(province.get('code') or province.get('lDongRegnCd') or '');pn=str(province.get('name') or province.get('lDongRegnNm') or '')
                if len(pc)!=2:continue
                for city in api.call('ldongCode2',lDongRegnCd=pc,numOfRows=100,pageNo=1)['items']:
                    cc=str(city.get('code') or city.get('lDongSignguCd') or '');cn=str(city.get('name') or city.get('lDongSignguNm') or '')
                    if len(cc)==3 and cn:table[pc+cc]=cn if cn.startswith(pn) else f'{pn} {cn}'
            if table:write_json(path,table)
        except ValueError as error:print(f'지역 코드 목록을 받지 못했습니다(이미 공개된 지역만 사용): {error}',flush=True)
    for r in full['regions']:table[r['code']]=r['name']
    return {code:SimpleNamespace(id=region_id(code),name=name,code=code,parent_id=region_id(code[:2])) for code,name in table.items()}

# --- one TourAPI record → one published item (same fields as main.view() of a Profile) --------------------------
def build_item(raw,regions,stamp,dataset_id):
    item=normalize(raw)
    code=item['legal_city'] if len(item['legal_city'])==5 else item['legal_province']+item['legal_city']
    region=regions.get(code)
    if item['kind']=='festival':
        for key in ('start_date','end_date'):
            value=item[key]
            if len(value)==8 and value.isdigit():item[key]=f'{value[:4]}-{value[4:6]}-{value[6:]}'
    _,score,valid=checks(item,region)
    if not valid:return None
    data={**item,'id':stable('tourapi',item['external_id']),'region_id':region.id,'region_name':region.name,'verified_at':None,
          'source_url':raw.get('source_url') or SOURCE_URL,'is_demo':False,'quality_score':score,'dataset_id':dataset_id,'updated_at':stamp}
    if item['kind']=='festival':data['event_status']='scheduled'
    return data

def finish(full,stamp,dataset_id):
    """Fields that depend on today: SEO flag, stale condition evidence, ended festivals; status and region counts."""
    today=now().date()
    items=[]
    for p in full['items']:
        if p.get('review_status')=='rejected' or p.get('source_hidden'):continue
        for key,fact in (p.get('evidence') or {}).items():
            try:fresh=0<=(today-date.fromisoformat(fact.get('verified_at',''))).days<=config.CONDITION_MAX_AGE_DAYS
            except (ValueError,TypeError):fresh=False
            if not fresh and not fact.get('auto'):p['conditions'][key]=None
        p['indexable']=config.SEO_ENABLED and len(p.get('description') or '')>=80
        if p['kind']=='festival' and p.get('event_status') in ('scheduled','ended'):
            p['event_status']='ended' if (p.get('end_date') or '9999')<today.isoformat() else 'scheduled'
        items.append(p)
    items.sort(key=lambda p:p['id'])
    counts={};names={r['id']:r for r in full['regions']}
    for p in items:counts[p['region_id']]=counts.get(p['region_id'],0)+1;names.setdefault(p['region_id'],{'id':p['region_id'],'name':p['region_name'],'code':''})
    regions=[{'id':rid,'name':names[rid]['name'],'code':names[rid].get('code',''),'count':n} for rid,n in sorted(counts.items())]
    kinds={k:sum(p['kind']==k for p in items) for k in ('place','festival','food','stay')}
    status={**full.get('status',{}),'mode':'live','available':True,'dataset_id':dataset_id,'updated_at':stamp,
            **{f'{k}_count':n for k,n in kinds.items()},'indexable_count':sum(bool(p['indexable']) for p in items),'seo_enabled':config.SEO_ENABLED}
    status.setdefault('services',[{'id':'trip','available':True}])
    return {'status':status,'regions':regions,'items':items}

def merge(base,other):
    """Union by id; the newer copy of an item wins."""
    by={p['id']:p for p in base['items']}
    for p in other['items']:
        if p['id'] not in by or (p.get('updated_at') or '')>(by[p['id']].get('updated_at') or ''):by[p['id']]=p
    regions={r['id']:r for r in base['regions']+other['regions']}
    return {'status':other.get('status') or base.get('status',{}),'regions':list(regions.values()),'items':list(by.values())}

def run(types=ALL_TYPES,minutes=300,limit=None):
    WORK.mkdir(parents=True,exist_ok=True);cache=WORK/'raw';cache.mkdir(exist_ok=True)
    deadline=time.monotonic()+minutes*60
    statepath=WORK/'state.json'
    state=json.loads(statepath.read_text(encoding='utf-8')) if statepath.exists() else {}
    state.setdefault('rejected',[]);state.setdefault('types',None)
    full=json.loads(FULL.read_text(encoding='utf-8')) if FULL.exists() else {'status':{},'regions':[],'items':[]}
    # D1 changed by someone else (first run, or export-site.bat from the computer): take its items in.
    loaded=json.loads(MANIFEST.read_text(encoding='utf-8')).get('version') if MANIFEST.exists() else None
    remote=d1_version()
    if remote is None and not FULL.exists():raise SystemExit('D1을 읽지 못했습니다(Cloudflare 토큰 확인). 빈 데이터로 덮어쓰지 않도록 멈춥니다.')
    if remote and remote!=loaded:
        print(f'D1 데이터({remote})를 가져와 합칩니다.',flush=True);full=merge(full,d1_dataset())
    codes=[c.strip() for c in types.split(',') if c.strip()]
    if state['types']!=codes:state.update(types=codes,listing={},cursor=0,listed_on=None);(WORK/'candidates.json').unlink(missing_ok=True)
    stamp=now().isoformat();dataset_id='auto-'+now().strftime('%Y%m%d%H%M')
    known={str(p.get('external_id')) for p in full['items']}
    lists=json.loads((WORK/'candidates.json').read_text(encoding='utf-8')) if (WORK/'candidates.json').exists() else {}
    new=0;stop='done'
    def save():
        write_json(statepath,state);write_json(WORK/'candidates.json',lists)
    try:
        with httpx.Client(timeout=30) as client:
            daily=int(limit or os.getenv('TOURAPI_DAILY_LIMIT','95000'))
            api=TourAPI(os.getenv('TOURAPI_SERVICE_KEY',''),WORK/'tourapi-budget.json',daily,client)
            regions=load_regions(api,full)
            # Listing: every page of each type, at most once a day (new ids appear in the next day's list).
            today=now().date().isoformat()
            if not lists.get('order') and state.get('listed_on')!=today:
                for code in codes:
                    info=state['listing'].setdefault(code,{'page':1,'done':False});ids=lists.setdefault(code,[])
                    while not info['done']:
                        if time.monotonic()>deadline:raise TimeoutError
                        batch=api.call('areaBasedList2',contentTypeId=code,numOfRows=PAGE,pageNo=info['page'],arrange='C')
                        ids+=[{'contentid':str(r['contentid']),'contenttypeid':str(r.get('contenttypeid') or code),'title':r.get('title','')} for r in batch['items']]
                        info['page']+=1;info['done']=not batch['items'] or (info['page']-1)*PAGE>=batch['total']
                        if info['page']%20==0:save()
                skip=known|set(state['rejected'])
                order=[];seen=set()
                # Interleave the types so a partial run publishes some of every kind.
                for i in range(max((len(lists.get(c,[])) for c in codes),default=0)):
                    for c in codes:
                        if i<len(lists.get(c,[])):
                            r=lists[c][i]
                            if r['contentid'] not in skip and r['contentid'] not in seen:seen.add(r['contentid']);order.append(r)
                lists={'order':order};state.update(cursor=0,listing={},listed_on=today);save()
                print(f'원천 목록 확인: 새로 받을 항목 {len(order)}건',flush=True)
            order=lists.get('order',[]);fails=0
            while state['cursor']<len(order):
                if time.monotonic()>deadline:raise TimeoutError
                record=dict(order[state['cursor']]);ident=record['contentid']
                if ident in known:state['cursor']+=1;continue
                try:raw=enrich(api,record,cache)
                except ValueError as error:
                    if '예산' in str(error):raise
                    fails+=1;state['cursor']+=1;print(f'건너뜀 {ident}: {error}',flush=True)
                    if fails>=MAX_FAILS_IN_ROW:raise RuntimeError(f'연속 {fails}건 실패: {error}') from None
                    continue
                fails=0
                item=build_item(raw,regions,stamp,dataset_id)
                if item:full['items'].append(item);known.add(ident);new+=1
                else:state['rejected'].append(ident)
                (cache/f'{ident}.json').unlink(missing_ok=True)  # the item keeps what the site needs
                state['cursor']+=1
                if state['cursor']%200==0:
                    save();write_json(FULL,full);print(f'진행 {state["cursor"]}/{len(order)} · 새로 {new}건',flush=True)
            if order:lists={}  # list used up: tomorrow's run lists again
    except TimeoutError:stop='time'
    except KeyboardInterrupt:stop='interrupted'
    except (ValueError,RuntimeError,OSError) as error:
        stop='budget' if '예산' in str(error) else 'error';print(f'멈춤: {error}',flush=True)
    save()
    if new or not FULL.exists() or remote!=loaded:
        full=finish(full,stamp,dataset_id)
    write_json(FULL,full)
    from .export_static import TARGET,build_file
    TARGET.write_text(json.dumps(build_file(full),ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print(f'끝({stop}): 새로 {new}건, 전체 {len(full["items"])}건, 검수 제외 누적 {len(state["rejected"])}건',flush=True)
    return stop,new

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--types',default=os.getenv('TOURAPI_TYPES') or ALL_TYPES)
    parser.add_argument('--minutes',type=float,default=float(os.getenv('TRIP_MINUTES','300')))
    args=parser.parse_args();stop,_=run(args.types,args.minutes)
    raise SystemExit(1 if stop=='error' else 0)
