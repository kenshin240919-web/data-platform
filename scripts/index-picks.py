"""매일 '색인 생성 요청'할 주소 10개 고르기(10/28 사용자: 16개 사이트에서 많이 찾는 곳을 매일 10개씩).

Search Console의 '색인 생성 요청'은 브라우저에서만 됨(공개 API인 Indexing API는 채용 공고·방송 영상용이라 쓰지 않음) →
여기서는 고르기만 하고, 사용자가 URL 검사 칸에 붙여 넣어 요청한다.
1. 사이트마다(packages/ui/src/network.tsx SITES) 라이브 사이트맵의 정적 페이지를 점수로 줄 세움:
   첫 화면 > 모음 페이지(/region·/doc 등) > 사람이 많은 시군구 페이지(약국 수로 어림) > 그 밖.
   서류 사이트 /doc/*는 많이 찾는 서류 순, 시장 /market/*는 가맹점 많은 순.
2. 사이트를 돌아가며 하나씩 뽑되, 이미 준 주소(reports/gsc/index-requests.json)는 빼고,
   URL 검사(Search Console API, 하루 2,000건)로 이미 색인된 곳도 뺌. 준 지 21일이 넘었는데 아직 색인 안 된 곳은 다시 줌.
결과: reports/gsc/색인요청-오늘.md(+ 날짜별 사본). 검색 실적 숫자는 넣지 않음.
Usage: GA_SERVICE_ACCOUNT_JSON=... python scripts/index-picks.py [--n 10] [--dry]
"""
import json
import os
import re
import sys
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
PROP = 'sc-domain:guidejung.com'
INSPECT = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'
KST = timezone(timedelta(hours=9))
UA = {'User-Agent': 'Mozilla/5.0 (compatible; GuideJungGSC/1.0; +https://near.guidejung.com)'}
STATE = ROOT / 'reports/gsc/index-requests.json'
REDO_DAYS = 21
MAX_INSPECT = 80
SKIP = re.compile(r'/(about|data-policy|privacy|search|compare|alerts)(/|$)')
HUB = re.compile(r'^/[a-z0-9-]+$')  # /region·/doc·/24h·/rank 같은 한 단계 모음 페이지


def hosts():
    net = (ROOT / 'packages/ui/src/network.tsx').read_text(encoding='utf-8')
    return [(k, h) for k, h, rest in re.findall(r"^\s+(\w+):\{url:'https://(\w+\.guidejung\.com)'(.*)$", net, re.M) if 'hidden:true' not in rest]


def page_urls(host):
    """사이트맵에서 정적 페이지 주소(묶음이면 pages가 들어간 하위 사이트맵만 — 상세 수만 쪽은 빼고)."""
    try:
        body = requests.get(f'https://{host}/sitemap.xml', headers=UA, timeout=60).text
        if '<sitemapindex' in body:
            subs = [l.strip() for l in re.findall(r'<loc>([^<]+)</loc>', body)]
            body = ''.join(requests.get(s, headers=UA, timeout=60).text for s in subs if 'pages' in s)
    except requests.RequestException:
        return []
    return [u.strip().replace('&amp;', '&') for u in re.findall(r'<loc>([^<]+)</loc>', body)]


def population():
    """시군구 코드 → 약국 수(사람 많은 곳 어림). 일반구 코드(41111)는 시 코드(41110)로도."""
    try:
        items = json.loads((ROOT / 'apps/pharmacy/data/pharmacies.json').read_text(encoding='utf-8'))['items']
    except (OSError, ValueError, KeyError):
        return Counter(), {}
    pop = Counter(str(p.get('region') or '') for p in items)
    trip = {}
    try:
        for r in json.loads((ROOT / 'apps/weather/data/regions.json').read_text(encoding='utf-8')):
            if (r.get('trip') or {}).get('id'):
                trip[r['trip']['id']] = r['code']
    except (OSError, ValueError):
        pass
    return pop, trip


def docs_order():
    s = (ROOT / 'apps/civil/lib/fmt.ts').read_text(encoding='utf-8')
    return re.findall(r"\{slug:'([a-z-]+)',title:", s.split('export const DOCS', 1)[-1])


def market_sizes():
    try:
        d = json.loads((ROOT / 'apps/market/data/market.json').read_text(encoding='utf-8'))
        return {m['id']: m['n'] for m in d['markets']}
    except (OSError, ValueError, KeyError):
        return {}


