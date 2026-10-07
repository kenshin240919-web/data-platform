"""TourAPI adapter: bounded pagination, durable RAW/checkpoint, shared call budget."""
import json, os, time
from datetime import datetime, timedelta, timezone
from urllib.parse import unquote
import httpx
from .config import ROOT
from .validation import digest

KST=timezone(timedelta(hours=9))
BASE='https://apis.data.go.kr/B551011/KorService2/'

class TourAPI:
    def __init__(self,key,budget_path,limit=1000,client=None,sleep=time.sleep):
        if not key:raise ValueError('TOURAPI_SERVICE_KEY가 필요합니다.')
        self.key=unquote(key);self.path=budget_path;self.limit=limit;self.sleep=sleep
        self.client=client or httpx.Client(timeout=30)
    def call(self,endpoint,**params):
        if endpoint not in {'areaBasedList2','areaBasedSyncList2','searchFestival2','detailCommon2','detailIntro2','detailInfo2','detailPetTour2','detailImage2','ldongCode2'}:raise ValueError('허용하지 않은 TourAPI 기능입니다.')
        for attempt in range(3):
            day=datetime.now(KST).date().isoformat()
            budget=json.loads(self.path.read_text()) if self.path.exists() else {}
            if budget.get('day')!=day:budget={'day':day,'calls':0}
            if budget['calls']>=self.limit:raise ValueError('일일 호출 예산 도달. 다음 날 checkpoint부터 재개하세요.')
            budget['calls']+=1;self.path.write_text(json.dumps(budget));self.sleep(.3)
            try:
                response=self.client.get(BASE+endpoint,params={'serviceKey':self.key,'MobileOS':'WEB','MobileApp':'GuideJungData','_type':'json',**params})
                if response.status_code==429 or response.status_code>=500:
                    if attempt<2:self.sleep(2**attempt);continue
                response.raise_for_status();body=response.json()['response']
            except Exception:
                if attempt<2:self.sleep(2**attempt);continue
                raise ValueError('TourAPI 통신/응답 오류. 키·승인·현재 API 명세를 확인하세요.') from None
            code=str(body.get('header',{}).get('resultCode',''))
            if code not in {'0000','00'}:raise ValueError(f'TourAPI 결과코드 {code[:12]}. 인증정보는 로그에 기록하지 않습니다.')
            payload=body.get('body',{});container=payload.get('items') or {}
            items=container.get('item',[]) if isinstance(container,dict) else []
            return {'items':items if isinstance(items,list) else [items], 'total':int(payload.get('totalCount') or 0)}

def collect(args):
    work=ROOT/'runtime';work.mkdir(exist_ok=True)
    ledger=work/'tourapi-budget.json';lock=work/'tourapi-budget.lock'
    key=os.getenv('TOURAPI_SERVICE_KEY','')
    if not key:raise ValueError('먼저 .env의 TOURAPI_SERVICE_KEY를 입력하세요.')
    endpoint='searchFestival2' if args.festivals else 'areaBasedList2'
    params={'numOfRows':args.limit,'arrange':'C'}
    if args.festivals:params['eventStartDate']=args.start_date or datetime.now(KST).strftime('%Y%m%d')
    if args.region:params['lDongRegnCd']=args.region[:2];params['lDongSignguCd']=args.region[2:]
    if args.content_type and not args.festivals:params['contentTypeId']=args.content_type
    fingerprint=digest({'endpoint':endpoint,'params':params,'pages':args.pages})
    checkpoint=work/'tourapi-checkpoint.json'
    state=json.loads(checkpoint.read_text()) if args.resume and checkpoint.exists() else {'fingerprint':fingerprint,'page':1,'item':0,'records':[],'total':0,'complete':False}
    if state['fingerprint']!=fingerprint:raise ValueError('기존 checkpoint의 조회조건과 다릅니다. --resume을 빼거나 동일 조건을 사용하세요.')
    fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY)
    def save():
        checkpoint.write_text(json.dumps(state,ensure_ascii=False),encoding='utf-8')
        (work/'tourapi-progress.json').write_text(json.dumps({'status':'completed' if state['complete'] else 'collecting','page':state['page'],'completed':len(state['records']),'total':state['total'],'current_item':state.get('current','')},ensure_ascii=False),encoding='utf-8')
    try:
        with httpx.Client(timeout=30) as client:
            api=TourAPI(key,ledger,int(os.getenv('TOURAPI_DAILY_LIMIT','1000')),client)
            while not state['complete'] and state['page']<=args.pages:
                batch=api.call(endpoint,pageNo=state['page'],**params);state['total']=batch['total']
                if not batch['items']:state['complete']=True;save();break
                for index,record in enumerate(batch['items']):
                    if index<state['item']:continue
                    common=api.call('detailCommon2',contentId=record['contentid'])['items']
                    if common:record.update(common[0])
                    intro=api.call('detailIntro2',contentId=record['contentid'],contentTypeId=record['contenttypeid'])['items']
                    if intro:record.update(intro[0]);record['_intro_raw']=intro[0]
                    record['source_url']='https://www.data.go.kr/data/15101578/openapi.do'
                    state['records'].append(record);state['item']=index+1;state['current']=record.get('title','');save()
                state['page']+=1;state['item']=0
                if state['page']>args.pages or len(batch['items'])<args.limit:state['complete']=True
                save()
        output=work/'tourapi-sample.json';output.write_text(json.dumps(state['records'],ensure_ascii=False,indent=2),encoding='utf-8')
        print(f"RAW {len(state['records'])}건 / 원천 목록 {state['total']}건. 자동 검수 완료로 간주하지 않습니다.")
    finally:os.close(fd);lock.unlink()
