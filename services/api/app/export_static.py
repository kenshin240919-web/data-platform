"""Export the published dataset for trip.guidejung.com.

- runtime/trip-full.json: every place (detail pages, search, sitemap) → D1 via scripts/build-trip-d1.mjs (export-site.bat).
- apps/trip/data/trip.json: the small build file in git — status, regions, counts and card fields of the places the
  static pages show before the browser asks D1 (home, the first 24 of each list/region/condition page).
"""
import json
from datetime import datetime,timedelta,timezone
from sqlalchemy import select
from . import config
from .db import SessionLocal
from .main import dataset, regions, status, view
from .validation import KINDS
from .models import Event, Profile

TARGET=config.ROOT/'apps'/'trip'/'data'/'trip.json'
FULL=config.ROOT/'runtime'/'trip-full.json'
PER_LIST=24  # cards in the static HTML of each list page (packages/ui/src/index.tsx listing)
CARD=['id','name','kind','address','region_id','region_name','description','latitude','longitude','conditions','start_date','end_date',
      'event_status','quality_score','is_demo','verified_at','indexable','updated_at','source_modified_at']
CONDITIONS=['free','kids','pet','indoor']

def list_rank(p):
    """Same as listRank in packages/ui/src/search.ts: quality first, then photo and introduction length; "(구)…" names last."""
    return sum(map(ord,str(p['id'])))%97/100+(p.get('quality_score') or 0)*100+(40 if p.get('images') else 0)+min(len(p.get('description') or '')//20,40)-(30 if p['name'].startswith('(') else 0)
def rank(p):return (-list_rank(p),p['name'])

def build_file(full):
    """Card-only subset for the static build, plus totals so list pages show the real count."""
    # Lists leave ended festivals out (their detail pages stay in D1), so the static cards and totals do too.
    today=datetime.now(timezone(timedelta(hours=9))).date().isoformat()
    items=[p for p in full['items'] if not (p['kind']=='festival' and p.get('end_date') and p['end_date']<today)];keep={}
    def take(rows):
        for p in sorted(rows,key=rank)[:PER_LIST]:keep[p['id']]=p
    take(items)
    for kind in KINDS:take([p for p in items if p['kind']==kind])
    # Region and condition lists start with 가볼만한곳·축제 (맛집·숙소 behind chips): keep those first cards too.
    pf=[p for p in items if p['kind'] in ('place','festival')]
    for c in CONDITIONS:take([p for p in pf if (p.get('conditions') or {}).get(c) is True])
    by_region={};pf_region={}
    for p in items:by_region.setdefault(p['region_id'],[]).append(p)
    for p in pf:pf_region.setdefault(p['region_id'],[]).append(p)
    for rows in by_region.values():take(rows)
    for rows in pf_region.values():take(rows)
    counts={'all':len(items),**{f'kind:{k}':sum(p['kind']==k for p in items) for k in KINDS},
            **{f'condition:{c}':sum((p.get('conditions') or {}).get(c) is True for p in pf) for c in CONDITIONS},
            **{f'region:{r}':len(rows) for r,rows in by_region.items()},**{f'region:{r}:pf':len(rows) for r,rows in pf_region.items()}}
    slim=[{**{k:p.get(k) for k in CARD},'images':(p.get('images') or [])[:1]} for p in sorted(keep.values(),key=lambda p:p['id'])]
    return {'status':full['status'],'regions':full['regions'],'sitemap':[],'counts':counts,'subset':True,'items':slim}

def previous_count():
    """Places in the last export: the full file if this computer has one, else the totals in the git build file."""
    try:return len(json.loads(FULL.read_text(encoding='utf-8'))['items'])
    except (OSError,ValueError,KeyError):pass
    try:
        d=json.loads(TARGET.read_text(encoding='utf-8'))
        return d.get('counts',{}).get('all') or len(d['items'])
    except (OSError,ValueError,KeyError):return 0

def export(target=TARGET,full_target=FULL,force=False):
    with SessionLocal() as db:
        current=dataset(db)
        if not current:raise SystemExit('공개 데이터가 없습니다. 수집·가져오기를 먼저 실행하세요.')
        events={e.place_id:e for e in db.scalars(select(Event).where(Event.dataset_id==current.id)).all()}
        items=[view(p,current,events.get(p.place_id)) for p in db.scalars(select(Profile).where(Profile.dataset_id==current.id)).all()
               if p.snapshot.get('review_status')!='rejected' and not p.snapshot.get('source_hidden')]
        full={'status':status(db),'regions':regions(db)['items'],'items':sorted(items,key=lambda i:i['id'])}
    # A sudden drop usually means the wrong/empty DB was used; keep the published data instead.
    before=previous_count() if target==TARGET else 0
    if before and not force and len(items)<before*0.9:
        raise SystemExit(f'공개 데이터가 {before}건 → {len(items)}건으로 크게 줄었습니다. 잘못된 DB일 수 있어 내보내지 않습니다. 의도한 경우 --force로 실행하세요.')
    small=build_file(full)
    for path,data in ((full_target,full),(target,small)):
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print(f'전체 {len(items)}건 → {full_target} (D1용), 빌드용 {len(small["items"])}건 → {target}')

if __name__=='__main__':
    import sys;export(force='--force' in sys.argv)