def score(url, host, pop, trip, docs, mk):
    path = url.split(host, 1)[-1].rstrip('/') or '/'
    if SKIP.search(path):
        return None
    if path == '/':
        return 100000
    m = re.match(r'^/doc/([a-z-]+)$', path)
    if m:
        return 50000 - (docs.index(m[1]) * 100 if m[1] in docs else 5000)
    m = re.match(r'^/market/([0-9a-f]+)$', path)
    if m:
        return 1000 + mk.get(m[1], 0)
    if HUB.match(path):
        return 60000
    m = re.match(r'^/(?:region|sido)/([^/]+)(/.*)?$', path)
    if m:
        code = trip.get(m[1], m[1])
        n = pop.get(code) or pop.get(code[:4] + '0', 0)
        return n * (1 if not m[2] else 0.5)
    return 1


def inspect(url, token):
    r = requests.post(INSPECT, headers={'Authorization': f'Bearer {token}'}, timeout=60,
                      json={'inspectionUrl': url, 'siteUrl': PROP, 'languageCode': 'ko-KR'})
    if not r.ok:
        return None
    return r.json().get('inspectionResult', {}).get('indexStatusResult', {}).get('verdict')


def main():
    n = int(sys.argv[sys.argv.index('--n') + 1]) if '--n' in sys.argv else 10
    dry = '--dry' in sys.argv
    today = datetime.now(KST).date()
    state = json.loads(STATE.read_text(encoding='utf-8')) if STATE.exists() else {}
    token = None
    if os.environ.get('GA_SERVICE_ACCOUNT_JSON'):
        from google.auth.transport.requests import Request
        from google.oauth2 import service_account
        cred = service_account.Credentials.from_service_account_info(
            json.loads(os.environ['GA_SERVICE_ACCOUNT_JSON']), scopes=['https://www.googleapis.com/auth/webmasters'])
        cred.refresh(Request())
        token = cred.token
    pop, trip = population()
    docs, mk = docs_order(), market_sizes()
    queues = []
    for site, host in hosts():
        ranked = sorted(((s, u) for u in page_urls(host) if (s := score(u, host, pop, trip, docs, mk)) is not None), key=lambda x: -x[0])
        q = [u for _, u in ranked if u not in state or (today - date.fromisoformat(state[u])).days >= REDO_DAYS]
        queues.append((site, q))
        print(f'{site}: 후보 {len(ranked):,} · 남은 {len(q):,}')
    picks, inspected, indexed = [], 0, 0
    rnd = 0
    while len(picks) < n and any(q for _, q in queues) and inspected < MAX_INSPECT:
        site, q = queues[rnd % len(queues)]
        rnd += 1
        if not q:
            continue
        url = q.pop(0)
        if token:
            inspected += 1
            v = inspect(url, token)
            if v == 'PASS':
                indexed += 1
                state[url] = state.get(url) or '0000-00-00'  # 이미 색인됨 — 다시 주지 않음(21일 뒤에도 PASS면 또 건너뜀)
                continue
        picks.append((site, url))
    print(f'URL 검사 {inspected}건 · 이미 색인 {indexed}건 · 고른 주소 {len(picks)}개')
    for _, u in picks:
        state[u] = today.isoformat()
    lines = [f'# 오늘의 색인 생성 요청 {len(picks)}개 ({today.isoformat()})', '',
             'Search Console 맨 위 "URL 검사" 칸에 한 줄씩 붙여 넣기 → **색인 생성 요청**. "할당량 초과"가 뜨면 거기서 멈추고 다음 날 이어서.', '',
             f'이미 색인된 곳 {indexed}곳은 뺐습니다. (scripts/index-picks.py)', '']
    for site, u in picks:
        lines += [f'- {site}', '```', u, '```']
    text = '\n'.join(lines) + '\n'
    print(text)
    if dry:
        return
    out = ROOT / 'reports/gsc'
    out.mkdir(parents=True, exist_ok=True)
    (out / '색인요청-오늘.md').write_text(text, encoding='utf-8')
    (out / f'색인요청-{today.isoformat()}.md').write_text(text, encoding='utf-8')
    STATE.write_text(json.dumps(dict(sorted(state.items())), ensure_ascii=False, indent=0), encoding='utf-8')


if __name__ == '__main__':
    main()
