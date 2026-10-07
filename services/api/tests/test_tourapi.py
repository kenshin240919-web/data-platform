import sys,tempfile,unittest
from pathlib import Path
from unittest.mock import Mock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import httpx
from app.tourapi import TourAPI
from app.validation import normalize

class TourAPITest(unittest.TestCase):
    def api(self,handler,limit=10):
        temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup)
        client=httpx.Client(transport=httpx.MockTransport(handler));self.addCleanup(client.close)
        return TourAPI('test%2Bkey',Path(temp.name)/'budget.json',limit,client,sleep=lambda _:None)
    def test_single_item_and_encoding(self):
        def handler(request):
            self.assertEqual(request.url.params['serviceKey'],'test+key')
            return httpx.Response(200,json={'response':{'header':{'resultCode':'0000'},'body':{'totalCount':1,'items':{'item':{'contentid':'1'}}}}})
        data=self.api(handler).call('areaBasedList2');self.assertEqual(data['total'],1);self.assertEqual(len(data['items']),1)
    def test_retry_and_budget(self):
        attempts=[]
        def handler(request):
            attempts.append(1)
            return httpx.Response(503) if len(attempts)==1 else httpx.Response(200,json={'response':{'header':{'resultCode':'0000'},'body':{}}})
        api=self.api(handler,2);self.assertEqual(api.call('areaBasedList2')['items'],[])
        with self.assertRaisesRegex(ValueError,'예산'):api.call('areaBasedList2')
    def test_errors_do_not_expose_key(self):
        api=self.api(lambda _:httpx.Response(403,text='test+key'))
        with self.assertRaises(ValueError) as error:api.call('areaBasedList2')
        self.assertNotIn('test+key',str(error.exception))
    def test_type_specific_details(self):
        normalized=normalize({'contentid':'culture','title':'문화시설','usetimeculture':'09:00~18:00','restdateculture':'월요일','usefeeculture':'무료'})
        self.assertEqual(normalized['hours'],'09:00~18:00');self.assertEqual(normalized['closed_days'],'월요일')
        self.assertEqual(normalized['fee'],'무료');self.assertIsNone(normalized['conditions']['free'])

    def test_photo_rights_and_unsafe_urls(self):
        from app.validation import image_records,homepage
        raw={'title':'시험','_images':[{'cpyrhtDivCd':'Type3','originimgurl':'https://tong.visitkorea.or.kr/image.jpg'},{'cpyrhtDivCd':'Type2','originimgurl':'https://tong.visitkorea.or.kr/blocked.jpg'},{'cpyrhtDivCd':'Type1','originimgurl':'https://untrusted.example/photo.jpg'}]}
        photos=image_records(raw);self.assertEqual(len(photos),1);self.assertFalse(photos[0]['modification_allowed'])
        self.assertIsNone(homepage({'homepage':'javascript:alert(1)'}))
        self.assertEqual(homepage({'homepage':'<a href="https://example.com">공식</a>'}),'https://example.com')
        self.assertEqual(homepage({'homepage':'공식 홈페이지 https://example.com/intro 예약처 https://booking.example.com'}),'https://example.com/intro')
    def test_tourism_admission_from_repeated_details(self):
        row=normalize({'contentid':'1','title':'관광지','_facilities':[{'infoname':'입장료','infotext':'성인 2,000원 / 어린이 무료'},{'infoname':'주차요금','infotext':'3,000원'}]})
        self.assertEqual(row['fee'],'성인 2,000원 / 어린이 무료');self.assertEqual(row['parking_fee'],'3,000원');self.assertIsNone(row['conditions']['free'])
