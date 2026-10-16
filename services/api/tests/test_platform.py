import os, sys, tempfile, unittest
from pathlib import Path
temp=tempfile.TemporaryDirectory()
os.environ['DATABASE_URL']='sqlite:///'+str(Path(temp.name)/'test.db')
os.environ['DATA_MODE']='demo'
os.environ['ADMIN_TOKEN']='test-only-token'
os.environ['SEO_ENABLED']='false'  # tests must not depend on the local .env
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from app.main import app
from app.db import SessionLocal, engine
from app.models import Profile
from app.pipeline import active_dataset, ingest, stable
from app.validation import normalize
from sqlalchemy import select

class PlatformTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.client=TestClient(app);cls.client.__enter__()
    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None,None,None)
        engine.dispose()
        temp.cleanup()
    def test_health_and_demo(self):
        self.assertEqual(self.client.get('/health').json()['mode'],'demo')
        self.assertEqual(self.client.get('/v1/status').json()['indexable_count'],0)
    def test_condition_needs_evidence(self):
        raw={'contentid':'1','title':'test','condition_evidence':{'free':{'value':True}}}
        self.assertIsNone(normalize(raw)['conditions']['free'])
    def test_region_and_condition_filter(self):
        rows=self.client.get('/v1/search?region=gangneung&condition=free').json()['items']
        self.assertTrue(rows)
        self.assertTrue(all(p['region_id']=='gangneung' and p['conditions']['free'] is True for p in rows))
    def test_weekend_only_events(self):
        rows=self.client.get('/v1/search?when=weekend').json()['items']
        self.assertTrue(rows)
        self.assertTrue(all(p['kind']=='festival' for p in rows))
    def test_failed_batch_keeps_publication(self):
        with SessionLocal() as db:
            before=active_dataset(db,True).id
            job=ingest(db,[{'contentid':'invalid','title':'bad','addr1':'서울','mapx':0,'mapy':0}],source_id='demo',demo=True)
            self.assertEqual(job.status,'rejected')
            self.assertEqual(active_dataset(db,True).id,before)
    def test_nearby_distance(self):
        rows=self.client.get('/v1/search?lat=37.5796&lon=126.977&radius_km=1').json()['items']
        self.assertTrue(rows)
        self.assertTrue(all(p['distance_km']<=1 for p in rows))
    def test_growth_collection_skips_known_and_publishes_at_daily_limit(self):
        from unittest.mock import patch
        from app import trip100
        from app.models import Region
        def raw(ident,**extra):return {'contentid':ident,'contenttypeid':'12','title':'성장 '+ident,'addr1':'서울특별시 중구 시험로','lDongRegnCd':'11','lDongSignguCd':'140','mapy':'37.56','mapx':'126.99',**extra}
        with SessionLocal() as db:
            if not db.get(Region,'growth-region'):db.add(Region(id='growth-region',version_id='demo-regions-v1',code_system='MOIS_LEGAL',code='11140',name='서울특별시 중구',level='city'));db.commit()
            self.assertEqual(ingest(db,[raw('g0',_images=[])]).status,'completed')
        detail_ids=[]
        class FakeAPI:
            def __init__(self,*args,**kwargs):pass
            def call(self,endpoint,**params):
                if endpoint=='areaBasedList2':return {'items':[raw(i) for i in ('g1','g2','g3')] if params['contentTypeId']=='12' and params['pageNo']==1 else [],'total':3}
                detail_ids.append(params['contentId'])
                if params['contentId']=='g2':raise ValueError('일일 호출 예산 도달. 다음 날 checkpoint부터 재개하세요.')
                return {'items':[],'total':0}
        (Path(temp.name)/'runtime').mkdir(exist_ok=True)
        with patch.object(trip100,'TourAPI',FakeAPI),patch.object(trip100,'ROOT',Path(temp.name)):trip100.run(100)
        self.assertNotIn('g0',detail_ids)  # already enriched: no API calls
        with SessionLocal() as db:
            names={p.snapshot['name'] for p in db.scalars(select(Profile).where(Profile.dataset_id==active_dataset(db).id))}
        self.assertIn('성장 g1',names);self.assertNotIn('성장 g2',names)
        import json
        self.assertEqual(json.loads((Path(temp.name)/'runtime'/'trip100'/'checkpoint.json').read_text(encoding='utf-8'))['status'],'paused_error_or_budget')
        self.assertIn('성장 g0',names)  # already published items stay in the new version
        # Next day: resumes after g1 (no second call for it) and publishes everything.
        detail_ids.clear()
        class NextDay(FakeAPI):
            def call(self,endpoint,**params):
                if endpoint=='areaBasedList2':return FakeAPI.call(self,endpoint,**params)
                detail_ids.append(params['contentId']);return {'items':[],'total':0}
        with patch.object(trip100,'TourAPI',NextDay),patch.object(trip100,'ROOT',Path(temp.name)):trip100.run(100)
        self.assertNotIn('g1',detail_ids);self.assertIn('g3',detail_ids)
        with SessionLocal() as db:
            names={p.snapshot['name'] for p in db.scalars(select(Profile).where(Profile.dataset_id==active_dataset(db).id))}
        self.assertTrue({'성장 g0','성장 g1','성장 g2','성장 g3'}<=names)
        state=json.loads((Path(temp.name)/'runtime'/'trip100'/'checkpoint.json').read_text(encoding='utf-8'))
        self.assertEqual(state['status'],'completed');self.assertTrue(all(isinstance(i,str) for i in state['records']))
    def test_food_and_stay_kinds(self):
        from app.validation import path_of
        food=normalize({'contentid':'f1','contenttypeid':'39','title':'식당','firstmenu':'국밥','treatmenu':'국밥, 수육','opentimefood':'09:00~21:00','restdatefood':'월요일','infocenterfood':'02-1','packing':'가능','reservationfood':'가능'})
        self.assertEqual((food['kind'],food['menu'],food['menus'],food['hours'],food['closed_days'],food['phone'],food['takeout']),('food','국밥','국밥, 수육','09:00~21:00','월요일','02-1','가능'))
        stay=normalize({'contentid':'s1','contenttypeid':'32','title':'숙소','checkintime':'15:00','checkouttime':'11:00','roomtype':'온돌','roomcount':'12','reservationurl':'<a href="https://example.com/r">예약</a>','infocenterlodging':'02-2','chkcooking':'가능'})
        self.assertEqual((stay['kind'],stay['checkin'],stay['checkout'],stay['rooms'],stay['room_count'],stay['reservation_url'],stay['phone'],stay['cooking']),('stay','15:00','11:00','온돌','12','https://example.com/r','02-2','가능'))
        self.assertEqual(normalize({'contentid':'p','contenttypeid':'14','title':'박물관'})['kind'],'place')
        self.assertEqual((path_of('food','x'),path_of('festival','y'),path_of('bogus','z')),('/food/x','/festival/y','/place/z'))
    def test_growth_skips_an_item_that_keeps_failing(self):
        import json
        from unittest.mock import patch
        from app import trip100
        from app.models import Region
        def raw(ident):return {'contentid':ident,'contenttypeid':'12','title':'오류 '+ident,'addr1':'서울특별시 중구 시험로','lDongRegnCd':'11','lDongSignguCd':'140','mapy':'37.56','mapx':'126.99'}
        with SessionLocal() as db:
            region=db.get(Region,'growth-region') or Region(id='growth-region',version_id='demo-regions-v1',code_system='MOIS_LEGAL',code='11140',name='서울특별시 중구',level='city')
            region.status='active';db.add(region);db.commit()
            self.assertEqual(ingest(db,[{**raw('e0'),'_images':[]}]).status,'completed')
        class API:
            def __init__(self,*a,**k):pass
            def call(self,endpoint,**params):
                if endpoint=='areaBasedList2':return {'items':[raw(i) for i in ('e1','e2','e3')] if params['contentTypeId']=='12' and params['pageNo']==1 else [],'total':3}
                if params['contentId']=='e2':raise ValueError('TourAPI 통신/응답 오류. 키·승인·현재 API 명세를 확인하세요.')
                return {'items':[],'total':0}
        with patch.object(trip100,'TourAPI',API),patch.object(trip100,'ROOT',Path(temp.name)):trip100.run(300)
        with SessionLocal() as db:
            names={p.snapshot['name'] for p in db.scalars(select(Profile).where(Profile.dataset_id==active_dataset(db).id))}
        self.assertTrue({'오류 e1','오류 e3'}<=names);self.assertNotIn('오류 e2',names)
        state=json.loads((Path(temp.name)/'runtime'/'trip300'/'checkpoint.json').read_text(encoding='utf-8'))
        self.assertEqual((state['status'],state['skipped']),('completed',['e2']))
    def test_build_file_is_card_subset_with_totals(self):
        from app.export_static import build_file,PER_LIST
        items=[{'id':f'p{i}','name':f'n{i}','kind':'place' if i%3 else 'festival','region_id':'r1' if i<40 else 'r2','quality_score':i,
                'conditions':{'kids':i%2==0},'images':[{'url':'a'},{'url':'b'}],'body_only':'x'} for i in range(60)]
        small=build_file({'status':{},'regions':[],'items':items})
        self.assertTrue(small['subset']);self.assertEqual(small['counts']['all'],60);self.assertEqual(small['counts']['region:r1'],40)
        self.assertEqual(small['counts']['condition:kids'],30);self.assertNotIn('body_only',small['items'][0]);self.assertEqual(len(small['items'][0]['images']),1)
        top=sorted(items,key=lambda p:-p['quality_score'])[:PER_LIST]
        self.assertTrue({p['id'] for p in top}<={p['id'] for p in small['items']})
    def test_growth_resumes_old_checkpoint_format(self):
        # Checkpoints written before 10/16 held full records and the candidate list.
        import json
        from unittest.mock import patch
        from app import trip100
        from app.models import Region
        def raw(ident):return {'contentid':ident,'contenttypeid':'12','title':'예전 '+ident,'addr1':'서울특별시 중구 시험로','lDongRegnCd':'11','lDongSignguCd':'140','mapy':'37.56','mapx':'126.99','_images':[]}
        with SessionLocal() as db:
            region=db.get(Region,'growth-region') or Region(id='growth-region',version_id='demo-regions-v1',code_system='MOIS_LEGAL',code='11140',name='서울특별시 중구',level='city')
            region.status='active';db.add(region);db.commit()
            self.assertEqual(ingest(db,[raw('o0')]).status,'completed')
        work=Path(temp.name)/'runtime'/'trip200';work.mkdir(parents=True,exist_ok=True)
        (work/'checkpoint.json').write_text(json.dumps({'candidates':[raw('o0'),raw('o1'),raw('o2')],'cursor':2,'records':[raw('o0'),raw('o1')],'known':['o0'],'rejected':[],'status':'paused_error_or_budget'}),encoding='utf-8')
        calls=[]
        class API:
            def __init__(self,*a,**k):pass
            def call(self,endpoint,**params):calls.append((endpoint,params.get('contentId')));return {'items':[],'total':0}
        with patch.object(trip100,'TourAPI',API),patch.object(trip100,'ROOT',Path(temp.name)):trip100.run(200)
        self.assertNotIn('o1',[c[1] for c in calls])  # its full record was kept as a cache file
        self.assertIn('o2',[c[1] for c in calls])
        with SessionLocal() as db:
            names={p.snapshot['name'] for p in db.scalars(select(Profile).where(Profile.dataset_id==active_dataset(db).id))}
        self.assertTrue({'예전 o0','예전 o1','예전 o2'}<=names)
    def test_seo_indexes_described_public_pages_without_review(self):
        from unittest.mock import patch
        from app import config
        from app.models import Region
        def raw(ident,overview):return {'contentid':ident,'contenttypeid':'12','title':'검색 '+ident,'addr1':'서울특별시 중구 시험로','lDongRegnCd':'11','lDongSignguCd':'140','mapy':'37.56','mapx':'126.99','overview':overview}
        with SessionLocal() as db:
            region=db.get(Region,'growth-region') or Region(id='growth-region',version_id='demo-regions-v1',code_system='MOIS_LEGAL',code='11140',name='서울특별시 중구',level='city')
            region.status='active';db.add(region);db.commit()  # the ledger test may have retired it
            self.assertEqual(ingest(db,[raw('seo-long','충분히 긴 소개글입니다. '*8),raw('seo-short','짧음')]).status,'completed')
        long_id,short_id=stable('tourapi','seo-long'),stable('tourapi','seo-short')
        with patch.object(config,'DATA_MODE','live'):
            self.assertFalse(self.client.get('/v1/places/'+long_id).json()['indexable'])  # SEO off
            self.assertEqual(self.client.get('/v1/sitemap').json()['items'],[])
            with patch.object(config,'SEO_ENABLED',True):
                self.assertTrue(self.client.get('/v1/places/'+long_id).json()['indexable'])
                self.assertFalse(self.client.get('/v1/places/'+short_id).json()['indexable'])
                paths=[i['path'] for i in self.client.get('/v1/sitemap').json()['items']]
                self.assertIn('/place/'+long_id,paths);self.assertNotIn('/place/'+short_id,paths)
    def test_local_admin_page(self):
        from unittest.mock import patch
        from app import config
        page=self.client.get('/admin')
        self.assertEqual(page.status_code,200);self.assertIn('로컬 검수',page.text)
        with patch.object(config,'ENV','production'):self.assertEqual(self.client.get('/admin').status_code,404)
    def test_admin_auth(self):
        self.assertEqual(self.client.get('/v1/admin/overview').status_code,401)
        self.assertEqual(self.client.get('/v1/admin/overview',headers={'x-admin-token':'test-only-token'}).status_code,200)
    def test_sitemap_excludes_demo_and_bad_input(self):
        self.assertEqual(self.client.get('/v1/sitemap').json()['items'],[])
        self.assertEqual(self.client.get('/v1/search?date_from=no-date').status_code,422)
        self.assertEqual(self.client.get('/v1/search?lat=37').status_code,422)
        self.assertEqual(self.client.get('/v1/places/does-not-exist').status_code,404)

    def test_review_approval_source_change_and_rejection(self):
        from unittest.mock import patch
        from app import config
        from app.models import Region
        from app.sync_trip import reset_review,changed
        from app.review import raw_for
        headers={'x-admin-token':'test-only-token'}
        raw={'contentid':'review-test','contenttypeid':'12','title':'검수 시험','addr1':'서울특별시 종로구','lDongRegnCd':'11','lDongSignguCd':'110','mapy':'37.57','mapx':'126.98','overview':'공식 내용 확인 시험입니다. '*20,'usetime':'09:00~18:00','usefee':'무료','modifiedtime':'20261001000000'}
        with SessionLocal() as db:
            db.add(Region(id='review-region',version_id='demo-regions-v1',code_system='MOIS_LEGAL',code='11110',name='서울특별시 종로구',level='city'));db.commit()
            job=ingest(db,[raw]);place_id=stable('tourapi','review-test')
        payload={'place_id':place_id,'action':'approve','reviewer':'검수 시험','note':'공식 홈페이지 대조','content_checked':True,'boundary_checked':False,'conditions':{'free':{'value':True,'source':'https://example.com/official'}}}
        with patch.object(config,'DATA_MODE','live'):
            self.assertEqual(self.client.post('/v1/admin/review',json=payload).status_code,401)
            payload['conditions']['free']['source']=''
            self.assertEqual(self.client.post('/v1/admin/review',headers=headers,json=payload).status_code,422)
            payload['conditions']['free']['source']='https://example.com/official'
            response=self.client.post('/v1/admin/review',headers=headers,json=payload);self.assertEqual(response.status_code,200)
            item=self.client.get('/v1/places/'+place_id).json();self.assertTrue(item['conditions']['free']);self.assertFalse(item['indexable']);self.assertTrue(item['verified_at'])
            with SessionLocal() as db:
                approved=raw_for(db,place_id);updated=reset_review(approved);updated['modifiedtime']='20261006000000'
                self.assertTrue(changed(approved,updated));self.assertNotIn('condition_evidence',updated)
                self.assertEqual(ingest(db,[updated]).status,'completed')
            # Reviewer evidence is reset; the source fee "무료" still classifies it automatically.
            item=self.client.get('/v1/places/'+place_id).json()
            self.assertTrue(item['conditions']['free']);self.assertTrue(item['evidence']['free']['auto'])
            with SessionLocal() as db:
                hidden=reset_review(updated);hidden['showflag']='0';self.assertEqual(ingest(db,[hidden]).status,'completed')
            self.assertEqual(self.client.get('/v1/places/'+place_id).status_code,404)
            with SessionLocal() as db:
                restored=reset_review(hidden);restored['showflag']='1';self.assertEqual(ingest(db,[restored]).status,'completed')
            self.assertEqual(self.client.get('/v1/places/'+place_id).status_code,200)
            before=self.client.get('/v1/status').json()['place_count']
            payload['action']='reject';self.assertEqual(self.client.post('/v1/admin/review',headers=headers,json=payload).status_code,200)
            self.assertEqual(self.client.get('/v1/places/'+place_id).status_code,404)
            self.assertEqual(self.client.get('/v1/status').json()['place_count'],before-1)

    def test_region_ledger_marks_abolished_codes(self):
        from app.models import Region
        from app.worker import import_regions
        ledger=Path(temp.name)/'ledger.csv'
        def load(rows):
            ledger.write_text('법정동코드,법정동명,폐지여부\n'+''.join(f'{c},{n},{f}\n' for c,n,f in rows),encoding='utf-8');import_regions(ledger)
        load([('9900000000','시험도','존재'),('9911000000','시험도 갑시','존재'),('9912000000','시험도 을군','존재')])
        load([('9900000000','시험도','존재'),('9911000000','시험도 갑시','존재'),('9912000000','시험도 을군','폐지')])
        with SessionLocal() as db:
            status={r.code:r.status for r in db.scalars(select(Region).where(Region.code.in_(['99','99110','99120'])))}
        self.assertEqual(status,{'99':'active','99110':'active','99120':'abolished'})
if __name__=='__main__':unittest.main()
