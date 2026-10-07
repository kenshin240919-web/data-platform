"""Resumable four-type collection. Private RAW and a shared daily call ledger."""
import json,os,time
from datetime import datetime,timezone
from pathlib import Path
import httpx
from sqlalchemy import select
from .config import ROOT
from .db import SessionLocal,initialize
from .models import Region
from .pipeline import ingest
from .tourapi import TourAPI,acquire_lock
from .validation import normalize,checks

TYPES=('12','14','28','15')

def write_json(path,value):
    temporary=path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value,ensure_ascii=False),encoding='utf-8')
    temporary.replace(path)

def valid_record(raw,regions):
    item=normalize(raw)
    city=item['legal_city'];province=item['legal_province']
    code=city if len(city)==5 else province+city
    if item['kind']=='festival':
        for key in ('start_date','end_date'):
            value=item[key]
            if len(value)==8 and value.isdigit():item[key]=f'{value[:4]}-{value[4:6]}-{value[6:]}'
    return checks(item,regions.get(code))[2]

def collect_all():
    initialize()
    work=ROOT/'runtime'/'trip-all';work.mkdir(parents=True,exist_ok=True)
    rawdir=work/'raw';rawdir.mkdir(exist_ok=True)
    checkpoint=work/'checkpoint.json';progress=work/'progress.json'
    state=json.loads(checkpoint.read_text(encoding='utf-8')) if checkpoint.exists() else {'phase':'listing','types':{code:{'page':1,'total':0,'listing_done':False,'cursor':0} for code in TYPES},'pending':[],'accepted':0,'rejected':0,'completed':0}
    fd=acquire_lock()
    started=time.monotonic();initial=state['completed']
    lists={code:json.loads((work/f'list-{code}.json').read_text(encoding='utf-8')) if (work/f'list-{code}.json').exists() else [] for code in TYPES}
    def save(status='running',current=''):
        write_json(checkpoint,state)
        total=sum(t['total'] for t in state['types'].values())
        completed=state['completed'];delta=completed-initial
        eta=round((time.monotonic()-started)*(total-completed)/delta) if delta else None
        write_json(progress,{'status':status,'phase':state['phase'],'listed':sum(len(v) for v in lists.values()),'total':total,'completed':completed,'accepted':state['accepted'],'rejected':state['rejected'],'current_item':current,'eta_seconds':eta,'updated_at':datetime.now(timezone.utc).isoformat()})
    def publish():
        if not state['pending']:return
        records=[json.loads((rawdir/f'{ident}.json').read_text(encoding='utf-8')) for ident in state['pending']]
        with SessionLocal() as db:
            regions={r.code:r for r in db.scalars(select(Region).where(Region.level=='city',Region.code_system=='MOIS_LEGAL',Region.status=='active')).all()}
            good=[];bad=[]
            for record in records:(good if valid_record(record,regions) else bad).append(record)
            if bad:
                job=ingest(db,bad,publish=False)
                if job.status!='rejected':raise RuntimeError('검수 대기 저장 실패')
            if good:
                job=ingest(db,good)
                if job.status!='completed':raise RuntimeError('공개 버전 생성 실패')
        state['accepted']+=len(good);state['rejected']+=len(bad);state['pending']=[];save()
    try:
        save();publish()
        with httpx.Client(timeout=30) as client:
            api=TourAPI(os.getenv('TOURAPI_SERVICE_KEY',''),ROOT/'runtime'/'tourapi-budget.json',int(os.getenv('TOURAPI_DAILY_LIMIT','1000')),client)
            for code in TYPES:
                info=state['types'][code]
                while not info['listing_done']:
                    batch=api.call('areaBasedList2',contentTypeId=code,numOfRows=50,pageNo=info['page'],arrange='A')
                    info['total']=batch['total']
                    # Page persistence is idempotent if interrupted between files.
                    known={str(r['contentid']) for r in lists[code]}
                    lists[code].extend(r for r in batch['items'] if str(r['contentid']) not in known)
                    write_json(work/f'list-{code}.json',lists[code])
                    info['page']+=1;info['listing_done']=not batch['items'] or (info['page']-1)*50>=batch['total']
                    save(current=f'원천 ID 목록 {code}')
            state['phase']='details';save()
            # Rotate types so partial publication covers places, facilities, sports and events.
            while any(state['types'][code]['cursor']<len(lists[code]) for code in TYPES):
                for code in TYPES:
                    info=state['types'][code]
                    if info['cursor']>=len(lists[code]):continue
                    record=dict(lists[code][info['cursor']]);ident=str(record['contentid'])
                    if not ident.isdigit():raise RuntimeError('잘못된 원천 ID')
                    partial=rawdir/f'{ident}.common.json'
                    if partial.exists():record=json.loads(partial.read_text(encoding='utf-8'))
                    else:
                        common=api.call('detailCommon2',contentId=ident)['items']
                        if common:record.update(common[0])
                        write_json(partial,record)
                    intro=api.call('detailIntro2',contentId=ident,contentTypeId=code)['items']
                    if intro:record.update(intro[0]);record['_intro_raw']=intro[0]
                    record['source_url']='https://www.data.go.kr/data/15101578/openapi.do'
                    write_json(rawdir/f'{ident}.json',record)
                    state['pending'].append(ident);info['cursor']+=1;state['completed']+=1;save(current=record.get('title',''))
                    partial.unlink(missing_ok=True)
                    if len(state['pending'])>=25:publish()
            publish();state['phase']='completed';save('completed')
            print('전체 수집 완료')
    except ValueError as error:
        publish()
        status='paused_budget' if '예산' in str(error) else 'paused_error'
        save(status)
        print(f'{status}: 완료 {state["completed"]}, 공개 가능 {state["accepted"]}, 검수 대기 {state["rejected"]}. 같은 명령으로 재개합니다.')
        if status=='paused_error':raise SystemExit(1)
    except Exception:
        save('paused_error')
        raise
    finally:os.close(fd)

if __name__=='__main__':collect_all()
