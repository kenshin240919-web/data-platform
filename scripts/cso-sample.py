"""One-off: 민원실 실시간 대기(cso_realtime_v2) 응답 구조 확인 → reports/civil/cso-sample.md (항목 이름·건수·첫 줄만, 키는 남기지 않음).
Usage: DATA_GO_KR_KEY=... python scripts/cso-sample.py"""
import json, os, urllib.parse, urllib.request
from pathlib import Path
from datetime import datetime, timedelta, timezone

key = os.environ['DATA_GO_KR_KEY'].strip()
API = 'https://apis.data.go.kr/B551982/cso_v2'
out = [f'# 민원실 실시간 대기 응답 확인 {datetime.now(timezone(timedelta(hours=9))):%Y-%m-%d %H:%M} KST', '']
def call(name, **q):
    url = f'{API}/{name}?' + urllib.parse.urlencode({'serviceKey': key, 'pageNo': 1, 'numOfRows': 100, 'type': 'json', **q})
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            raw = r.read().decode('utf-8', 'replace')
    except Exception as e:
        return None, f'오류 {e}'
    try:
        return json.loads(raw), None
    except ValueError:
        return None, '(JSON 아님) ' + raw[:300]
info, err = call('cso_info_v2', numOfRows=500)
rows = (info or {}).get('body', {}).get('items', {}).get('item', []) if info else []
rows = rows if isinstance(rows, list) else [rows]
out.append(f'- cso_info_v2: {len(rows)}곳 {err or ""}')
for r in rows[:3]:
    stdg = r.get('stdgCd')
    for q in ({'stdgCd': stdg}, {}):
        d, err = call('cso_realtime_v2', **q)
        out += ['', f'## cso_realtime_v2 {q or "(인자 없음)"} — {r.get("csoNm")} csoSn={r.get("csoSn")}', '']
        if err:
            out.append(err); continue
        out.append('최상위 키: ' + ', '.join(d.keys()))
        body = d.get('body') or d.get('response', {}).get('body') or {}
        out.append('body 키: ' + ', '.join(body.keys()) + f" · totalCount {body.get('totalCount')}")
        items = body.get('items')
        it = items.get('item') if isinstance(items, dict) else items
        it = it if isinstance(it, list) else ([it] if it else [])
        out.append(f'줄 수 {len(it)}')
        if it:
            out.append('첫 줄: `' + json.dumps(it[0], ensure_ascii=False)[:600] + '`')
            out.append('csoSn 값들: ' + ', '.join(sorted({str(x.get('csoSn')) for x in it}))[:300])
        else:
            out.append('응답 일부: `' + json.dumps(d, ensure_ascii=False)[:400] + '`')
Path('reports/civil').mkdir(parents=True, exist_ok=True)
Path('reports/civil/cso-sample.md').write_text('\n'.join(out) + '\n', encoding='utf-8')
print('\n'.join(out))
