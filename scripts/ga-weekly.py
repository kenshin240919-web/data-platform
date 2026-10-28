"""GA4 주간 보고서: 내근처 12개 사이트의 지난 7일(어제까지) 숫자를 지난주와 비교해
reports/ga/주간-YYYY-MM-DD.md 로 저장한다(저장소 공개 — 10/25 사용자 A안 승인).

Secret GA_SERVICE_ACCOUNT_JSON(서비스 계정 키, 각 GA 계정 뷰어). 속성 번호는 Admin API로 찾고
측정 ID로 사이트를 맞춘다. Data API는 무료(속성별 하루 토큰 한도 안).
"""
import datetime as dt
import json
import os
import pathlib
import sys

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account

SITES = {  # 측정 ID → (사이트, 주소)
    'G-WN326BYC7E': ('trip', 'trip.guidejung.com'),
    'G-MFS9C8WXBV': ('weather', 'weather.guidejung.com'),
    'G-1S5MH65EE3': ('traffic', 'traffic.guidejung.com'),
    'G-2DF9TG7EP5': ('charge', 'charge.guidejung.com'),
    'G-2GK6W3WQ5C': ('academy', 'academy.guidejung.com'),
    'G-FLG82C9D1P': ('school', 'school.guidejung.com'),
    'G-6LD4WJJCTH': ('pharmacy', 'pharmacy.guidejung.com'),
    'G-NB6822FH1B': ('hospital', 'hospital.guidejung.com'),
    'G-45BQ6EFDMZ': ('oil', 'oil.guidejung.com'),
    'G-NXZWMSBESF': ('parking', 'parking.guidejung.com'),
    'G-KKTGJHYGKE': ('service', 'service.guidejung.com'),
    'G-E02X7KDB7H': ('near', 'near.guidejung.com'),
    'G-M9FGX8WRZJ': ('rest', 'rest.guidejung.com'),
    'G-QWM4LNN23V': ('pet', 'pet.guidejung.com'),
    'G-NME313D4B7': ('civil', 'minwon.guidejung.com'),
    'G-L2J6MMPR8B': ('market', 'market.guidejung.com'),
    'G-8SJBVG4TJ5': ('benefit', 'benefit.guidejung.com'),
}
ORDER = [v[0] for v in SITES.values()]
THIS = {'startDate': '7daysAgo', 'endDate': 'yesterday'}
PREV = {'startDate': '14daysAgo', 'endDate': '8daysAgo'}
BASE = ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'engagementRate', 'userEngagementDuration']

raw = os.environ.get('GA_SERVICE_ACCOUNT_JSON', '')
if not raw.strip():
    sys.exit('GA_SERVICE_ACCOUNT_JSON 비어 있음')
cred = service_account.Credentials.from_service_account_info(
    json.loads(raw), scopes=['https://www.googleapis.com/auth/analytics.readonly'])
cred.refresh(Request())
S = requests.Session()
S.headers['Authorization'] = f'Bearer {cred.token}'


def get(url):
    r = S.get(url, timeout=30)
    r.raise_for_status()
    return r.json()


def report(pid, body):
    r = S.post(f'https://analyticsdata.googleapis.com/v1beta/properties/{pid}:runReport', json=body, timeout=60)
    if r.status_code != 200:
        print(f'  {pid} 오류 {r.status_code} {r.text[:200]}')
        return []
    out = []
    for row in r.json().get('rows', []):
        dims = [d['value'] for d in row.get('dimensionValues', [])]
        mets = [float(m['value']) for m in row.get('metricValues', [])]
        out.append((dims, mets))
    return out


def properties():
    found, token = {}, ''
    while True:
        j = get('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200' + (f'&pageToken={token}' if token else ''))
        for a in j.get('accountSummaries', []):
            for p in a.get('propertySummaries', []):
                pid = p['property'].split('/')[-1]
                for s in get(f'https://analyticsadmin.googleapis.com/v1beta/properties/{pid}/dataStreams').get('dataStreams', []):
                    mid = (s.get('webStreamData') or {}).get('measurementId')
                    if mid in SITES:
                        found[SITES[mid][0]] = pid
        token = j.get('nextPageToken')
        if not token:
            return found


