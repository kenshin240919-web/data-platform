"""One-off: 서비스센터 설계용 표준데이터 표본 — 건수·항목·채움 비율만 출력. Usage: DATA_GO_KR_KEY=... python scripts/service-sample.py"""
import json, os, re, urllib.parse, urllib.request
from collections import Counter

KEY = os.environ['DATA_GO_KR_KEY']
APIS = {'검사소': 'https://api.data.go.kr/openapi/tn_pubr_public_car_inspofc_api'}  # 정비업체(tn_pubr_public_auto_maintenance_company_api)는 10/23 확인 완료


def call(url, page=1, rows=1000):
    qs = urllib.parse.urlencode({'serviceKey': KEY, 'pageNo': page, 'numOfRows': rows, 'type': 'json'})
    try:
        with urllib.request.urlopen(f'{url}?{qs}', timeout=180) as r:
            raw = r.read().decode('utf-8', 'replace')
    except Exception as e:
        print('  error', e)
        return [], 0
    try:
        d = json.loads(raw)
    except ValueError:
        print('  not JSON:', raw[:300])
        return [], 0
    resp = d.get('response', d)
    print('  header', resp.get('header'))
    body = resp.get('body') or {}
    items = body.get('items') or []
    items = items.get('item', []) if isinstance(items, dict) else items
    return items, int(body.get('totalCount') or 0)


for name, url in APIS.items():
    print('==', name)
    items, total = call(url)
    print(f'total {total:,}, page {len(items):,}')
    if not items:
        continue
    print('sample', json.dumps(items[0], ensure_ascii=False)[:1000])
    rows = items
    for p in range(2, total // 1000 + 2):
        more, _ = call(url, page=p)
        rows += more
    n = len(rows)
    print('all rows', f'{n:,}')
    for k in sorted(rows[0]):
        print(f'  {k}: {sum(1 for i in rows if str(i.get(k) or "").strip()):,}/{n:,}')
    for k in rows[0]:
        vals = Counter(str(i.get(k) or '') for i in rows)
        if 1 < len(vals) <= 40:
            print(k, vals.most_common(12))
    ok = lambda v: re.fullmatch(r'-?\d+(\.\d+)?', str(v or '').strip()) is not None
    lat = next((k for k in rows[0] if 'lat' in k.lower()), None)
    print('coords', lat, sum(1 for i in rows if lat and ok(i.get(lat))), '/', n)
    addr = next((k for k in rows[0] if 'rdnmadr' in k.lower()), None) or next((k for k in rows[0] if 'adr' in k.lower()), None)
    print('sido', Counter((i.get(addr) or '').split(' ')[0] for i in rows).most_common(20) if addr else None)
