"""Grow the published set to a target size (existing + new IDs); resume without repeating details."""
MAX_TARGET=100000  # full TourAPI set: details/search live in D1 now (the static build keeps only list cards)
import json,os
from datetime import datetime,timezone
import httpx
from sqlalchemy import select
from .config import ROOT
from .db import SessionLocal,initialize
from .models import Profile,RawRecord,PlaceSource,Region
from .pipeline import active_dataset,ingest
from .tourapi import TourAPI,acquire_lock
from .full_trip import write_json,valid_record

def enrich(api,record,cache):
    path=cache/f'{record["contentid"]}.json'
    state=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'record':record,'done':[]}
    record=state['record'];ident=record['contentid'];kind=record['contenttypeid']
    calls=[('detailCommon2',{'contentId':ident},None),('detailIntro2',{'contentId':ident,'contentTypeId':kind},'_intro_raw'),('detailInfo2',{'contentId':ident,'contentTypeId':kind},'_facilities'),('detailImage2',{'contentId':ident},'_images'),('detailPetTour2',{'contentId':ident},'_pet')]
    for endpoint,params,key in calls:
        if endpoint in state['done']:continue
        rows=api.call(endpoint,**params)['items']
        if key in {'_images','_facilities'}:record[key]=rows
        elif key=='_pet':record[key]=rows[0] if rows else {}
        else:
            if rows:record.update(rows[0])
            if key:record[key]=rows[0] if rows else {}
        state['done'].append(endpoint);write_json(path,state)
    record['source_url']='https://www.data.go.kr/data/15101578/openapi.do'
    return record

def known_ids(db,dataset):
    """TourAPI contentids of the published set (one query, not one per place)."""
    rows=db.execute(select(PlaceSource.external_id).join(Profile,Profile.place_id==PlaceSource.place_id)
                    .where(Profile.dataset_id==dataset.id,PlaceSource.source_id=='tourapi')).scalars()
    return sorted({str(x) for x in rows})

def known_payloads(db,ids):
    """Latest stored raw record of each published item (they are re-published with the new ones)."""
    out={}
    for i in range(0,len(ids),1000):
        for r in db.scalars(select(RawRecord).where(RawRecord.external_id.in_(ids[i:i+1000])).order_by(RawRecord.fetched_at.desc())):
            out.setdefault(str(r.external_id),r.payload)
    return [out[i] for i in ids if i in out]

# 12 관광지·14 문화시설·28 레포츠·15 축제 (default); 39 음식점·32 숙박 once the site shows them (TOURAPI_TYPES / --types).
DEFAULT_TYPES='12,14,28,15'

