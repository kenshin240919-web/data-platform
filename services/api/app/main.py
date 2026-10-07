from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
import hmac
import math
from pathlib import Path
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from . import config
from .db import SessionLocal, get_db, initialize
from .models import Dataset, Event, Profile, Region, SyncLog, Validation
from .pipeline import active_dataset
from .tourapi import lock_busy

KST=timezone(timedelta(hours=9))
def today(): return datetime.now(KST).date()

@asynccontextmanager
async def lifespan(app):
    if config.ENV != 'production':
        initialize()
        if config.DATA_MODE=='demo':
            from .demo import seed
            with SessionLocal() as session: seed(session)
    yield

app=FastAPI(title='GuideJung Data API',version='0.1.0',lifespan=lifespan,docs_url=None if config.ENV=='production' else '/docs')

def admin(x_admin_token: str | None=Header(default=None)):
    if not config.ADMIN_TOKEN: raise HTTPException(503,'관리자 토큰을 설정해야 합니다.')
    if not hmac.compare_digest((x_admin_token or '').encode(),config.ADMIN_TOKEN.encode()): raise HTTPException(401,'관리자 인증이 필요합니다.')

from .review import router as review_router
app.include_router(review_router,prefix='/v1/admin',dependencies=[Depends(admin)])

@app.post('/v1/admin/sync',dependencies=[Depends(admin)],status_code=202)
def start_sync(tasks:BackgroundTasks):
    if lock_busy():raise HTTPException(409,'수집 또는 동기화가 이미 실행 중입니다.')
    from .sync_trip import run
    from .full_trip import write_json
    path=config.ROOT/'runtime'/'trip-sync';path.mkdir(exist_ok=True)
    write_json(path/'progress.json',{'status':'queued','changed':0})
    def execute():
        try:run()
        except Exception:write_json(path/'progress.json',{'status':'failed','changed':0,'error':'동기화 실패. 이전 공개 버전을 유지합니다.'})
    tasks.add_task(execute)
    return {'status':'queued'}

def dataset(session): return active_dataset(session,config.DATA_MODE=='demo')

def view(profile, version, event=None):
    data=dict(profile.snapshot)
    from datetime import date
    try:fresh=0<=(today()-date.fromisoformat(data.get('verified_at') or '')).days<=30
    except (ValueError,TypeError):fresh=False
    conditions=dict(profile.conditions)
    for key,fact in profile.evidence.items():
        try:valid=0<=(today()-date.fromisoformat(fact.get('verified_at',''))).days<=config.CONDITION_MAX_AGE_DAYS
        except (ValueError,TypeError):valid=False
        if not valid:conditions[key]=None
    data.update(description=profile.description,hours=profile.hours,fee=profile.fee,phone=profile.phone,conditions=conditions,evidence=profile.evidence,quality_score=profile.quality_score,indexable=profile.indexable and config.SEO_ENABLED and fresh,dataset_id=version.id,kind=profile.kind,updated_at=version.published_at.isoformat() if version.published_at else None)
    if event: data.update(start_date=event.start_date,end_date=event.end_date,event_status='ended' if event.status=='scheduled' and event.end_date<today().isoformat() else event.status)
    return data

@app.get('/admin',include_in_schema=False)
def admin_page():
    # Local review screen only; the public site is a static export without admin.
    if config.ENV=='production':raise HTTPException(404)
    return HTMLResponse((Path(__file__).parent/'admin.html').read_text(encoding='utf-8'),headers={'Cache-Control':'no-store'})

@app.get('/health')
def health(db:Session=Depends(get_db)):
    db.execute(text('SELECT 1'))
    return {'status':'ok','service':'guidejung-data','mode':config.DATA_MODE}

@app.get('/v1/status')
def status(db:Session=Depends(get_db)):
    current=dataset(db)
    profiles=db.scalars(select(Profile).where(Profile.dataset_id==current.id)).all() if current else []
    profiles=[p for p in profiles if p.snapshot.get('review_status')!='rejected' and not p.snapshot.get('source_hidden')]
    return {'mode':config.DATA_MODE,'available':current is not None,'dataset_id':current.id if current else None,'updated_at':current.published_at.isoformat() if current else None,'place_count':sum(p.kind=='place' for p in profiles),'festival_count':sum(p.kind=='festival' for p in profiles),'indexable_count':sum(p.indexable for p in profiles) if config.SEO_ENABLED else 0,'seo_enabled':config.SEO_ENABLED,'services':[{'id':'trip','available':True},{'id':'traffic','available':False},{'id':'academy','available':False},{'id':'charge','available':False},{'id':'weather','available':False}]}

@app.get('/v1/regions')
def regions(db:Session=Depends(get_db)):
    current=dataset(db)
    if not current: return {'items':[]}
    profiles=db.scalars(select(Profile).where(Profile.dataset_id==current.id)).all()
    counts={}
    for p in profiles:
        if p.snapshot.get('review_status')=='rejected' or p.snapshot.get('source_hidden'):continue
        rid=p.snapshot['region_id'];counts[rid]=counts.get(rid,0)+1
    rows=db.scalars(select(Region).where(Region.id.in_(counts),Region.status=='active')).all()
    return {'items':[{'id':r.id,'name':r.name,'code':r.code,'count':counts[r.id]} for r in rows]}

