"""scripts/collect-service.py: per-place facts for the detail page and the sitemap stage."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('collect_service', Path(__file__).resolve().parents[3] / 'scripts/collect-service.py')
cs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cs)


def place(i, kind, lat, lon, sub=None, tel=None, hours=None, since=None):
    return {'id': f'{kind[0]}-{i}', 'kind': kind, 'name': f'곳{i}', 'sub': sub, 'lat': lat, 'lon': lon, 'tel': tel, 'hours': hours or {},
            'since': since, 'region': '11680'}


class CollectServiceTest(unittest.TestCase):
    def test_enrich(self):
        a = place(1, 'repair', 37.5, 127.0, sub='전문정비')
        b = place(2, 'repair', 37.505, 127.0, sub='종합정비')  # 556m
        w = place(3, 'wash', 37.5, 127.001)
        i = place(4, 'inspect', 37.52, 127.0)  # 약 2.2km
        cs.enrich([a, b, w, i], [{'id': 'K1', 'name': '앞 주차장', 'lat': 37.5002, 'lon': 127.0, 'charge': '무료'}])
        self.assertEqual(a['around'], {'r': 1, 'b': 1, 'w': 1})
        self.assertEqual(a['insp'], {'id': 'i-4', 'm': 2230})
        self.assertEqual(a['park'], {'id': 'K1', 'name': '앞 주차장', 'm': 20, 'free': True})
        self.assertNotIn('insp', i)  # 다른 검사소가 없으면 없음

    def test_stage_and_stats(self):
        h = {'wk': ['09:00', '18:00']}
        items = [place(1, 'inspect', 0, 0), place(2, 'repair', 0, 0, sub='소형자동차종합정비', since='2001-01-01'),
                 place(3, 'repair', 0, 0, sub='전문정비', tel='02-1', since='2010-01-01', hours=h),
                 place(4, 'wash', 0, 0, tel='02-1'), place(5, 'wash', 0, 0, tel='02-1', hours=h), place(6, 'repair', 0, 0, sub='전문정비')]
        cs.stage_of(items)
        self.assertEqual([p['stage'] for p in items], [1, 1, 2, 2, 1, 3])
        st = cs.region_stats(items)['11680']['repair']
        self.assertEqual((st['n'], st['big'], st['y50'], st['c50'], st['hours']), (3, 1, 2010, 1080, 1))


if __name__ == '__main__':
    unittest.main()
