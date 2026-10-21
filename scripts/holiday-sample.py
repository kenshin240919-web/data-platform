"""One-off: 국립중앙의료원 명절 비상 진료기관 (HolidyEmgncClnicInsttInfoInqireService) — prints counts, fields and dates only."""
import json, os, urllib.parse, urllib.request
from collections import Counter

KEY = os.environ['DATA_GO_KR_KEY']
API = 'https://apis.data.go.kr/B552657/HolidyEmgncClnicInsttInfoInqireService/getHolidyClnicPosblEgytInfoInqire'


def call(**q):
    qs = urllib.parse.urlencode({'serviceKey': KEY, 'pageNo': 1, 'numOfRows': 1000, '_type': 'json', **q})
    with urllib.request.urlopen(f'{API}?{qs}', timeout=120) as r:
        raw = r.read().decode('utf-8', 'replace')
    try:
        d = json.loads(raw)
    except ValueError:
        print('  not JSON:', raw[:300])
        return [], 0
    body = d.get('response', {}).get('body', {})
    print('  header', d.get('response', {}).get('header'))
    items = (body.get('items') or {})
    items = items.get('item', []) if isinstance(items, dict) else items
    items = [items] if isinstance(items, dict) else items
    return items, int(body.get('totalCount') or 0)


for label, q in [('전국', {}), ('서울', {'Q0': '서울특별시'}), ('약국 H', {'QD': 'H'})]:
    items, total = call(**q)
    print(f'{label}: total {total:,}, page {len(items):,}')
    if items:
        print('  fields', sorted(items[0].keys()))
        print('  divs', Counter(i.get('dutyDivNam') for i in items).most_common(8))
        days = Counter(i.get(f'dutyDay{n}') for i in items for n in range(1, 11) if i.get(f'dutyDay{n}'))
        print('  days', sorted(days.items())[:12])
        print('  time sample', [items[0].get(f'dutyDaytime{n}') for n in range(1, 4)], 'etc', items[0].get('dutyDayEtc'))
