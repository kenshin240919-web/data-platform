"""scripts/collect-market.py: 장 서는 날(5일장 주기) 해석."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('collect_market', Path(__file__).resolve().parents[3] / 'scripts/collect-market.py')
cm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cm)


class CollectMarketTest(unittest.TestCase):
    def test_jang_days(self):
        self.assertEqual(cm.jang_days('2일+7일'), {'days': [2, 7, 12, 17, 22, 27]})
        self.assertEqual(cm.jang_days('5일+10일'), {'days': [5, 10, 15, 20, 25, 30]})
        self.assertEqual(cm.jang_days('1일+6일')['days'][-1], 26)  # 31일은 넣지 않음
        self.assertEqual(cm.jang_days('15일+30일'), {'days': [15, 30]})
        self.assertEqual(cm.jang_days('매주 토요일'), {'wd': [6]})
        for c in ('매일', '음력 1일+6일', '', None, '수시'):
            self.assertIsNone(cm.jang_days(c))


if __name__ == '__main__':
    unittest.main()