def totals(pid, rng):
    rows = report(pid, {'dateRanges': [rng], 'metrics': [{'name': m} for m in BASE]})
    return dict(zip(BASE, rows[0][1])) if rows else dict.fromkeys(BASE, 0.0)


def top(pid, dim, metric, n=5, extra=None):
    body = {'dateRanges': [THIS], 'dimensions': [{'name': dim}], 'metrics': [{'name': metric}],
            'orderBys': [{'metric': {'metricName': metric}, 'desc': True}], 'limit': n}
    if extra:
        body.update(extra)
    return [(d[0], m[0]) for d, m in report(pid, body)]


def n(v):
    return f'{round(v):,}'


def dur(sec):
    sec = round(sec)
    return f'{sec // 60}분 {sec % 60}초' if sec >= 60 else f'{sec}초'


def pct(a, b):
    if not b:
        return '새로' if a else '–'
    d = (a - b) / b * 100
    return f'{d:+.0f}%'


def per_user(t):
    return t['userEngagementDuration'] / t['activeUsers'] if t['activeUsers'] else 0


props = properties()
print('속성', len(props), '/', len(SITES))
today = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date()
end = today - dt.timedelta(days=1)
start = end - dt.timedelta(days=6)

data = {}
for site in ORDER:
    pid = props.get(site)
    if not pid:
        continue
    t, p = totals(pid, THIS), totals(pid, PREV)
    data[site] = {
        'this': t, 'prev': p,
        'channels': top(pid, 'sessionDefaultChannelGroup', 'sessions'),
        'sources': top(pid, 'sessionSource', 'sessions'),
        'pages': top(pid, 'pagePath', 'screenPageViews'),
        'landing': top(pid, 'landingPage', 'sessions'),
        'events': dict(top(pid, 'eventName', 'eventCount', 10, {'dimensionFilter': {'filter': {
            'fieldName': 'eventName', 'inListFilter': {'values': ['share', 'favorite', 'install_hint', 'install_click', 'install_done', 'alert_click', 'push_subscribe']}}}})),
    }

L = [f'# 내근처 GA 주간 보고서 ({start} ~ {end})', '',
     f'자동 생성 {today} · `scripts/ga-weekly.py` · 기간: 지난 7일(어제까지), 비교: 그 전 7일. 증감은 지난주 대비.', '']
