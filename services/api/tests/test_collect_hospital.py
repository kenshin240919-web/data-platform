"""scripts/collect-hospital.py: per-hospital facts for the detail page and the sitemap stage."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('collect_hospital', Path(__file__).resolve().parents[3] / 'scripts/collect-hospital.py')
ch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ch)


def hospital(i, lat, lon, depts=('pediatrics',), hours=None, **kw):
    hours = hours or {d: ['0900', '1800'] for d in '12345'}
    return {'id': f'H{i}', 'name': f'병원{i}', 'div': '의원', 'lat': lat, 'lon': lon, 'depts': list(depts), 'hours': hours, 'region': '11680',
            'er': False, 'night': False, 'sat': '6' in hours, 'sun': '7' in hours, 'hol': '8' in hours, **kw}


class CollectHospitalTest(unittest.TestCase):
    def test_main_dept(self):
        self.assertEqual(ch.main_dept({'name': '튼튼소아청소년과의원', 'div': '의원', 'depts': ['internal', 'pediatrics']}), 'pediatrics')
        self.assertEqual(ch.main_dept({'name': '바른정형외과의원', 'div': '의원', 'depts': ['ortho', 'surgery']}), 'ortho')  # 외과보다 긴 이름
        self.assertEqual(ch.main_dept({'name': '서울의원', 'div': '의원', 'depts': ['family', 'internal']}), 'family')
        self.assertEqual(ch.main_dept({'name': '서울의원', 'div': '의원', 'depts': ['internal']}), 'internal')

    def test_enrich(self):
        a = hospital(1, 37.5, 127.0, hours={**{d: ['0900', '2100'] for d in '12345'}, '6': ['0900', '1300']})
        b = hospital(2, 37.505, 127.0, hours={**{d: ['0900', '1800'] for d in '12345'}, '7': ['1000', '1400']})  # 556m, 일요일
        er = hospital(3, 37.52, 127.0, depts=('internal',), er=True)  # 약 2.2km
        pharmacies = [{'id': 'P1', 'name': '늦은약국', 'lat': 37.5005, 'lon': 127.0, 'hours': {'1': ['0900', '2200']}},
                      {'id': 'P2', 'name': '이른약국', 'lat': 37.501, 'lon': 127.0, 'hours': {'1': ['0900', '1900']}}]
        parkings = [{'id': 'K1', 'name': '앞 주차장', 'lat': 37.5002, 'lon': 127.0, 'charge': '무료'}]
        ch.enrich([a, b, er], pharmacies, parkings)
        self.assertEqual((a['wk_close'], a['week_h']), (2100, 64.0))
        self.assertEqual(a['around'], {'n': 1, 'same': 1, 'sun': 1, 'night': 0})
        self.assertEqual(a['pharm'], [{'id': 'P1', 'name': '늦은약국', 'm': 60, 'after': True}, {'id': 'P2', 'name': '이른약국', 'm': 110, 'after': False}])
        self.assertEqual(a['park'], {'id': 'K1', 'name': '앞 주차장', 'm': 20, 'free': True})
        self.assertEqual(a['er_near']['id'], 'H3')
        self.assertIsNone(er['er_near'])  # 응급실이 있는 병원은 따로 안 보여 줌

    def test_stage_and_stats(self):
        items = [hospital(1, 0, 0), hospital(2, 0, 0, hours={'7': ['0900', '1200']}), hospital(3, 0, 0)]
        ch.enrich(items, [], [])
        s = {'regions': [{'top': [{'id': 'H1'}], 'er': [], 'cond_top': {}, 'depts': {}}]}
        ch.stage_of(items, s)
        self.assertEqual([h['stage'] for h in items], [1, 2, 3])
        st = ch.region_stats(items)['11680']['pediatrics']
        self.assertEqual((st['n'], st['sun'], st['c50']), (3, 1, 1800))


if __name__ == '__main__':
    unittest.main()
