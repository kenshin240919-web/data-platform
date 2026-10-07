"""Prepare primary-source evidence. Approval requires a separate reviewer decision file."""
import argparse,json,os,re,socket,ipaddress
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from urllib.parse import urlparse
import httpx
from sqlalchemy import select
from .config import ROOT
from .db import SessionLocal
from .models import Profile,Region
from .pipeline import active_dataset,ingest
from .review import raw_for
from .tourapi import TourAPI,KST,acquire_lock
from .validation import normalize,clean,digest
from .full_trip import write_json,valid_record

WORK=ROOT/'runtime'/'content-audit-200'

def public_url(url):
    parsed=urlparse(url)
    if parsed.scheme not in {'https','http'} or not parsed.hostname or parsed.username or parsed.port not in {None,80,443}:return False
    try:return all(ipaddress.ip_address(row[4][0]).is_global for row in socket.getaddrinfo(parsed.hostname,parsed.port or (443 if parsed.scheme=='https' else 80)))
    except (OSError,ValueError):return False

def read_homepage(item):
    url=item['official_url']
    if not url:return {'status':'not_provided'}
    try:
        with httpx.Client(timeout=12,follow_redirects=False) as client:
            for _ in range(4):
                if not public_url(url):return {'status':'blocked_url','url':item['official_url']}
                with client.stream('GET',url,headers={'User-Agent':'GuideJung-Content-Review/1.0'}) as response:
                    if response.is_redirect:
                        from urllib.parse import urljoin
                        url=urljoin(url,response.headers['location']);continue
                    data=b''
                    for chunk in response.iter_bytes():
                        data+=chunk
                        if len(data)>2000000:break
                    if response.status_code!=200:return {'status':'http_error','http_status':response.status_code,'url':url}
                    meta=re.search(br'charset\s*=\s*[\"\']?([\w-]+)',data[:5000],re.I)
                    encoding=meta.group(1).decode() if meta else response.encoding or 'utf-8'
                    try:text=data.decode(encoding,errors='replace')
                    except LookupError:text=data.decode('utf-8',errors='replace')
                    text=re.sub(r'<(script|style)\b[^>]*>.*?</\1>','',text,flags=re.S|re.I)
                    text=clean(text)
                    matched=item['name'].replace(' ','') in text.replace(' ','')
                    return {'status':'name_found' if matched else 'generic_or_unconfirmed','url':url,'text':text[:70000],'checksum':digest(text),'fetched_at':datetime.now(KST).isoformat()}
    except Exception:return {'status':'unavailable','url':item['official_url']}
    return {'status':'redirect_limit','url':item['official_url']}

def prepare():
    WORK.mkdir(exist_ok=True);evidence=WORK/'evidence';evidence.mkdir(exist_ok=True)
    with SessionLocal() as db:
        current=active_dataset(db)
        profiles=db.scalars(select(Profile).where(Profile.dataset_id==current.id)).all()
        if len(profiles)!=200:raise ValueError('공개 대상 200건 수집 후 검수를 시작하세요.')
        records=[raw_for(db,p.place_id) for p in profiles]
        regions={r.code:r for r in db.scalars(select(Region).where(Region.level=='city',Region.code_system=='MOIS_LEGAL',Region.status=='active')).all()}
    fd=acquire_lock()
    rows=[]
    try:
        with httpx.Client(timeout=30) as client:
            api=TourAPI(os.getenv('TOURAPI_SERVICE_KEY',''),ROOT/'runtime'/'tourapi-budget.json',int(os.getenv('TOURAPI_DAILY_LIMIT','1000')),client)
            for index,original in enumerate(records):
                ident=str(original['contentid']);path=evidence/f'{ident}.json'
                if path.exists():row=json.loads(path.read_text(encoding='utf-8'))
                else:
                    common=api.call('detailCommon2',contentId=ident)['items']
                    intro=api.call('detailIntro2',contentId=ident,contentTypeId=original['contenttypeid'])['items']
                    record=dict(original)
                    if common:record.update(common[0])
                    if intro:record.update(intro[0]);record['_intro_raw']=intro[0]
                    item=normalize(record)
                    source_ok=bool(common and str(common[0].get('contentid'))==ident and clean(common[0].get('title'))==item['name'] and valid_record(record,regions))
                    row={'id':ident,'source_ok':source_ok,'fetched_at':datetime.now(KST).isoformat(),'common':common,'intro':intro,'record':record,'item':item,'source_checksum':digest({'common':common,'intro':intro})}
                    write_json(path,row)
                rows.append(row)
                write_json(WORK/'progress.json',{'status':'source_checking','completed':index+1,'total':200,'current_item':row['item']['name']})
        with ThreadPoolExecutor(max_workers=8) as pool:
            pages=list(pool.map(lambda row:read_homepage(row['item']),rows))
        for row,page in zip(rows,pages):
            row['homepage_check']=page;write_json(evidence/f'{row["id"]}.json',row)
        write_json(WORK/'summary.json',[{'id':r['id'],'name':r['item']['name'],'address':r['item']['address'],'fee':r['item']['fee'],'hours':r['item']['hours'],'closed_days':r['item']['closed_days'],'dates':[r['item']['start_date'],r['item']['end_date']],'description':r['item']['description'],'pet':r['item']['pet_policy'],'source_ok':r['source_ok'],'homepage_status':r['homepage_check']['status'],'official_url':r['item']['official_url']} for r in rows])
        write_json(WORK/'progress.json',{'status':'awaiting_reviewer_decisions','completed':200,'total':200})
        print(f'공식 원천 대조 {len(rows)}건. 검수자 결정 파일을 확인한 뒤 승인합니다.')
    finally:os.close(fd)

def publish():
    decisions=json.loads((WORK/'decisions.json').read_text(encoding='utf-8'))
    files=list((WORK/'evidence').glob('*.json'));records=[]
    day=datetime.now(KST).date().isoformat()
    for file in files:
        row=json.loads(file.read_text(encoding='utf-8'));decision=decisions.get(row['id'])
        if not decision or not decision.get('approved') or not row['source_ok']:raise ValueError('원천 확인과 검수자 승인이 모두 필요합니다.')
        record=dict(row['record'])
        corrections=decision.get('corrections',{})
        allowed={'overview','usetime','usetimeculture','restdateculture','usefeeculture'}
        if set(corrections)-allowed:raise ValueError('검수 수정 허용 필드 외 변경')
        record.update(corrections)
        record.update(review_status='approved',reviewer='Codex · 사용자 위임 검수',verified_at=day,boundary_verified=False,review_note=decision['note'])
        record['condition_evidence']=decision.get('conditions',{})
        record['_content_audit']={'source_checksum':row['source_checksum'],'fetched_at':row['fetched_at'],'homepage_status':row['homepage_check']['status'],'reviewer':'Codex','boundary_verified':False,'corrections':corrections,'scope':'official_source_content','decision':decision}
        records.append(record)
    if len(records)!=200:raise ValueError('200건 전체 검수 근거가 필요합니다.')
    with SessionLocal() as db:
        job=ingest(db,records)
        if job.status!='completed':raise ValueError('승인 버전 검증 실패')
    write_json(WORK/'progress.json',{'status':'approved','completed':200,'total':200,'dataset_id':job.dataset_id})
    print('200건의 원천 내용 대조 및 위임 검수 승인 완료. 공간 경계 검수는 미확인, SEO 비활성 유지.')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['prepare','publish']);args=parser.parse_args()
    prepare() if args.action=='prepare' else publish()