sum_u = sum(d['this']['activeUsers'] for d in data.values())
sum_p = sum(d['prev']['activeUsers'] for d in data.values())
sum_v = sum(d['this']['screenPageViews'] for d in data.values())
L += [f'**전체**: 사용자 {n(sum_u)}명({pct(sum_u, sum_p)}) · 조회 {n(sum_v)}회 · 사이트 {len(data)}/{len(SITES)}', '']
L += ['## 한눈에 보기', '',
      '| 사이트 | 사용자 | 증감 | 신규 | 세션 | 조회 | 세션당 조회 | 1인 참여 시간 | 참여율 | 공유 | 즐겨찾기 | 설치 안내 | 설치 누름 | 설치 | 알림 누름 | 알림 등록 시도 |',
      '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
for site in sorted(data, key=lambda s: -data[s]['this']['activeUsers']):
    t, p, e = data[site]['this'], data[site]['prev'], data[site]['events']
    spp = t['screenPageViews'] / t['sessions'] if t['sessions'] else 0
    L.append(f"| {site} | {n(t['activeUsers'])} | {pct(t['activeUsers'], p['activeUsers'])} | {n(t['newUsers'])} | "
             f"{n(t['sessions'])} | {n(t['screenPageViews'])} | {spp:.1f} | {dur(per_user(t))} | "
             f"{t['engagementRate'] * 100:.0f}% | {n(e.get('share', 0))} | {n(e.get('favorite', 0))} | "
             f"{n(e.get('install_hint', 0))} | {n(e.get('install_click', 0))} | {n(e.get('install_done', 0))} | {n(e.get('alert_click', 0))} | {n(e.get('push_subscribe', 0))} |")
L.append('')

for site in ORDER:
    if site not in data:
        L += [f'## {site}', '', '속성을 찾지 못함(서비스 계정 뷰어 권한 확인).', '']
        continue
    d = data[site]
    t, p = d['this'], d['prev']
    host = next(v[1] for v in SITES.values() if v[0] == site)
    L += [f'## {site} — {host}', '',
          f"사용자 {n(t['activeUsers'])}명({pct(t['activeUsers'], p['activeUsers'])}) · 세션 {n(t['sessions'])}"
          f"({pct(t['sessions'], p['sessions'])}) · 조회 {n(t['screenPageViews'])}({pct(t['screenPageViews'], p['screenPageViews'])})"
          f" · 1인 참여 {dur(per_user(t))}(지난주 {dur(per_user(p))})", '']
    for title, rows, unit in (('유입 경로', d['channels'], '세션'), ('유입 출처', d['sources'], '세션'),
                              ('첫 페이지(검색 유입 입구)', d['landing'], '세션'), ('많이 본 페이지', d['pages'], '조회')):
        L.append(f'- **{title}**: ' + (' · '.join(f'`{k}` {n(v)}' for k, v in rows) if rows else '없음'))
    L.append('')


# Clarity(reports/clarity/raw/*.json, collect-clarity.py가 매일 쌓음) 최근 7개 파일을 세션 수로 가중 평균
CL = {'QuickbackClick': '빠른 뒤로가기', 'DeadClickCount': '죽은 클릭', 'RageClickCount': '분노 클릭', 'ScriptErrorCount': '스크립트 오류'}
files = sorted(pathlib.Path('reports/clarity/raw').glob('*.json'))[-7:]
if files:
    agg = {}
    for f in files:
        for site, v in json.loads(f.read_text(encoding='utf-8')).get('sites', {}).items():
            a = agg.setdefault(site, {'sess': 0, 'bot': 0, 'scroll': 0.0, 'active': 0.0, 'urls': {}, **{k: 0.0 for k in CL}})
            m = {x['metricName']: x.get('information') or [{}] for x in v.get('all') or [] if isinstance(x, dict)}
            t = m.get('Traffic', [{}])[0]
            ss = float(t.get('totalSessionCount') or 0)
            a['sess'] += ss
            a['bot'] += float(t.get('totalBotSessionCount') or 0)
            a['scroll'] += float(m.get('ScrollDepth', [{}])[0].get('averageScrollDepth') or 0) * ss
            a['active'] += float(m.get('EngagementTime', [{}])[0].get('activeTime') or 0) * ss
            for k in CL:
                a[k] += float(m.get(k, [{}])[0].get('sessionsWithMetricPercentage') or 0) * ss
            for x in v.get('url') or []:
                if isinstance(x, dict) and x.get('metricName') in ('QuickbackClick', 'DeadClickCount', 'RageClickCount'):
                    for i in x.get('information') or []:
                        if i.get('subTotal'):
                            u = i.get('Url', '').split('guidejung.com', 1)[-1] or '/'
                            key = (CL[x['metricName']], u)
                            a['urls'][key] = a['urls'].get(key, 0) + i['subTotal']
    L += [f'## Clarity 행동 지표 (최근 {len(files)}일, {files[0].stem} ~ {files[-1].stem})', '',
          'Clarity 기준(세션 수로 가중 평균). 빠른 뒤로가기·죽은 클릭은 "원하는 게 없거나 눌러도 반응이 없다"는 신호.', '',
          '| 사이트 | 세션 | 봇 | 스크롤 깊이 | 활동 시간 | ' + ' | '.join(CL.values()) + ' |',
          '|---|---:|---:|---:|---:|' + '---:|' * len(CL)]
    for site in sorted(agg, key=lambda s: -agg[s]['sess']):
        a = agg[site]
        w = a['sess'] or 1
        L.append(f"| {site} | {n(a['sess'])} | {n(a['bot'])} | {a['scroll'] / w:.0f}% | {dur(a['active'] / w)} | "
                 + ' | '.join(f"{a[k] / w:.0f}%" for k in CL) + ' |')
    L.append('')
    bad = sorted(((c, site, k) for site, a in agg.items() for k, c in a['urls'].items()), reverse=True)[:10]
    if bad:
        L += ['**문제 신호가 많은 페이지 TOP 10**', ''] + [f'- {site} `{u}` — {kind} {n(c)}회' for c, site, (kind, u) in bad] + ['']

out = pathlib.Path('reports/ga') / f'주간-{today}.md'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text('\n'.join(L) + '\n', encoding='utf-8')
print('저장', out)