@app.get('/v1/search')
def search(q:str='',region:str='',condition:str='',kind:str='',when:str='',date_from:str='',date_to:str='',page:int=Query(1,ge=1),limit:int=Query(12,ge=1,le=50),lat:float | None=Query(None,ge=-90,le=90),lon:float | None=Query(None,ge=-180,le=180),radius_km:float=Query(20,gt=0,le=100),db:Session=Depends(get_db)):
    if len(q)>200: raise HTTPException(422,'검색어는 200자 이하여야 합니다.')
    if condition and condition not in {'free','kids','pet','indoor'}: raise HTTPException(422,'지원하지 않는 조건입니다.')
    if kind and kind not in {'place','festival'}: raise HTTPException(422,'지원하지 않는 유형입니다.')
    if when and when not in {'today','weekend'}: raise HTTPException(422,'지원하지 않는 날짜 조건입니다.')
    if (lat is None)!=(lon is None): raise HTTPException(422,'위도와 경도를 함께 전달하세요.')
    current=dataset(db)
    if not current:return {'items':[],'total':0,'page':page,'pages':0,'dataset_id':None,'mode':config.DATA_MODE}
    stmt=select(Profile).where(Profile.dataset_id==current.id)
    if kind:stmt=stmt.where(Profile.kind==kind)
    if region:stmt=stmt.where(Profile.snapshot['region_id'].as_string()==region)
    if condition:stmt=stmt.where(Profile.conditions[condition].as_boolean()==True)
    profiles=db.scalars(stmt).all()
    events={e.place_id:e for e in db.scalars(select(Event).where(Event.dataset_id==current.id)).all()}
    start=end=None
    if when=='today':start=end=today()
    elif when=='weekend':
        current_day=today();start=current_day-timedelta(days=1) if current_day.weekday()==6 else current_day+timedelta(days=(5-current_day.weekday())%7);end=start+timedelta(days=1)
    elif date_from or date_to:
        from datetime import date
        try:start=date.fromisoformat(date_from or date_to);end=date.fromisoformat(date_to or date_from)
        except ValueError:raise HTTPException(422,'날짜 형식을 확인하세요.')
        if start>end:raise HTTPException(422,'종료일이 시작일보다 빠릅니다.')
    items=[]
    for profile in profiles:
        if profile.snapshot.get('review_status')=='rejected' or profile.snapshot.get('source_hidden'):continue
        item=view(profile,current,events.get(profile.place_id))
        if condition and item['conditions'].get(condition) is not True:continue
        if q and q.casefold() not in ' '.join(str(item.get(k,'')) for k in ('name','address','region_name','description')).casefold():continue
        if start:
            event=events.get(profile.place_id)
            if not event or event.status!='scheduled' or event.end_date<start.isoformat() or event.start_date>end.isoformat():continue
        if lat is not None:
            plat=item.get('latitude');plon=item.get('longitude')
            if plat is None or plon is None:continue
            a=math.sin(math.radians(plat-lat)/2)**2+math.cos(math.radians(lat))*math.cos(math.radians(plat))*math.sin(math.radians(plon-lon)/2)**2
            item['distance_km']=round(6371*2*math.asin(min(1,math.sqrt(a))),2)
            if item['distance_km']>radius_km:continue
        items.append(item)
    items.sort(key=lambda i:(i.get('distance_km',0),-i['quality_score'],i['name']))
    total=len(items)
    return {'items':items[(page-1)*limit:page*limit],'total':total,'page':page,'pages':math.ceil(total/limit),'dataset_id':current.id,'mode':config.DATA_MODE}

@app.get('/v1/places/{place_id}')
def detail(place_id:str,db:Session=Depends(get_db)):
    current=dataset(db)
    if not current:raise HTTPException(404,'공개 데이터가 없습니다.')
    profile=db.scalar(select(Profile).where(Profile.dataset_id==current.id,Profile.place_id==place_id))
    if not profile:raise HTTPException(404,'장소를 찾을 수 없습니다.')
    if profile.snapshot.get('review_status')=='rejected' or profile.snapshot.get('source_hidden'):raise HTTPException(404,'공개 중인 정보가 아닙니다.')
    event=db.scalar(select(Event).where(Event.dataset_id==current.id,Event.place_id==place_id))
    return view(profile,current,event)

@app.get('/v1/sitemap')
def sitemap(db:Session=Depends(get_db)):
    current=dataset(db)
    if not current or current.is_demo or not config.SEO_ENABLED:return {'items':[]}
    profiles=db.scalars(select(Profile).where(Profile.dataset_id==current.id,Profile.indexable==True)).all()
    return {'items':[{'path':('/festival/' if p.kind=='festival' else '/place/')+p.place_id,'lastmod':current.published_at.isoformat()} for p in profiles if view(p,current)['indexable']]}

@app.get('/v1/admin/overview',dependencies=[Depends(admin)])
def overview(db:Session=Depends(get_db)):
    jobs=db.scalars(select(SyncLog).order_by(SyncLog.started_at.desc()).limit(20)).all()
    result=[]
    for job in jobs:
        elapsed=(datetime.now(timezone.utc)-job.started_at.replace(tzinfo=timezone.utc)).total_seconds()
        eta=round(elapsed*(job.total-job.completed)/job.completed) if job.status=='running' and job.completed else None
        result.append({'id':job.id,'status':job.status,'total':job.total,'completed':job.completed,'rejected':job.rejected,'current_item':job.current_item,'eta_seconds':eta,'error':job.error})
    checks=db.scalars(select(Validation).where(Validation.passed==False).limit(100)).all()
    import json
    progress_path=config.ROOT/'runtime'/f'trip{config.COLLECTION_TARGET}'/'progress.json'
    collection=json.loads(progress_path.read_text(encoding='utf-8')) if progress_path.exists() else None
    sync_path=config.ROOT/'runtime'/'trip-sync'/'progress.json'
    sync=json.loads(sync_path.read_text(encoding='utf-8')) if sync_path.exists() else None
    return {'jobs':result,'collection':collection,'sync':sync,'issues':[{'external_id':v.external_id,'rule':v.rule,'reason':v.reason} for v in checks]}

