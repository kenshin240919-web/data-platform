"""Search Console 검색어(최근 28일) — 사이트 하나의 검색어·페이지·노출·클릭·평균 순위(11/27 일자리 요청서).
검색 실적 숫자라 공개 저장소에는 쓰지 않고 비공개 ads 저장소(--out)에만 씀. 로그에는 줄 수만.
Usage: GA_SERVICE_ACCOUNT_JSON=... python scripts/gsc-queries.py job --out private/gsc"""
import json, os, sys, urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path
import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account

site = (sys.argv[1:] or ['job'])[0]
out = Path(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else Path('runtime/gsc')
cred = service_account.Credentials.from_service_account_info(json.loads(os.environ['GA_SERVICE_ACCOUNT_JSON']), scopes=['https://www.googleapis.com/auth/webmasters.readonly'])
cred.refresh(Request())
KST = timezone(timedelta(hours=9))
end = datetime.now(KST).date() - timedelta(days=2)
start = end - timedelta(days=27)
url = f"https://www.googleapis.com/webmasters/v3/sites/{urllib.parse.quote('sc-domain:guidejung.com', safe='')}/searchAnalytics/query"
body = {'startDate': str(start), 'endDate': str(end), 'dimensions': ['query', 'page'], 'rowLimit': 1000,
        'dimensionFilterGroups': [{'filters': [{'dimension': 'page', 'operator': 'contains', 'expression': f'//{site}.guidejung.com'}]}]}
r = requests.post(url, json=body, headers={'Authorization': f'Bearer {cred.token}'}, timeout=60)
r.raise_for_status()
rows = r.json().get('rows', [])
rows.sort(key=lambda x: -x['impressions'])
lines = [f'# {site} 검색어 {start} ~ {end} (Search Console)', '', f'{len(rows)}줄 · 노출 많은 순', '',
         '| 검색어 | 페이지 | 노출 | 클릭 | 평균 순위 | 눈여겨볼 점 |', '|---|---|---:|---:|---:|---|']
for x in rows:
    q, p = x['keys']; pos = x['position']
    note = '8~20위' if 8 <= pos <= 20 else ''
    lines.append(f"| {q} | {urllib.parse.urlparse(p).path} | {x['impressions']:,} | {x['clicks']:,} | {pos:.1f} | {note} |")
out.mkdir(parents=True, exist_ok=True)
(out / f'검색어-{site}-{datetime.now(KST):%Y-%m-%d}.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
print(f'{site}: {len(rows)}줄 저장')
