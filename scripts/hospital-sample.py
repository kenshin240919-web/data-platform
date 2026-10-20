"""One-off check of 국립중앙의료원 병·의원 API for hospital.guidejung.com (prints statistics only, no key)."""
import json, os, time, urllib.parse, urllib.request
from collections import Counter
KEY = os.environ['DATA_GO_KR_KEY'].strip()
BASE = 'https://apis.data.go.kr/B552657'
def get(path, **q):
    q = {'serviceKey': KEY, 'pageNo': 1, 'numOfRows': 10, '_type': 'json', **q}
    t = time.time()
    with urllib.request.urlopen(f'{BASE}/{path}?{urllib.parse.urlencode(q)}', timeout=120) as r:
        d = json.load(r)
    b = d.get('response', {}).get('body', {})
    items = b.get('items') or {}
    items = items.get('item', []) if isinstance(items, dict) else items
    return time.time() - t, int(b.get('totalCount') or 0), [items] if isinstance(items, dict) else (items or [])
LIST = 'HsptlAsembySearchService/getHsptlMdcncListInfoInqire'
dt, total, rows = get(LIST, numOfRows=5000)
print(f'병의원 전체 {total:,}곳, 5000행 {dt:.1f}s')
print('종류', Counter(r.get('dutyDivNam') for r in rows).most_common(15))
print('응급실 운영(dutyEryn)', Counter(r.get('dutyEryn') for r in rows).most_common())
for d in range(1, 9):
    print(f'  요일 {d} 시간 있음', sum(1 for r in rows if r.get(f'dutyTime{d}s')))
print('  평일 20시 이후', sum(1 for r in rows if int(str(r.get('dutyTime1c') or 0)) > 2000), '좌표', sum(1 for r in rows if r.get('wgs84Lat')))
print('필드 합집합', sorted({k for r in rows for k in r}))
# 진료과목 코드별 전국 수 (QD 필터, 1행만)
for i in range(1, 35):
    code = f'D{i:03d}'
    try:
        dt, n, rs = get(LIST, QD=code, numOfRows=1)
        print(code, f'{n:,}', (rs[0].get('dutyName') if rs else ''))
    except Exception as e:
        print(code, 'error', e)
# 병원 기본정보(상세) 한 곳: 진료과목 이름 필드 확인
hp = rows[0]['hpid'] if rows else None
if hp:
    dt, n, rs = get('HsptlAsembySearchService/getHsptlBassInfoInqire', HPID=hp)
    print('상세 필드', sorted(rs[0].keys()) if rs else rs)
    print('상세 예시', json.dumps({k: v for k, v in (rs[0] if rs else {}).items() if k not in ('dutyInf',)}, ensure_ascii=False)[:1500])
# 응급실 실시간 가용병상 서울 1곳
dt, n, rs = get('ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire', STAGE1='서울특별시', numOfRows=3)
print(f'응급실 서울 {n}곳', json.dumps(rs[:1], ensure_ascii=False)[:800])
