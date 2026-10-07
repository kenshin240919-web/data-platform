from copy import deepcopy
from datetime import date, datetime, timezone
from uuid import NAMESPACE_URL, uuid5
from sqlalchemy import select
from .models import Dataset, Event, PagePolicy, Place, PlaceSource, Profile, RawRecord, Region, Source, SyncLog, Validation, now
from .validation import checks, digest, normalize

def stable(source, external): return str(uuid5(NAMESPACE_URL, f'guidejung-data:{source}:{external}'))

def active_dataset(session, demo=False):
    return session.scalars(select(Dataset).where(Dataset.status=='published',Dataset.is_demo==demo).order_by(Dataset.published_at.desc()).limit(1)).first()

def ingest(session, records, source_id='tourapi', demo=False, publish=True):
    """Immutable versioned profiles. Failed imports never replace the published version."""
    source=session.get(Source,source_id)
    if not source:
        session.add(Source(id=source_id,name='로컬 샘플' if demo else '한국관광공사 TourAPI',url='https://www.data.go.kr/data/15101578/openapi.do',api_version='sample-v1' if demo else 'KorService2',license='이미지별 권리 확인 필요'))
        session.commit()
        source=session.get(Source,source_id)
    previous=active_dataset(session,demo)
    dataset=Dataset(source_id=source_id,is_demo=demo)
    session.add(dataset);session.flush()
    job=SyncLog(dataset_id=dataset.id,total=len(records));session.add(job);session.commit()
    incoming={str(r.get('contentid') or '') for r in records}
    try:
        # Incremental inputs preserve previous unaffected records in the new snapshot.
        if previous:
            for profile in session.scalars(select(Profile).where(Profile.dataset_id==previous.id)).all():
                old_source=session.scalar(select(PlaceSource).where(PlaceSource.place_id==profile.place_id,PlaceSource.source_id==source_id))
                if old_source and old_source.external_id in incoming: continue
                values={c.name:deepcopy(getattr(profile,c.name)) for c in Profile.__table__.columns if c.name not in {'id','dataset_id'}}
                session.add(Profile(dataset_id=dataset.id,**values))
                for event in session.scalars(select(Event).where(Event.dataset_id==previous.id,Event.place_id==profile.place_id)).all():
                    ev={c.name:deepcopy(getattr(event,c.name)) for c in Event.__table__.columns if c.name not in {'id','dataset_id'}}
                    session.add(Event(dataset_id=dataset.id,**ev))
        seen=set()
        for raw in records:
            # RAW precedes normalization and contains no request credentials.
            if any('key' in k.lower() or 'token' in k.lower() for k in raw):
                raise ValueError('RAW 레코드에 인증정보가 포함되어 있습니다.')
            external=str(raw.get('contentid') or '')
            session.add(RawRecord(dataset_id=dataset.id,endpoint='import',external_id=external,payload=raw,checksum=digest(raw)))
            item=normalize(raw)
            province=item['legal_province'];city=item['legal_city']
            code=city if len(city)==5 else province+city if len(province)==2 and len(city)==3 else ''
            region=session.scalars(select(Region).where(Region.code==code,Region.code_system=='MOIS_LEGAL',Region.level=='city',Region.status=='active').order_by(Region.valid_from.desc())).first() if code else None
            if not region and demo: region=session.get(Region,raw.get('demo_region_id',''))
            if item['kind']=='festival':
                for key in ('start_date','end_date'):
                    value=item[key]
                    if len(value)==8 and value.isdigit(): item[key]=f'{value[:4]}-{value[4:6]}-{value[6:]}'
            flags,score,valid=checks(item,region)
            if external in seen:
                flags.append(('duplicate',False,'입력 내 원천 ID 중복'));valid=False
            seen.add(external)
            for rule,passed,reason in flags: session.add(Validation(dataset_id=dataset.id,external_id=external,rule=rule,passed=passed,reason=reason))
            job.completed+=1;job.current_item=item['name']
            if not valid:
                job.rejected+=1;session.commit();continue
            dataset.region_version_id=region.version_id
            place_id=stable(source_id,external)
            place=session.get(Place,place_id)
            if not place:
                place=Place(id=place_id,name=item['name'],address_raw=item['address_raw'],address=item['address'],province_id=region.parent_id,region_id=region.id,latitude=item['latitude'],longitude=item['longitude'])
                session.add(place);session.flush()
            ps=session.scalar(select(PlaceSource).where(PlaceSource.source_id==source_id,PlaceSource.external_id==external))
            if not ps:
                ps=PlaceSource(place_id=place_id,source_id=source_id,external_id=external,record_hash=digest(raw))
                session.add(ps)
            ps.fetched_at=now();ps.record_hash=digest(raw);ps.source_modified_at=item['source_modified_at']
            reviewed=False;content_verified=False
            verified_at=raw.get('verified_at')
            if verified_at and raw.get('reviewer') and raw.get('review_status','approved')=='approved':
                try:
                    verified=date.fromisoformat(verified_at)
                    age=(date.today()-verified).days
                    content_verified=0<=age<=30
                    reviewed=content_verified and raw.get('boundary_verified') is True
                except (ValueError,TypeError): pass
            indexable=not demo and reviewed and score>=80 and len(item['description'])>=80
            snapshot={**item,'id':place_id,'region_id':region.id,'region_name':region.name,'verified_at':verified_at if content_verified else None,'source_url':raw.get('source_url') or source.url if source else 'https://www.data.go.kr/data/15101578/openapi.do','is_demo':demo}
            # De-duplicate candidate places remain separate until a reviewer merges identity.
            session.add(Profile(place_id=place_id,dataset_id=dataset.id,snapshot=snapshot,kind=item['kind'],description=item['description'],hours=item['hours'],closed_days=item['closed_days'],fee=item['fee'],phone=item['phone'],official_url=item['official_url'],conditions=item['conditions'],evidence=item['evidence'],quality_score=score,indexable=indexable and item['review_status']!='rejected' and not item['source_hidden']))
            if item['kind']=='festival':
                session.add(Event(dataset_id=dataset.id,place_id=place_id,external_id=external+':'+item['start_date'],series_id=place_id,name=item['name'],start_date=item['start_date'],end_date=item['end_date'],status='scheduled',organizer=item['organizer']))
            path=('/festival/' if item['kind']=='festival' else '/place/')+place_id
            session.add(PagePolicy(path=path,dataset_id=dataset.id,indexable=indexable,reason='검수 통과' if indexable else '샘플 또는 최신성/지역경계 검수 대기'))
            session.commit()
        if not records or job.rejected:
            dataset.status='rejected';job.status='rejected';job.error='비어 있는 입력 또는 검증 실패. 이전 공개 버전을 유지합니다.'
        elif publish:
            dataset.status='published';dataset.published_at=now();job.status='completed'
        else:
            dataset.status='review';job.status='review'
        job.finished_at=now();session.commit()
    except Exception:
        session.rollback()
        dataset=session.get(Dataset,dataset.id);job=session.get(SyncLog,job.id)
        dataset.status='failed';job.status='failed';job.error='수집/정규화 실패. 비공개 원본과 서버 로그를 확인하세요.';job.finished_at=now();session.commit()
        raise
    return job

