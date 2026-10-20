"""One-off check of 국립중앙의료원 약국·병의원 APIs with DATA_GO_KR_KEY (prints statistics only, no key)."""
import json, os, time, urllib.parse, urllib.request
from collections import Counter
KEY = os.environ['DATA_GO_KR_KEY'].strip()
BASE = 'https://apis.data.go.kr/B552657'
def get(path, **q):
    q = {'serviceKey': KEY, 'pageNo': 1, 'numOfRows': 10, '_type': 'json', **q}
    t = time.time()
    try:
        with urllib.request.urlopen(f'{BASE}/{path}?{urllib.parse.urlencode(q)}', timeout=90) as r:
            body = r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        body = f'HTTP {e.code} ' + e.read().decode('utf-8', 'replace')[:300]
    dt = time.time() - t
    try:
        d = json.loads(body)
    except Exception:
        return dt, None, body[:300]
    b = d.get('response', {}).get('body', {})
    items = b.get('items') or {}
    items = items.get('item', []) if isinstance(items, dict) else items
    if isinstance(items, dict):
        items = [items]
    return dt, b.get('totalCount'), items or d.get('response', {}).get('header')
for name, path in [('약국 목록', 'ErmctInsttInfoInqireService/getParmacyListInfoInqire'), ('병의원 목록', 'HsptlAsembySearchService/getHsptlMdcncListInfoInqire')]:
    dt, total, items = get(path)
    print(f'== {name}: total={total} {dt:.1f}s')
    if isinstance(items, list) and items:
        print('  필드', sorted(items[0].keys()))
        x = {k: v for k, v in items[0].items() if k not in ('dutyTel1', 'dutyTel3')}
        print('  예시', json.dumps(x, ensure_ascii=False)[:900])
    else:
        print('  응답', items)
# 큰 페이지·시도 필터·속도
dt, total, items = get('ErmctInsttInfoInqireService/getParmacyListInfoInqire', numOfRows=1000, Q0='서울특별시', Q1='강남구')
print(f'약국 서울 강남구 total={total} rows={len(items) if isinstance(items, list) else items} {dt:.1f}s')
if isinstance(items, list) and items:
    print('  일요일 운영', sum(1 for i in items if i.get('dutyTime7s')), '공휴일', sum(1 for i in items if i.get('dutyTime8s')), '22시 이후 평일', sum(1 for i in items if str(i.get('dutyTime1c') or '0') > '2200'))
    print('  좌표', sum(1 for i in items if i.get('wgs84Lat')))
dt, total, items = get('ErmctInsttInfoInqireService/getParmacyListInfoInqire', numOfRows=5000, pageNo=1)
print(f'약국 전국 5000행 total={total} rows={len(items) if isinstance(items, list) else items} {dt:.1f}s')
dt, total, items = get('HsptlAsembySearchService/getHsptlMdcncListInfoInqire', numOfRows=1000, Q0='서울특별시', Q1='강남구', QD='D002')
print(f'병원 강남구 소아청소년과(D002) total={total} {dt:.1f}s')
if isinstance(items, list) and items:
    print('  종류', Counter(i.get('dutyDivNam') for i in items).most_common(6))
