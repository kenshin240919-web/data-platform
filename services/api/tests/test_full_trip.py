import sys,unittest
from pathlib import Path
from types import SimpleNamespace
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))

class FullTripValidationTest(unittest.TestCase):
    def test_dates_and_regions_before_publication(self):
        from app.full_trip import valid_record
        record={'contentid':'1','title':'행사','addr1':'서울특별시 종로구','lDongRegnCd':'11','lDongSignguCd':'110','mapy':'37.57','mapx':'126.98','contenttypeid':'15','eventstartdate':'20261006','eventenddate':'20261009'}
        region={'11110':SimpleNamespace(name='서울특별시 종로구')}
        self.assertTrue(valid_record(record,region))
        record['eventenddate']='20260901'
        self.assertFalse(valid_record(record,region))
        self.assertFalse(valid_record(record,{}))
