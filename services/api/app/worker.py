"""Local CLI only: API keys never pass through the public web app."""
import argparse, csv, json, os, time
from datetime import datetime, timezone
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5
import httpx
from sqlalchemy import select
from .config import ROOT
from .db import SessionLocal, initialize
from .models import Region, RegionVersion
from .pipeline import ingest
from .validation import digest

def import_regions(path):
    data=Path(path).read_bytes()
    try: content=data.decode('utf-8-sig')
    except UnicodeDecodeError: content=data.decode('cp949')
    rows=list(csv.DictReader(content.splitlines(),delimiter='\t' if '\t' in content.splitlines()[0] else ','))
    checksum=digest(content);version_id=checksum[:36]
    with SessionLocal() as db:
        if db.get(RegionVersion,version_id):return
        db.add(RegionVersion(id=version_id,source='행정표준코드 법정동 원장',as_of=datetime.now(timezone.utc).date().isoformat(),checksum=checksum));db.flush()
        # Single-tier municipalities can lack a separate province row (e.g. Sejong).
        active=[r for r in rows if r.get('폐지여부','존재').strip() in {'존재','현존','N'}]
        provinces={r['법정동코드'][:2]:r['법정동명'].strip() for r in active if r['법정동코드'][2:]=='00000000'}
        for r in active:
            if r['법정동코드'][5:]=='00000':provinces.setdefault(r['법정동코드'][:2],r['법정동명'].strip().split()[0])
        for code,name in provinces.items():
            rid=str(uuid5(NAMESPACE_URL,'MOIS_LEGAL:'+code))
            if not db.get(Region,rid):db.add(Region(id=rid,version_id=version_id,code_system='MOIS_LEGAL',code=code,name=name,level='province',parent_id=None))
        db.flush()
        for row in rows:
            code=(row.get('법정동코드') or '').strip();name=(row.get('법정동명') or '').strip()
            if len(code)!=10 or not code.isdigit() or not name:raise ValueError('공식 법정동코드/법정동명 열이 필요합니다.')
            if row.get('폐지여부','존재').strip() not in {'존재','현존','N'}:continue
            if code[2:]=='00000000':short=code[:2];level='province';parent=None
            elif code[5:]=='00000':short=code[:5];level='city';parent=str(uuid5(NAMESPACE_URL,'MOIS_LEGAL:'+code[:2]))
            else:continue
            rid=str(uuid5(NAMESPACE_URL,'MOIS_LEGAL:'+short));region=db.get(Region,rid)
            if region:region.version_id=version_id;region.name=name;region.status='active'
            else:db.add(Region(id=rid,version_id=version_id,code_system='MOIS_LEGAL',code=short,name=name,level=level,parent_id=parent))
            db.flush()
        db.commit()
    print('공식 지역 원장 가져오기 완료')

from .tourapi import collect

def main():
    parser=argparse.ArgumentParser();subs=parser.add_subparsers(dest='command',required=True)
    subs.add_parser('regions').add_argument('file')
    collector=subs.add_parser('collect')
    collector.add_argument('--limit',type=int,default=20,choices=range(1,51))
    collector.add_argument('--pages',type=int,default=1,choices=range(1,101))
    collector.add_argument('--region',default='')
    collector.add_argument('--content-type',default='12',choices=['12','14','15','25','28','32','38','39'])
    collector.add_argument('--festivals',action='store_true')
    collector.add_argument('--start-date',default='')
    collector.add_argument('--resume',action='store_true')
    imp=subs.add_parser('import');imp.add_argument('file');imp.add_argument('--review-only',action='store_true')
    args=parser.parse_args();initialize()
    if args.command=='regions':import_regions(args.file)
    elif args.command=='collect':collect(args)
    else:
        records=json.loads(Path(args.file).read_text(encoding='utf-8-sig'))
        if not isinstance(records,list):raise ValueError('JSON 레코드 배열이 필요합니다.')
        with SessionLocal() as db:
            job=ingest(db,records,publish=not args.review_only)
            print(f'{job.status}: {job.completed}/{job.total}, 검증 실패 {job.rejected}')
            if job.status not in {'completed','review'}:raise SystemExit(1)

if __name__=='__main__':main()

