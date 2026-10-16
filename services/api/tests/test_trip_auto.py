import json,os,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
_db=tempfile.TemporaryDirectory()
os.environ.setdefault('DATABASE_URL','sqlite:///'+str(Path(_db.name)/'test.db'))
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))

def raw(ident,kind='12',**extra):
    return {'contentid':ident,'contenttypeid':kind,'title':'자동 '+ident,'addr1':'서울특별시 중구 시험로 1','lDongRegnCd':'11','lDongSignguCd':'140','mapy':'37.56','mapx':'126.99','overview':'설명 '*50,**extra}

class API:
    """TourAPI stand-in: list pages per type, details per id, ldongCode2 regions."""
    calls=[]
    def __init__(self,*a,**k):pass
    def call(self,endpoint,**params):
        API.calls.append(endpoint)
        if endpoint=='ldongCode2':
            return {'items':[{'code':'11','name':'서울특별시'}] if 'lDongRegnCd' not in params else [{'code':'140','name':'중구'}],'total':1}
        if endpoint=='areaBasedList2':
            rows={'12':[raw('a1'),raw('a2'),raw('old')],'39':[raw('f1','39'),raw('bad','39',addr1='')]}.get(params['contentTypeId'],[])
            return {'items':rows if params['pageNo']==1 else [],'total':len(rows)}
        if endpoint=='detailCommon2':
            ident=params['contentId']
            return {'items':[raw(ident,'39' if ident in ('f1','bad') else '12',**({'addr1':''} if ident=='bad' else {}))],'total':1}
        return {'items':[],'total':0}

class TripAutoTest(unittest.TestCase):
    def test_collects_new_ids_without_a_database(self):
        from app import trip_auto,export_static
        temp=tempfile.TemporaryDirectory();work=Path(temp.name)
        old={'id':'old-id','external_id':'old','kind':'place','name':'기존','region_id':trip_auto.region_id('11140'),'region_name':'서울특별시 중구','description':'x'*90,
             'conditions':{'free':None,'kids':None,'pet':None,'indoor':None},'evidence':{},'updated_at':'2026-10-14T09:00:00+09:00','quality_score':50,'latitude':37.5,'longitude':127.0}
        d1={'status':{'updated_at':'2026-10-14T09:00:00+09:00'},'regions':[{'id':old['region_id'],'name':'서울특별시 중구','code':'11140','count':1}],'items':[old]}
        API.calls=[]
        with patch.object(trip_auto,'WORK',work),patch.object(trip_auto,'FULL',work/'full.json'),patch.object(trip_auto,'MANIFEST',work/'m.json'),\
             patch.object(trip_auto,'TourAPI',API),patch.object(trip_auto,'d1_version',lambda:'2026-10-14T09:00:00+09:00#s2'),\
             patch.object(trip_auto,'d1_dataset',lambda:d1),patch.object(export_static,'TARGET',work/'trip.json'):
            stop,new=trip_auto.run('12,39',minutes=5)
            full=json.loads((work/'full.json').read_text(encoding='utf-8'))
            self.assertEqual((stop,new),('done',3))
            self.assertEqual(sorted(p['external_id'] for p in full['items']),['a1','a2','f1','old'])  # D1 item kept, 'bad' (no address) rejected
            self.assertEqual({p['kind'] for p in full['items']},{'place','food'})
            self.assertEqual((full['status']['place_count'],full['status']['food_count']),(3,1))
            self.assertEqual(full['regions'][0]['count'],4)
            self.assertTrue(json.loads((work/'trip.json').read_text(encoding='utf-8'))['subset'])
            self.assertEqual(json.loads((work/'state.json').read_text(encoding='utf-8'))['rejected'],['bad'])
            self.assertFalse(list((work/'raw').iterdir()))  # raw cache cleared once an item is built
            # Same day again: nothing listed or fetched, no new version.
            (work/'m.json').write_text(json.dumps({'version':'2026-10-14T09:00:00+09:00#s2'}))
            API.calls=[];before=full['status']['updated_at']
            self.assertEqual(trip_auto.run('12,39',minutes=5),('done',0))
            self.assertEqual([c for c in API.calls if c not in ('ldongCode2','areaBasedSyncList2')],[])  # only today's change list
            self.assertEqual(json.loads((work/'full.json').read_text(encoding='utf-8'))['status']['updated_at'],before)
        temp.cleanup()

    def test_refuses_to_start_empty_when_d1_is_unreadable(self):
        from app import trip_auto
        temp=tempfile.TemporaryDirectory();work=Path(temp.name)
        with patch.object(trip_auto,'WORK',work),patch.object(trip_auto,'FULL',work/'full.json'),patch.object(trip_auto,'MANIFEST',work/'m.json'),\
             patch.object(trip_auto,'d1_version',lambda:None):
            with self.assertRaises(SystemExit):trip_auto.run('12',minutes=1)
        temp.cleanup()