def run(target=100,types=None):
    if not 100<=target<=MAX_TARGET:raise ValueError(f'목표는 100~{MAX_TARGET}건입니다.')
    codes=[c.strip() for c in (types or os.getenv('TOURAPI_TYPES') or DEFAULT_TYPES).split(',') if c.strip()]
    # A different type set (맛집·숙소 added) gets its own work folder: its candidate list differs.
    suffix='' if ','.join(codes)==DEFAULT_TYPES else '-'+'-'.join(codes)
    initialize();work=ROOT/'runtime'/f'trip{target}{suffix}';work.mkdir(exist_ok=True)
    cache=work/'raw';cache.mkdir(exist_ok=True)
    statepath=work/'checkpoint.json';progress=work/'progress.json';listpath=work/'candidates.json'
    # Checkpoint keeps ids only (tens of thousands of full records made every save slow); each new record's content is
    # in cache/{contentid}.json from enrich(), the candidate list in candidates.json, published ones in the DB.
    state=json.loads(statepath.read_text(encoding='utf-8')) if statepath.exists() else {'cursor':0,'records':[],'known':[],'rejected':[]}
    if state.get('status')=='completed':print(f'{target}건 수집 완료. 변경 확인은 sync_trip을 사용하세요.');return
    fd=acquire_lock()
    known=set(state['known'])
    # Older checkpoints held full records (and the candidate list); keep them as cache files and ids.
    for key in ('records','rejected'):
        ids=[]
        for r in state[key]:
            if isinstance(r,dict):
                ident=str(r['contentid'])
                if ident not in known and not (cache/f'{ident}.json').exists():write_json(cache/f'{ident}.json',{'record':r,'done':['detailCommon2','detailIntro2','detailInfo2','detailImage2','detailPetTour2']})
                r=ident
            if r not in known:ids.append(r)
        state[key]=ids
    if listpath.exists():candidates=json.loads(listpath.read_text(encoding='utf-8'))
    else:
        # Old lists also held the published items, and the cursor counted them.
        old=state.get('candidates',[]);keep=lambda r:str(r['contentid']) not in known
        state['cursor']=sum(map(keep,old[:state['cursor']]));candidates=[r for r in old if keep(r)]
        if old:write_json(listpath,candidates)
    state.pop('candidates',None)
    def save(status='running',current=''):
        state['status']=status
        write_json(statepath,state)
        write_json(progress,{'status':status,'completed':len(known)+len(state['records']),'total':target,'rejected':len(state['rejected']),'current_item':current,'updated_at':datetime.now(timezone.utc).isoformat()})
    def cached(ident):return json.loads((cache/f'{ident}.json').read_text(encoding='utf-8'))['record']
    def publish(db):
        """New dataset version = published items (from the DB) + new records (from the cache)."""
        if state['rejected']:ingest(db,[cached(i) for i in state['rejected']],publish=False)
        job=ingest(db,known_payloads(db,state['known'])+[cached(i) for i in state['records']])
        if job.status!='completed':raise RuntimeError('공개 버전 검증 실패')
    try:
        with SessionLocal() as db:
            regions={r.code:r for r in db.scalars(select(Region).where(Region.level=='city',Region.code_system=='MOIS_LEGAL',Region.status=='active')).all()}
            if not state['known']:
                dataset=active_dataset(db)
                if not dataset:raise SystemExit('공개 데이터가 없습니다. README의 "공식 데이터 연결" 순서(regions → collect → import)를 먼저 실행하세요.')
                state['known']=known_ids(db,dataset);known=set(state['known'])
        with httpx.Client(timeout=30) as client:
            api=TourAPI(os.getenv('TOURAPI_SERVICE_KEY',''),ROOT/'runtime'/'tourapi-budget.json',int(os.getenv('TOURAPI_DAILY_LIMIT','1000')),client)
            limit=int(os.getenv('TOURAPI_DAILY_LIMIT','1000'))
            def show(name=''):
                # One live status line so the console never looks frozen.
                try:calls=json.loads((ROOT/'runtime'/'tourapi-budget.json').read_text()).get('calls',0)
                except (OSError,ValueError):calls='?'
                new=len(state['records'])
                print(f"\r진행 {len(known)+new}/{target}건 · 오늘 새로 {new}건 · 오늘 API 호출 {calls}/{limit} · {name[:18]:<18}",end='',flush=True)
            if not candidates:
                print('원천 목록을 확인하는 중입니다...',flush=True)
                # Types interleaved, 50 per page each: enough pages to reach the target plus a buffer.
                seen=set(known)
                for page in range(1,target//(50*len(codes))+3):
                    batches=[api.call('areaBasedList2',contentTypeId=code,numOfRows=50,pageNo=page,arrange='C')['items'] for code in codes]
                    if not any(batches):break
                    for offset in range(50):
                        for batch in batches:
                            if offset>=len(batch):continue
                            record=batch[offset];ident=str(record['contentid'])
                            if ident not in seen:seen.add(ident);candidates.append(record)
                write_json(listpath,candidates);save()
            while state['cursor']<len(candidates) and len(known)+len(state['records'])<target:
                record=candidates[state['cursor']]
                raw=enrich(api,record,cache)
                (state['records'] if valid_record(raw,regions) else state['rejected']).append(str(raw['contentid']))
                # enrich() caches per item, so a sparser checkpoint costs no extra API calls on resume.
                state['cursor']+=1;show(raw.get('title',''))
                if state['cursor']%50==0:save(current=raw.get('title',''))
            print('\n수집한 내용을 저장하는 중입니다...',flush=True)
            with SessionLocal() as db:publish(db)
            save('completed');print(f'사진/시설 보강 {len(state["records"])}건, 검수 대기 {len(state["rejected"])}건. 공개 총량 최대 {target}건.')
    except ValueError as error:
        save('paused_error_or_budget')
        if '예산' not in str(error):raise
        # Daily API limit: publish what is ready so each day's work shows up, then resume tomorrow.
        new=len(state['records'])
        print('\n오늘 호출 한도에 도달해 지금까지 모은 내용을 저장하는 중입니다...',flush=True)
        if new:
            with SessionLocal() as db:publish(db)
        print(f'오늘 호출 한도에 도달했습니다. 지금까지 새로 {new}건을 공개 데이터에 넣었습니다. 내일 같은 목표로 다시 실행하면 이어서 수집합니다.')
    finally:os.close(fd)

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--target',type=int,default=200);parser.add_argument('--types',help='contentTypeId 목록, 예: 12,14,28,15,39,32');args=parser.parse_args();run(args.target,args.types)
