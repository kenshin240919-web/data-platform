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
# 할당량 초과로 못 넣은 주소(11/9 사용자 '내일 다시 알려줘'): [[사이트, 주소], …] — 다음 실행이 맨 앞에 다시 내고 비움.
RETRY = ROOT / 'reports/gsc/index-retry.json'
REDO_DAYS = 21
MAX_INSPECT = 80
SKIP = re.compile(r'/(about|data-policy|privacy|search|compare|alerts)(/|$)')
FOCUS = {'hospital': 3}  # 사이트 → 하루에 먼저 뽑을 개수
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
    # [사이트, 주소] 또는 [사이트, 주소, '이 날짜부터'] — 날짜가 오늘보다 뒤면 그날까지 남겨 둠(오늘 실행이 늦게 돌아 미리 써 버리는 것 방지)
    retry_all = json.loads(RETRY.read_text(encoding='utf-8')) if RETRY.exists() else []
    due = [r for r in retry_all if len(r) < 3 or r[2] <= today.isoformat()]
    later = [r for r in retry_all if not (len(r) < 3 or r[2] <= today.isoformat())]
    picks, inspected, indexed = [(r[0], r[1]) for r in due][:n], 0, 0
    again = {u for _, u in picks}
    for _, q in queues:
        q[:] = [u for u in q if u not in again]
    if picks:
        print(f'어제 못 넣은 주소 {len(picks)}개를 먼저')
    # 병원은 하루 FOCUS개 먼저(11/2 애드센스: 내근처 수익의 절반·RPM 가장 높음 — 사용자 승인),
    # 나머지는 날마다 시작 사이트를 바꿔 돌아가며(전에는 늘 앞쪽 사이트만 뽑혀 뒤쪽 사이트는 차례가 오지 않았음).
    focus = [x for x in queues if x[0] in FOCUS]
    rest = [x for x in queues if x[0] not in FOCUS]
    off = today.toordinal() % max(1, len(rest))
    order = [x for x in focus for _ in range(FOCUS[x[0]])] + rest[off:] + rest[:off]
    rnd = 0
    while len(picks) < n and any(q for _, q in queues) and inspected < MAX_INSPECT:
        site, q = order[rnd % len(order)] if rnd < len(order) else rest[(off + rnd) % len(rest)]
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
    if RETRY.exists():
        rest_retry = due[n:] + later
        if rest_retry:
            RETRY.write_text(json.dumps(rest_retry, ensure_ascii=False, indent=0), encoding='utf-8')
        else:
            RETRY.unlink()


if __name__ == '__main__':
    main()
