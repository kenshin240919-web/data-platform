"""Export the published dataset for the static Cloudflare site (apps/trip/data/trip.json)."""
import json
from sqlalchemy import select
from . import config
from .db import SessionLocal
from .main import dataset, regions, sitemap, status, view
from .models import Event, Profile

TARGET=config.ROOT/'apps'/'trip'/'data'/'trip.json'

def export(target=TARGET,force=False):
    with SessionLocal() as db:
        current=dataset(db)
        if not current:raise SystemExit('공개 데이터가 없습니다. 수집·가져오기를 먼저 실행하세요.')
        events={e.place_id:e for e in db.scalars(select(Event).where(Event.dataset_id==current.id)).all()}
        items=[view(p,current,events.get(p.place_id)) for p in db.scalars(select(Profile).where(Profile.dataset_id==current.id)).all()
               if p.snapshot.get('review_status')!='rejected' and not p.snapshot.get('source_hidden')]
        data={'status':status(db),'regions':regions(db)['items'],'sitemap':sitemap(db)['items'],'items':sorted(items,key=lambda i:i['id'])}
    # A sudden drop usually means the wrong/empty DB was used; keep the published file instead.
    if target.exists() and not force:
        before=len(json.loads(target.read_text(encoding='utf-8'))['items'])
        if len(items)<before*0.9:raise SystemExit(f'공개 데이터가 {before}건 → {len(items)}건으로 크게 줄었습니다. 잘못된 DB일 수 있어 내보내지 않습니다. 의도한 경우 --force로 실행하세요.')
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print(f'정적 사이트 데이터 {len(items)}건 → {target}')

if __name__=='__main__':
    import sys;export(force='--force' in sys.argv)
