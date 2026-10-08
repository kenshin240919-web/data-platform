"""Grow the published set to a target size (existing + new IDs); resume without repeating details."""
MAX_TARGET=3000  # static site: search index and asset count grow with every item
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

def run(target=100):
    if not 100<=target<=MAX_TARGET:raise ValueError(f'목표는 100~{MAX_TARGET}건입니다.')
    initialize();work=ROOT/'runtime'/f'trip{target}';work.mkdir(exist_ok=True)
    cache=work/'raw';cache.mkdir(exist_ok=True)
    statepath=work/'checkpoint.json';progress=work/'progress.json'
    state=json.loads(statepath.read_text(encoding='utf-8')) if statepath.exists() else {'candidates':[],'cursor':0,'records':[],'known':[],'rejected':[]}
    if state.get('status')=='completed':print(f'{target}건 수집 완료. 변경 확인은 sync_trip을 사용하세요.');return
    fd=acquire_lock()
    def save(status='running',current=''):
        state['status']=status
        write_json(statepath,state)
        write_json(progress,{'status':status,'completed':len(state['records']),'total':target,'rejected':len(state['rejected']),'current_item':current,'updated_at':datetime.now(timezone.utc).isoformat()})
    try:
        with SessionLocal() as db:
            regions={r.code:r for r in db.scalars(select(Region).where(Region.level=='city',Region.code_system=='MOIS_LEGAL',Region.status=='active')).all()}
            if not state['candidates']:
                dataset=active_dataset(db)
                if not dataset:raise SystemExit('공개 데이터가 없습니다. README의 "공식 데이터 연결" 순서(regions → collect → import)를 먼저 실행하세요.')
                for p in db.scalars(select(Profile).where(Profile.dataset_id==dataset.id)).all():
                    source=db.scalar(select(PlaceSource).where(PlaceSource.place_id==p.place_id,PlaceSource.source_id=='tourapi'))
                    raw=db.scalar(select(RawRecord).where(RawRecord.external_id==source.external_id).order_by(RawRecord.fetched_at.desc()).limit(1))
                    state['candidates'].append(raw.payload);state['known'].append(source.external_id)
        with httpx.Client(timeout=30) as client:
            api=TourAPI(os.getenv('TOURAPI_SERVICE_KEY',''),ROOT/'runtime'/'tourapi-budget.json',int(os.getenv('TOURAPI_DAILY_LIMIT','1000')),client)
            limit=int(os.getenv('TOURAPI_DAILY_LIMIT','1000'))
            def show(name=''):
                # One live status line so the console never looks frozen.
                try:calls=json.loads((ROOT/'runtime'/'tourapi-budget.json').read_text()).get('calls',0)
                except (OSError,ValueError):calls='?'
                new=sum(str(r['contentid']) not in set(state['known']) for r in state['records'])
                print(f"\r진행 {len(state['known'])+new}/{target}건 · 오늘 새로 {new}건 · 오늘 API 호출 {calls}/{limit} · {name[:18]:<18}",end='',flush=True)
            if len(state['candidates'])<=len(state['known']):
                print('원천 목록을 확인하는 중입니다...',flush=True)
                # Four types interleaved, 50 per page: enough pages to reach the target plus a buffer.
                for page in range(1,target//200+3):
                    batches=[api.call('areaBasedList2',contentTypeId=code,numOfRows=50,pageNo=page,arrange='C')['items'] for code in ['12','14','28','15']]
                    for offset in range(50):
                        for batch in batches:
                            if offset>=len(batch):continue
                            record=batch[offset]
                            if str(record['contentid']) not in {str(x['contentid']) for x in state['candidates']}:state['candidates'].append(record)
                save()
            known=set(state['known'])
            while state['cursor']<len(state['candidates']):
                record=state['candidates'][state['cursor']]
                new_count=sum(str(r['contentid']) not in known for r in state['records'])
                if len(known)+new_count>=target and str(record['contentid']) not in known:break
                # Already-published records were enriched earlier; the monthly sync keeps them current.
                raw=record if str(record['contentid']) in known and '_images' in record else enrich(api,record,cache)
                if valid_record(raw,regions):state['records'].append(raw)
                else:state['rejected'].append(raw)
                # enrich() caches per item, so a sparser checkpoint costs no extra API calls on resume.
                state['cursor']+=1;show(raw.get('title',''))
                if state['cursor']%10==0:save(current=raw.get('title',''))
            print('\n수집한 내용을 저장하는 중입니다...',flush=True)
            with SessionLocal() as db:
                if state['rejected']:ingest(db,state['rejected'],publish=False)
                job=ingest(db,state['records'])
                if job.status!='completed':raise RuntimeError('공개 버전 검증 실패')
            save('completed');print(f'사진/시설 보강 {len(state["records"])}건, 검수 대기 {len(state["rejected"])}건. 공개 총량 최대 {target}건.')
    except ValueError as error:
        save('paused_error_or_budget')
        if '예산' not in str(error):raise
        # Daily API limit: publish what is ready so each day's work shows up, then resume tomorrow.
        known=set(state['known']);new=sum(str(r['contentid']) not in known for r in state['records'])
        print('\n오늘 호출 한도에 도달해 지금까지 모은 내용을 저장하는 중입니다...',flush=True)
        if new:
            with SessionLocal() as db:job=ingest(db,state['records'])
            if job.status!='completed':raise RuntimeError('공개 버전 검증 실패') from error
        print(f'오늘 호출 한도에 도달했습니다. 지금까지 새로 {new}건을 공개 데이터에 넣었습니다. 내일 같은 목표로 다시 실행하면 이어서 수집합니다.')
    finally:os.close(fd)

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--target',type=int,default=200);args=parser.parse_args();run(args.target)
