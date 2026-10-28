"""scripts/collect-pharmacy.py: per-pharmacy facts for the detail page and the sitemap stage."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('collect_pharmacy', Path(__file__).resolve().parents[3] / 'scripts/collect-pharmacy.py')
cp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cp)


def pharmacy(i, lat, lon, hours=None):
    return {'id': f'C{i}', 'name': f'약국{i}', 'lat': lat, 'lon': lon, 'region': '11680',
            'hours': hours or {d: ['0900', '1900'] for d in '12345'}}


class CollectPharmacyTest(unittest.TestCase):
    def test_enrich(self):
        a = pharmacy(1, 37.5, 127.0)
        b = pharmacy(2, 37.505, 127.0, {**{d: ['0900', '2200'] for d in '12345'}, '7': ['1000', '1800']})  # 556m, 늦게까지·일요일
        c = pharmacy(3, 37.501, 127.0, {d: ['0900', '1830'] for d in '12345'})  # 110m, 더 일찍 닫음
        cp.enrich([a, b, c], [{'id': 'E1', 'name': '큰병원', 'lat': 37.52, 'lon': 127.0}],
                  [{'id': 'K1', 'name': '앞 주차장', 'lat': 37.5002, 'lon': 127.0, 'charge': '무료'}])
        self.assertEqual((a['wk_close'], a['week_h']), (1900, 50.0))
        self.assertEqual(a['around'], {'n': 2, 'sun': 1})
        self.assertEqual(a['after'], {'id': 'C2', 'm': 560})  # 가까운 C3는 먼저 닫음
        self.assertEqual(a['sun_alt'], {'id': 'C2', 'm': 560})
        self.assertEqual(a['er_near'], {'id': 'E1', 'name': '큰병원', 'm': 2230})
        self.assertEqual(a['park'], {'id': 'K1', 'name': '앞 주차장', 'm': 20, 'free': True})
        self.assertNotIn('after', b)
        self.assertNotIn('sun_alt', b)  # 일요일에 열면 없음

    def test_after_midnight(self):
        a = pharmacy(1, 37.5, 127.0, {d: ['0900', '2350'] for d in '12345'})
        b = pharmacy(2, 37.501, 127.0, {d: ['1800', '0200'] for d in '12345'})  # 새벽 2시까지
        cp.enrich([a, b], [], [])
        self.assertEqual(a['after']['id'], 'C2')

    def test_stage_and_stats(self):
        items = [pharmacy(1, 0, 0, {'1': ['0900', '2300']}), pharmacy(2, 0, 0, {'1': ['0900', '1800'], '8': ['1000', '1400']}),
                 pharmacy(3, 0, 0, {'1': ['0900', '2030']}), pharmacy(4, 0, 0, {'1': ['0900', '1800'], '6': ['0900', '1700']}),
                 pharmacy(5, 0, 0, {'1': ['0900', '1800']})]
        cp.enrich(items, [], [])
        cp.stage_of(items)
        self.assertEqual([p['stage'] for p in items], [1, 1, 2, 2, 3])
        st = cp.region_stats(items)['11680']
        self.assertEqual((st['n'], st['night'], st['hol'], st['sat'], st['c50']), (5, 1, 1, 1, 1800))


if __name__ == '__main__':
    unittest.main()
