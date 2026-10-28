"""scripts/collect-benefit.py: 마감일·금액·지역·서류 읽기."""
import importlib.util
import unittest
from datetime import date
from pathlib import Path

spec = importlib.util.spec_from_file_location('collect_benefit', Path(__file__).resolve().parents[3] / 'scripts/collect-benefit.py')
cb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cb)


class CollectBenefitTest(unittest.TestCase):
    def test_due(self):
        t = date(2026, 10, 28)
        self.assertEqual(cb.due_of('2026. 7. 23.(목) ~ 2026. 9. 6.(일)', t), ('2026-09-06', True))
        self.assertEqual(cb.due_of('2026.11.2.~ 11.30.', t), ('2026-11-30', True))
        self.assertEqual(cb.due_of('2026.10월중', t), ('2026-10-31', False))
        self.assertEqual(cb.due_of('상시신청', t), (None, False))
        self.assertEqual(cb.due_of('○ 정기신청 : 5.1.~5.31.', t), (None, False))

    def test_amount(self):
        self.assertEqual(cb.amount_of('첫째 200만원, 둘째 300만 원'), 3000000)
        self.assertEqual(cb.amount_of('월 1,000,000원 지원'), 1000000)
        self.assertEqual(cb.amount_of('최대 2천만 원'), 20000000)
        self.assertIsNone(cb.amount_of('사업비 50억원'))
        self.assertIsNone(cb.amount_of('현물 지원'))

    def test_place(self):
        table, sido = cb.region_table()
        self.assertEqual(cb.place_of('서울특별시 광진구', '시군구', table, sido)[2], '11215')
        self.assertEqual(cb.place_of('경기도 수원시', '시군구', table, sido)[2], '41110')
        self.assertEqual(cb.place_of('경기도', '광역시도', table, sido)[:2], ('sido', '경기'))
        self.assertEqual(cb.place_of('보건복지부', '중앙행정기관', table, sido)[0], 'nation')

    def test_docs(self):
        self.assertEqual(cb.docs_of('주민등록등본 1부, 가족관계증명서'), ['resident', 'family'])


if __name__ == '__main__':
    unittest.main()
