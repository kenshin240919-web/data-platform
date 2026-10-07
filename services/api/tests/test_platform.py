import os, sys, tempfile, unittest
from pathlib import Path
temp=tempfile.TemporaryDirectory()
os.environ['DATABASE_URL']='sqlite:///'+str(Path(temp.name)/'test.db')
os.environ['DATA_MODE']='demo'
os.environ['ADMIN_TOKEN']='test-only-token'
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from app.main import app
from app.db import SessionLocal, engine
from app.models import Profile
from app.pipeline import active_dataset, ingest
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
            job=ingest(db,[raw]);profile=db.scalar(select(Profile).where(Profile.dataset_id==job.dataset_id));place_id=profile.place_id
        payload={'place_id':place_id,'action':'approve','reviewer':'검수 시험','note':'공식 홈페이지 대조','content_checked':True,'boundary_checked':False,'conditions':{'free':{'value':True,'source':'https://example.com/official'}}}
        with patch.object(config,'DATA_MODE','live'),patch('app.review.ROOT',Path(temp.name)):
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
            self.assertIsNone(self.client.get('/v1/places/'+place_id).json()['conditions']['free'])
            with SessionLocal() as db:
                hidden=reset_review(updated);hidden['showflag']='0';self.assertEqual(ingest(db,[hidden]).status,'completed')
            self.assertEqual(self.client.get('/v1/places/'+place_id).status_code,404)
            with SessionLocal() as db:
                restored=reset_review(hidden);restored['showflag']='1';self.assertEqual(ingest(db,[restored]).status,'completed')
            self.assertEqual(self.client.get('/v1/places/'+place_id).status_code,200)
            payload['action']='reject';self.assertEqual(self.client.post('/v1/admin/review',headers=headers,json=payload).status_code,200)
            self.assertEqual(self.client.get('/v1/places/'+place_id).status_code,404)
            self.assertEqual(self.client.get('/v1/status').json()['place_count'],0)

if __name__=='__main__':unittest.main()
