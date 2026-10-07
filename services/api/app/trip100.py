"""Collect/enrich at most 100 published source IDs; resume without repeating details."""
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
    if target not in {100,200}:raise ValueError('검증판 대상은 100 또는 200건입니다.')
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
                for p in db.scalars(select(Profile).where(Profile.dataset_id==dataset.id)).all():
                    source=db.scalar(select(PlaceSource).where(PlaceSource.place_id==p.place_id,PlaceSource.source_id=='tourapi'))
                    raw=db.scalar(select(RawRecord).where(RawRecord.external_id==source.external_id).order_by(RawRecord.fetched_at.desc()).limit(1))
                    state['candidates'].append(raw.payload);state['known'].append(source.external_id)
        with httpx.Client(timeout=30) as client:
            api=TourAPI(os.getenv('TOURAPI_SERVICE_KEY',''),ROOT/'runtime'/'tourapi-budget.json',int(os.getenv('TOURAPI_DAILY_LIMIT','1000')),client)
            if len(state['candidates'])<=len(state['known']):
                for page in range(1,4 if target==200 else 2):
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
                raw=enrich(api,record,cache)
                if valid_record(raw,regions):state['records'].append(raw)
                else:state['rejected'].append(raw)
                state['cursor']+=1;save(current=raw.get('title',''))
            with SessionLocal() as db:
                if state['rejected']:ingest(db,state['rejected'],publish=False)
                job=ingest(db,state['records'])
                if job.status!='completed':raise RuntimeError('공개 버전 검증 실패')
            save('completed');print(f'사진/시설 보강 {len(state["records"])}건, 검수 대기 {len(state["rejected"])}건. 공개 총량 최대 {target}건.')
    except ValueError:
        save('paused_error_or_budget');raise
    finally:os.close(fd)

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--target',type=int,default=100,choices=[100,200]);args=parser.parse_args();run(args.target)
