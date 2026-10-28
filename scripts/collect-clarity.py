"""Clarity 하루 수집: 12개 프로젝트의 최근 24시간 지표(전체·URL별·기기별)를 받아
reports/clarity/raw/YYYY-MM-DD.json 으로 저장한다(공개 저장소 — 10/25 사용자 A안 승인).

Secret CLARITY_TOKENS: 한 줄에 `사이트=토큰`. Clarity Data Export API는 무료,
프로젝트당 하루 10번·최근 1~3일만 → 매일 3번(전체·URL·기기) 받아 쌓는다.
"""
import datetime as dt
import json
import os
import pathlib
import sys
import time

import requests

API = 'https://www.clarity.ms/export-data/api/v1/project-live-insights'
SITES = ['trip', 'weather', 'traffic', 'charge', 'academy', 'school',
         'pharmacy', 'hospital', 'oil', 'parking', 'service', 'near', 'rest', 'pet', 'civil', 'market', 'benefit']
CALLS = {'all': {}, 'url': {'dimension1': 'URL'}, 'device': {'dimension1': 'Device'}}

tokens = {}
for line in os.environ.get('CLARITY_TOKENS', '').splitlines():
    if '=' in line:
        k, v = line.split('=', 1)
        if k.strip() and v.strip():
            tokens[k.strip().lower()] = v.strip()
if not tokens:
    sys.exit('CLARITY_TOKENS 비어 있음')
unknown = sorted(set(tokens) - set(SITES))
if unknown:
    print('모르는 사이트 이름(무시):', ', '.join(unknown))

out, ok = {}, 0
for site in SITES:
    tok = tokens.get(site)
    if not tok:
        print(f'{site}: 토큰 없음')
        continue
    out[site] = {}
    for name, extra in CALLS.items():
        r = requests.get(API, params={'numOfDays': 1, **extra}, timeout=60,
                         headers={'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'})
        if r.status_code == 200:
            out[site][name] = r.json()
            ok += 1
        else:
            out[site][name] = {'error': r.status_code}
            print(f'{site}/{name}: 오류 {r.status_code} {r.text[:150]}')
        time.sleep(1)
    print(f'{site}: ' + ', '.join(f"{k} {'OK' if 'error' not in v else v['error']}" for k, v in out[site].items()))

today = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date()
p = pathlib.Path('reports/clarity/raw') / f'{today}.json'
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text(json.dumps({'date': str(today), 'window': 'last 24h', 'sites': out}, ensure_ascii=False, indent=1) + '\n',
             encoding='utf-8')
print(f'저장 {p} · 성공 호출 {ok}/{len(out) * len(CALLS)}')
if not ok:
    sys.exit(1)
