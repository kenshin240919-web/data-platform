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
    resp = d.get('response', {})
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
