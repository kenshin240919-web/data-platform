"""GA4 일별 비교(수동): 사이트별 하루 조회 수와, 두 기간(A·B)의 유입 출처/매체·첫 페이지를 비교해
reports/ga/일별-YYYY-MM-DD.md 로 저장한다. 주간 보고서와 같은 Secret·사이트 표를 쓴다.
환경 변수: DAYS(기본 18, 일별 표 길이), A_START·A_END·B_START·B_END(YYYY-MM-DD, 비교 기간), SITES_ONLY(쉼표).
"""
import datetime as dt
import importlib.util
import os
import pathlib
import sys

# ga-weekly.py는 불러오면 바로 보고서를 만들므로, 앞부분(설정·함수)만 잘라 실행한다.
src = pathlib.Path(__file__).with_name('ga-weekly.py').read_text(encoding='utf-8')
cut = src.index('\ndef pct(')
g = {'__file__': __file__}
exec(compile(src[:cut], 'ga-weekly-head', 'exec'), g)
report, properties, ORDER = g['report'], g['properties'], g['ORDER']

today = dt.date.today()
days = int(os.environ.get('DAYS') or 18)
A = {'startDate': os.environ.get('A_START') or str(today - dt.timedelta(days=10)), 'endDate': os.environ.get('A_END') or str(today - dt.timedelta(days=9))}
B = {'startDate': os.environ.get('B_START') or str(today - dt.timedelta(days=3)), 'endDate': os.environ.get('B_END') or str(today - dt.timedelta(days=2))}
only = [s for s in (os.environ.get('SITES_ONLY') or '').split(',') if s]
props = properties()
dates = [str(today - dt.timedelta(days=i)) for i in range(days, 0, -1)]
out = [f'# 내근처 GA 일별 비교 ({today})', '',
       f'자동 생성 · `scripts/ga-daily.py` · 비교 A {A["startDate"]}~{A["endDate"]} / B {B["startDate"]}~{B["endDate"]}', '',
       '## 하루 조회 수', '', '| 사이트 | ' + ' | '.join(d[5:] for d in dates) + ' |', '|---|' + '---:|' * len(dates)]
for site in ORDER:
    pid = props.get(site)
    if not pid or (only and site not in only):
        continue
    rows = report(pid, {'dateRanges': [{'startDate': dates[0], 'endDate': dates[-1]}], 'dimensions': [{'name': 'date'}],
                        'metrics': [{'name': 'screenPageViews'}]})
    m = {d[0]: v[0] for d, v in rows}
    out.append(f'| {site} | ' + ' | '.join(f'{round(m.get(d.replace("-", ""), 0)):,}' for d in dates) + ' |')
for site in ORDER:
    pid = props.get(site)
    if not pid or (only and site not in only):
        continue
    out += ['', f'## {site}', '']
    for dim, label in (('sessionSourceMedium', '유입 출처/매체'), ('landingPage', '첫 페이지'), ('deviceCategory', '기기')):
        body = {'dateRanges': [A, B], 'dimensions': [{'name': dim}], 'metrics': [{'name': 'sessions'}, {'name': 'screenPageViews'}],
                'orderBys': [{'metric': {'metricName': 'sessions'}, 'desc': True}], 'limit': 30}
        rows = report(pid, body)
        agg = {}
        for d, v in rows:
            key = d[0]
            rng = d[-1] if len(d) > 1 else 'date_range_0'
            a = agg.setdefault(key, [0, 0, 0, 0])
            if rng == 'date_range_0':
                a[0] += v[0]; a[1] += v[1]
            else:
                a[2] += v[0]; a[3] += v[1]
        out += [f'**{label}** (세션·조회)', '', '| 항목 | A 세션 | A 조회 | B 세션 | B 조회 |', '|---|---:|---:|---:|---:|']
        for k, a in sorted(agg.items(), key=lambda x: -(x[1][0] + x[1][2]))[:12]:
            out.append(f'| {k[:70]} | {round(a[0]):,} | {round(a[1]):,} | {round(a[2]):,} | {round(a[3]):,} |')
        out.append('')
p = pathlib.Path('reports/ga') / f'일별-{today}.md'
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text('\n'.join(out) + '\n', encoding='utf-8')
print('저장', p)
