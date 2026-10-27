"""scripts/collect-academy.py: per-academy facts for the detail page and the sitemap stage."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('collect_academy', Path(__file__).resolve().parents[3] / 'scripts/collect-academy.py')
ca = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ca)


def academy(i, lat, lon, subjects=('math',), fees=(), **kw):
    return {'id': str(i), 'name': f'학원{i}', 'lat': lat, 'lon': lon, 'subjects': list(subjects), 'type': '학원', 'capacity': None, 'region_id': '11680',
            'fees': [{'name': 'x', 'won': w, 'subjects': list(subjects)} for w in fees], 'fee_min': min(fees) if fees else None, **kw}


class CollectAcademyTest(unittest.TestCase):
    def test_enrich(self):
        a = academy(1, 37.5, 127.0, fees=[300000])
        near = [academy(10 + i, 37.5 + 0.001 * i, 127.0, fees=[200000 + 10000 * i]) for i in range(1, 7)]  # 111~666m
        far = academy(99, 37.52, 127.0, fees=[900000])  # 약 2.2km
        other = academy(50, 37.5, 127.001, subjects=('english',))  # 88m
        nowhere = academy(60, None, None)
        schools = [{'code': 'e1', 'name': '가초등학교', 'k': 'elem', 'lat': 37.501, 'lon': 127.0},
                   {'code': 'e2', 'name': '나초등학교', 'k': 'elem', 'lat': 37.505, 'lon': 127.0},
                   {'code': 'h1', 'name': '다고등학교', 'k': 'high', 'lat': 37.53, 'lon': 127.0},  # 3.3km: 2km 밖
                   {'code': 's1', 'name': '라특수학교', 'k': None, 'lat': 37.5, 'lon': 127.0}]
        ca.enrich([a, *near, far, other, nowhere], schools)
        self.assertEqual(a['around'], {'n': 7, 'top': ['math', 'english'], 'subject': 'math', 'same': 6, 'same_fee': 240000})
        self.assertEqual(a['schools'], [{'code': 'e1', 'name': '가초등학교', 'k': 'elem', 'm': 110}])
        self.assertIsNone(nowhere['around'])
        self.assertEqual(other['around']['same_fee'], None)  # 같은 과목 공개 금액 5건 미만

    def test_within_reaches_far_cells(self):
        g = ca.grid([{'lat': 38.0, 'lon': 127.0 + 0.0125}])  # 경도 약 1.1km (위도 38도)
        self.assertEqual(len(list(ca.within(g, 38.0, 127.0, 1200))), 1)
        self.assertEqual(len(list(ca.within(g, 38.0, 127.0, 1000))), 0)

    def test_stage(self):
        items = [academy(1, 0, 0, fees=[100000]), academy(2, 0, 0, fees=[100000]), academy(3, 0, 0)]
        summary = {'regions': [{'top': [{'id': '1'}], 'new': [], 'subjects': {}}], 'latest': []}
        ca.stage_of(items, summary)
        self.assertEqual([a['stage'] for a in items], [1, 2, 3])


if __name__ == '__main__':
    unittest.main()
