"""One-off: 전국주차장정보표준데이터 (api.data.go.kr tn_pubr_prkplce_info_api) — prints counts and field coverage only."""
import json, os, urllib.parse, urllib.request
from collections import Counter

KEY = os.environ['DATA_GO_KR_KEY']
API = 'https://api.data.go.kr/openapi/tn_pubr_prkplce_info_api'


def call(page=1, rows=1000):
    qs = urllib.parse.urlencode({'serviceKey': KEY, 'pageNo': page, 'numOfRows': rows, 'type': 'json'})
    with urllib.request.urlopen(f'{API}?{qs}', timeout=180) as r:
        raw = r.read().decode('utf-8', 'replace')
    try:
        d = json.loads(raw)
    except ValueError:
        print('  not JSON:', raw[:400])
        return [], 0
    if 'response' not in d:
        print('  raw', raw[:1500])
        d = d.get('data') if isinstance(d.get('data'), dict) else d
    resp = d.get('response', d)
    print('  header', resp.get('header'))
    body = resp.get('body', {}) or {}
    items = body.get('items') or []
    items = items.get('item', []) if isinstance(items, dict) else items
    return items, int(body.get('totalCount') or 0)


items, total = call()
print(f'total {total:,}, page {len(items):,}')
if items:
    print('fields', sorted(items[0].keys()))
    print('sample', json.dumps(items[0], ensure_ascii=False)[:1200])
    n = len(items)
    has = lambda k: sum(1 for i in items if str(i.get(k) or '').strip())
    for k in sorted(items[0].keys()):
        print(f'  {k}: {has(k)}/{n}')
    for k in ('prkplceSe', 'prkplceType', 'parkingchrgeInfo', 'operDay', 'referenceDate', 'institutionNm'):
        print(k, Counter(i.get(k) for i in items).most_common(6))
    # 다른 쪽 페이지도 한 번 (지역 분포)
    last = max(1, total // 1000)
    more, _ = call(page=last)
    print('last page', len(more), Counter((i.get('rdnmadr') or i.get('lnmadr') or '')[:2] for i in items + more).most_common(17))

# 전체 페이지: 시도별 분포·좌표·요금 품질
import re
allrows = []
for p in range(1, total // 1000 + 2):
    rows, _ = call(page=p)
    allrows += rows
print('all rows', f'{len(allrows):,}', 'unique no', f'{len({r.get("prkplceNo") for r in allrows}):,}')
sido = Counter((r.get('insttNm') or '').split(' ')[0] for r in allrows)
print('by sido', sido.most_common(20))
seoul = Counter(r.get('insttNm') for r in allrows if (r.get('insttNm') or '').startswith('서울'))
print('seoul insttNm', seoul.most_common(30))
print('se', Counter(r.get('prkplceSe') for r in allrows).most_common(), 'type', Counter(r.get('prkplceType') for r in allrows).most_common())
print('charge', Counter(r.get('parkingchrgeInfo') for r in allrows).most_common())
ok = lambda v: re.fullmatch(r'\d+(\.\d+)?', str(v or '').strip()) is not None
geo = sum(1 for r in allrows if ok(r.get('latitude')) and float(r['latitude']) > 30)
print('coords', f'{geo:,}/{len(allrows):,}')
paid = [r for r in allrows if r.get('parkingchrgeInfo') in ('유료', '혼합')]
calc = sum(1 for r in paid if ok(r.get('basicTime')) and ok(r.get('basicCharge')) and float(r['basicCharge']) > 0)
print('paid', f'{len(paid):,}', 'fee computable', f'{calc:,}')
print('basic sample', Counter((r.get('basicTime'), r.get('basicCharge'), r.get('addUnitTime'), r.get('addUnitCharge')) for r in paid).most_common(8))
print('refdate', sorted(Counter((r.get('referenceDate') or '')[:7] for r in allrows).items())[-12:])
