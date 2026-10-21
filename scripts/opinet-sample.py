"""One-off: 오피넷 무료 API 표본 (fuel 사이트 설계용). 가격·건수·필드만 출력하고 키는 출력하지 않음.
Usage: OPINET_API_KEY=... python scripts/opinet-sample.py
"""
import json, os, time, urllib.parse, urllib.request

KEY = os.environ['OPINET_API_KEY'].strip()
BASE = 'https://www.opinet.co.kr/api/'


def call(name, **q):
    qs = urllib.parse.urlencode({'code': KEY, 'out': 'json', **q})
    t = time.time()
    try:
        with urllib.request.urlopen(urllib.request.Request(f'{BASE}{name}?{qs}', headers={'User-Agent': 'Mozilla/5.0'}), timeout=60) as r:
            raw = r.read().decode('utf-8', 'replace')
    except Exception as e:
        print(f'{name} {q}: 오류 {e}')
        return []
    try:
        oil = json.loads(raw).get('RESULT', {}).get('OIL', [])
    except ValueError:
        print(f'{name} {q}: JSON 아님 {raw[:200]!r}')
        return []
    print(f'{name} {q}: {len(oil):,}건 {len(raw):,} bytes {time.time() - t:.1f}s')
    if oil:
        print('   필드', sorted(oil[0].keys()))
        print('   첫 줄', {k: v for k, v in oil[0].items() if k not in ('UNI_ID',)})
    return oil


call('avgAllPrice.do')
call('avgSidoPrice.do', prodcd='B027')
areas = call('areaCode.do')
call('areaCode.do', area='01')
low = call('lowTop10.do', prodcd='B027', area='0113', cnt=20)  # 서울 강남구 추정 코드
low = low or call('lowTop10.do', prodcd='B027', area='01', cnt=20)
# KATEC 좌표(오피넷 예시 값 근처) 반경 5km
around = call('aroundAll.do', x='314681.8', y='544837', radius=5000, prodcd='B027', sort=1)
if low:
    call('detailById.do', id=low[0].get('UNI_ID'))
call('searchByName.do', osnm='셀프', area='01')
call('avgRecentPrice.do', prodcd='B027')
call('avgSigunPrice.do', prodcd='B027', sido='01')
