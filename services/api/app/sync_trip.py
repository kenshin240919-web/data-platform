"""Explicit bounded sync of existing records only; no new IDs beyond the 100-record set."""
import argparse,json,os,re
from copy import deepcopy
from datetime import datetime,timedelta,timezone
import httpx
from sqlalchemy import select
from .config import ROOT
from .db import SessionLocal
from .models import PlaceSource,Profile,Region
from .pipeline import active_dataset,ingest
from .review import raw_for
from .tourapi import TourAPI,KST,acquire_lock
from .trip100 import enrich
from .full_trip import write_json,valid_record

def changed(old,row):
    return row.get('showflag','1')!=old.get('showflag','1') or row.get('modifiedtime')!=old.get('modifiedtime')

def reset_review(record):
    record=deepcopy(record)
    for key in ['reviewer','verified_at','boundary_verified','condition_evidence']:record.pop(key,None)
    record['review_status']='pending';record['review_note']='원천 정보 변경으로 재검수 필요'
    return record

def run(since=None):
    work=ROOT/'runtime'/'trip-sync';work.mkdir(exist_ok=True)
    watermark=work/'watermark.json'
    saved=json.loads(watermark.read_text()) if watermark.exists() else {}
    since=since or saved.get('since') or (datetime.now(KST)-timedelta(days=7)).strftime('%Y%m%d')
    if not re.fullmatch(r'\d{8}',since):raise ValueError('since는 YYYYMMDD 형식입니다.')
    fd=acquire_lock()
    started=datetime.now(KST);processed=[];ignored=0;updates=[];needs_review=[]
    try:
        with SessionLocal() as db:
            current=active_dataset(db)
            ids={p.place_id for p in db.scalars(select(Profile).where(Profile.dataset_id==current.id)).all()}
            sources={s.external_id:s.place_id for s in db.scalars(select(PlaceSource).where(PlaceSource.source_id=='tourapi',PlaceSource.place_id.in_(ids))).all()}
            old={external:raw_for(db,place) for external,place in sources.items()}
        cache=work/started.strftime('%Y%m%d%H%M%S');cache.mkdir()
        with httpx.Client(timeout=30) as client:
            api=TourAPI(os.getenv('TOURAPI_SERVICE_KEY',''),ROOT/'runtime'/'tourapi-budget.json',int(os.getenv('TOURAPI_DAILY_LIMIT','1000')),client)
            page=1
            while True:
                batch=api.call('areaBasedSyncList2',modifiedtime=since,numOfRows=50,pageNo=page)
                write_json(cache/f'changes-{page}.json',batch)
                for row in batch['items']:
                    external=str(row['contentid'])
                    if external not in old:ignored+=1;continue
                    if not changed(old[external],row):continue
                    if row.get('showflag')=='0':
                        # Explicit source hiding is reversible and retains the old RAW/history.
                        record=reset_review(old[external]);record.update(showflag='0',modifiedtime=row.get('modifiedtime'))
                    else:record=reset_review(enrich(api,row,cache))
                    updates.append(record);processed.append(external)
                if not batch['items'] or page*50>=batch['total']:break
                page+=1
                if page>100:raise ValueError('변경 목록이 큽니다. 조회 범위를 좁혀 주세요.')
        if updates:
            with SessionLocal() as db:
                regions={r.code:r for r in db.scalars(select(Region).where(Region.level=='city',Region.code_system=='MOIS_LEGAL',Region.status=='active')).all()}
                good=[];bad=[]
                for record in updates:(good if valid_record(record,regions) else bad).append(record)
                # Invalid changes go to the review queue instead of blocking every later sync.
                if bad:ingest(db,bad,publish=False)
                if good:
                    job=ingest(db,good)
                    if job.status!='completed':raise ValueError('변경분 검증 실패. 이전 공개 버전과 watermark를 유지합니다.')
                needs_review=[str(r.get('contentid')) for r in bad]
        # Overlap a day to avoid missing changes around the previous run boundary.
        write_json(watermark,{'since':(started-timedelta(days=1)).strftime('%Y%m%d'),'last_success':started.isoformat()})
        write_json(work/'progress.json',{'status':'completed','since':since,'changed':len(updates),'source_hidden':sum(r.get('showflag')=='0' for r in updates),'ignored_new_ids':ignored,'ids':processed,'needs_review':needs_review,'finished_at':datetime.now(timezone.utc).isoformat()})
        print(f'변경 동기화 완료: 갱신 {len(updates)}건, 수집 대상 밖 {ignored}건. 새 장소 추가 없음.')
    except Exception:
        write_json(work/'progress.json',{'status':'failed','since':since,'changed':0,'error':'동기화 실패: 이전 공개 버전 및 watermark 유지'})
        raise
    finally:os.close(fd)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--since');args=parser.parse_args();run(args.since)
