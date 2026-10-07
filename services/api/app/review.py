from copy import deepcopy
from datetime import datetime,timedelta,timezone
from typing import Literal
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,Field
from sqlalchemy import select
from .config import ROOT
from .db import get_db
from .models import Profile,PlaceSource,RawRecord
from .pipeline import active_dataset,ingest

router=APIRouter()

class Condition(BaseModel):
    value:bool|None=None
    source:str=Field(default='',max_length=2000)

class Review(BaseModel):
    place_id:str
    action:Literal['approve','reject']
    reviewer:str=Field(min_length=1,max_length=100)
    note:str=Field(min_length=1,max_length=2000)
    content_checked:bool=False
    boundary_checked:bool=False
    conditions:dict[str,Condition]=Field(default_factory=dict)

def raw_for(db,place_id):
    source=db.scalar(select(PlaceSource).where(PlaceSource.place_id==place_id,PlaceSource.source_id=='tourapi'))
    if not source:raise HTTPException(404,'원천 데이터를 찾을 수 없습니다.')
    raw=db.scalar(select(RawRecord).where(RawRecord.external_id==source.external_id).order_by(RawRecord.fetched_at.desc()).limit(1))
    if not raw:raise HTTPException(404,'원본을 찾을 수 없습니다.')
    return deepcopy(raw.payload)

@router.get('/queue')
def queue(db=Depends(get_db)):
    current=active_dataset(db)
    if not current:return {'items':[]}
    rows=db.scalars(select(Profile).where(Profile.dataset_id==current.id)).all()
    return {'items':[{'id':p.place_id,'kind':p.kind,'name':p.snapshot['name'],'address':p.snapshot['address'],'status':p.snapshot.get('review_status','pending'),'quality_score':p.quality_score,'conditions':p.conditions,'evidence':p.evidence,'source_hidden':p.snapshot.get('source_hidden',False)} for p in rows]}

@router.post('/review')
def review(payload:Review,db=Depends(get_db)):
    if (ROOT/'runtime'/'tourapi-budget.lock').exists():raise HTTPException(409,'수집 중입니다. 완료 후 검수 결과를 저장하세요.')
    current=active_dataset(db)
    profile=db.scalar(select(Profile).where(Profile.dataset_id==current.id,Profile.place_id==payload.place_id)) if current else None
    if not profile:raise HTTPException(404,'현재 버전의 장소를 찾을 수 없습니다.')
    if payload.action=='approve' and not payload.content_checked:raise HTTPException(422,'내용 확인 체크가 필요합니다.')
    if any(key not in {'free','kids','pet','indoor'} for key in payload.conditions):raise HTTPException(422,'지원하지 않는 조건입니다.')
    if any(value.value is not None and not value.source.strip() for value in payload.conditions.values()):raise HTTPException(422,'조건을 확정하려면 확인 근거가 필요합니다.')
    raw=raw_for(db,payload.place_id)
    day=datetime.now(timezone(timedelta(hours=9))).date().isoformat()
    raw.update(review_status='approved' if payload.action=='approve' else 'rejected',reviewer=payload.reviewer,review_note=payload.note,verified_at=day if payload.action=='approve' else None,boundary_verified=payload.boundary_checked)
    raw['condition_evidence']={key:{'value':value.value,'source':value.source,'verified_at':day} for key,value in payload.conditions.items() if value.value is not None}
    job=ingest(db,[raw])
    if job.status!='completed':raise HTTPException(422,'구조검증 실패로 이전 버전을 유지했습니다.')
    return {'status':'saved','dataset_id':job.dataset_id,'review_status':raw['review_status']}