class SyncAPI(API):
    """Same source, plus a change list: a1 edited, a2 hidden, f1 unchanged."""
    changes=[]
    def call(self,endpoint,**params):
        if endpoint=='areaBasedSyncList2':
            return {'items':SyncAPI.changes if params['pageNo']==1 and params['modifiedtime']==SyncAPI.day else [],'total':len(SyncAPI.changes)}
        if endpoint=='detailCommon2' and params['contentId']=='a1' and SyncAPI.changes:
            API.calls.append(endpoint);return {'items':[raw('a1',title='수정된 이름',modifiedtime='20261016120000')],'total':1}
        return super().call(endpoint,**params)

class TripSyncTest(unittest.TestCase):
    def test_source_changes_update_and_hide_items(self):
        from app import trip_auto,export_static
        temp=tempfile.TemporaryDirectory();work=Path(temp.name)
        d1={'status':{'updated_at':'2026-10-14T09:00:00+09:00'},'regions':[],'items':[]}
        SyncAPI.changes=[];SyncAPI.day=trip_auto.now().strftime('%Y%m%d')
        with patch.object(trip_auto,'WORK',work),patch.object(trip_auto,'FULL',work/'full.json'),patch.object(trip_auto,'MANIFEST',work/'m.json'),\
             patch.object(trip_auto,'TourAPI',SyncAPI),patch.object(trip_auto,'d1_version',lambda:'v1'),\
             patch.object(trip_auto,'d1_dataset',lambda:d1),patch.object(export_static,'TARGET',work/'trip.json'):
            self.assertEqual(trip_auto.run('12,39',minutes=5),('done',4))
            (work/'m.json').write_text(json.dumps({'version':'v1'}))
            SyncAPI.changes=[{'contentid':'a1','contenttypeid':'12','modifiedtime':'20261016120000','showflag':'1'},
                             {'contentid':'a2','contenttypeid':'12','modifiedtime':'20261016120000','showflag':'0'},
                             {'contentid':'f1','contenttypeid':'39','modifiedtime':'','showflag':'1'},
                             {'contentid':'zz','contenttypeid':'25','modifiedtime':'20261016','showflag':'1'}]
            self.assertEqual(trip_auto.run('12,39',minutes=5),('done',0))
            full=json.loads((work/'full.json').read_text(encoding='utf-8'))
            names={p['external_id']:p['name'] for p in full['items']}
            self.assertEqual(names,{'a1':'수정된 이름','f1':'자동 f1','old':'자동 old'})  # a2 hidden by the source, f1 untouched
            state=json.loads((work/'state.json').read_text(encoding='utf-8'))
            self.assertEqual((state['hidden'],state['sync_queue']),(['a2'],[]))
            # Next run: nothing re-listed or re-fetched for the same changes.
            API.calls=[]
            trip_auto.run('12,39',minutes=5)
            self.assertNotIn('detailCommon2',API.calls)
        temp.cleanup()

class CourseShopTest(unittest.TestCase):
    def test_course_and_shop_items(self):
        from types import SimpleNamespace
        from app import trip_auto
        regions={'11140':SimpleNamespace(id='r',name='서울특별시 중구',code='11140',parent_id='p')}
        course=raw('c1','25',addr1='',distance='12km',taketime='반나절',_facilities=[
            {'subnum':'1','subcontentid':'200','subname':'둘째 곳','subdetailoverview':'설명2','subdetailimg':'http://x/1.jpg'},
            {'subnum':'0','subcontentid':'100','subname':'첫 곳','subdetailoverview':'설명1','subdetailimg':'https://tong.visitkorea.or.kr/a.jpg'}])
        item=trip_auto.build_item(course,regions,'2026-10-16T00:00:00+09:00','auto')
        self.assertEqual((item['kind'],item['distance'],item['taketime']),('course','12km','반나절'))  # no address needed
        self.assertEqual([s['name'] for s in item['course_steps']],['첫 곳','둘째 곳'])
        self.assertEqual(item['course_steps'][0]['id'],trip_auto.stable('tourapi','100'))
        self.assertEqual([s['image'] for s in item['course_steps']],['https://tong.visitkorea.or.kr/a.jpg',None])
        shop=trip_auto.build_item(raw('s1','38',saleitem='건어물',fairday='2·7일'),regions,'t','auto')
        self.assertEqual((shop['kind'],shop['sale_items'],shop['fair_day']),('shop','건어물','2·7일'))
        self.assertIsNone(trip_auto.build_item(raw('s2','38',addr1=''),regions,'t','auto'))  # shops still need an address
