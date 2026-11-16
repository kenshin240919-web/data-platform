"""Workers CPU 사용량을 Worker(사이트)별로 모아 보기 — Cloudflare GraphQL 분석 API(읽기만).

11/16 사용자: '11/15 청구서의 CPU 초과분($3.64)이 어느 사이트에서 나오는지 사이트별로 찾아봐'.
요청(fetch)과 예약 작업(Cron)을 따로 모아 지난 N일 합계를 표로 → reports/cf/cpu-YYYY-MM-DD.md.
토큰에 '계정 분석 읽기(Account Analytics: Read)' 권한이 없으면 오류를 그대로 적고 끝냄.
"""
import json, os, sys, urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

TOKEN = os.environ.get('CLOUDFLARE_API_TOKEN'); ACC = os.environ.get('CLOUDFLARE_ACCOUNT_ID')
DAYS = int(os.environ.get('DAYS') or 30)
OUT = Path(__file__).resolve().parents[1] / 'reports/cf'


def gql(query, variables):
    req = urllib.request.Request('https://api.cloudflare.com/client/v4/graphql', method='POST',
                                 data=json.dumps({'query': query, 'variables': variables}).encode(),
                                 headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


Q_REQ = """query($acc:String!,$a:Time!,$b:Time!){viewer{accounts(filter:{accountTag:$acc}){
 workersInvocationsAdaptive(limit:10000,filter:{datetime_geq:$a,datetime_lt:$b}){
  dimensions{scriptName} sum{requests errors subrequests cpuTimeUs} quantiles{cpuTimeP50 cpuTimeP99}}}}}"""
Q_CRON = """query($acc:String!,$a:Time!,$b:Time!){viewer{accounts(filter:{accountTag:$acc}){
 workersInvocationsScheduled(limit:10000,filter:{datetime_geq:$a,datetime_lt:$b}){
  scriptName cron cpuTimeUs status}}}}"""


def main():
    if not TOKEN or not ACC:
        sys.exit('CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID 없음')
    end = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    req, cron, errs = {}, {}, []
    # 큰 기간은 거절될 수 있어 하루씩 나눠 받음
    for d in range(DAYS):
        b = end - timedelta(days=d); a = b - timedelta(days=1)
        v = {'acc': ACC, 'a': a.isoformat().replace('+00:00', 'Z'), 'b': b.isoformat().replace('+00:00', 'Z')}
        try:
            r = gql(Q_REQ, v)
            if r.get('errors'):
                errs.append(f'요청 {v["a"][:10]}: ' + '; '.join(e.get('message', '') for e in r['errors'])); 
            else:
                for row in r['data']['viewer']['accounts'][0]['workersInvocationsAdaptive']:
                    s = row['dimensions']['scriptName']; t = req.setdefault(s, {'req': 0, 'err': 0, 'sub': 0, 'cpu': 0, 'p99': 0})
                    t['req'] += row['sum']['requests']; t['err'] += row['sum']['errors']; t['sub'] += row['sum']['subrequests']
                    t['cpu'] += row['sum']['cpuTimeUs']; t['p99'] = max(t['p99'], row['quantiles']['cpuTimeP99'] or 0)
        except Exception as e:  # noqa: BLE001
            errs.append(f'요청 {v["a"][:10]}: {e}')
        try:
            r = gql(Q_CRON, v)
            if r.get('errors'):
                errs.append(f'예약 {v["a"][:10]}: ' + '; '.join(e.get('message', '') for e in r['errors']))
            else:
                for row in r['data']['viewer']['accounts'][0]['workersInvocationsScheduled']:
                    t = cron.setdefault(row['scriptName'], {'runs': 0, 'cpu': 0, 'fail': 0})
                    t['runs'] += 1; t['cpu'] += row['cpuTimeUs'] or 0; t['fail'] += row['status'] != 'success'
        except Exception as e:  # noqa: BLE001
            errs.append(f'예약 {v["a"][:10]}: {e}')
        if errs and not req and not cron and d >= 1:
            break  # 권한 없음 등으로 처음부터 안 되면 더 부르지 않음
    ms = lambda us: us / 1000
    tot = sum(t['cpu'] for t in req.values()) + sum(t['cpu'] for t in cron.values())
    lines = [f'# Workers CPU 사이트별 ({(end - timedelta(days=DAYS)).date()} ~ {end.date()}, {DAYS}일)', '',
             f'- 합계 CPU {ms(tot):,.0f} ms (요청 {ms(sum(t["cpu"] for t in req.values())):,.0f} · 예약 작업 {ms(sum(t["cpu"] for t in cron.values())):,.0f})', '']
    rows = {}
    for s, t in req.items(): rows.setdefault(s, {}).update(req=t)
    for s, t in cron.items(): rows.setdefault(s, {}).update(cron=t)
    lines += ['| Worker | 전체 CPU(ms) | 비중 | 요청 수 | 요청 CPU(ms) | 요청당 평균(ms) | 요청 P99(ms) | 예약 실행 | 예약 CPU(ms) | 1회 평균(ms) |', '|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|']
    def total(x): return x.get('req', {}).get('cpu', 0) + x.get('cron', {}).get('cpu', 0)
    for s, x in sorted(rows.items(), key=lambda kv: -total(kv[1])):
        r, c = x.get('req', {}), x.get('cron', {})
        lines.append(f"| {s} | {ms(total(x)):,.0f} | {total(x) / tot * 100 if tot else 0:.1f}% | {r.get('req', 0):,} | {ms(r.get('cpu', 0)):,.0f} | "
                     f"{ms(r['cpu']) / r['req'] if r.get('req') else 0:,.1f} | {r.get('p99', 0) / 1000 if r.get('p99', 0) > 1000 else r.get('p99', 0):,.1f} | "
                     f"{c.get('runs', 0):,} | {ms(c.get('cpu', 0)):,.0f} | {ms(c['cpu']) / c['runs'] if c.get('runs') else 0:,.1f} |")
    if errs:
        lines += ['', '## 오류(앞 5개)', *[f'- {e}' for e in errs[:5]]]
    text = '\n'.join(lines) + '\n'
    print(text)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f'cpu-{end.date()}.md').write_text(text, encoding='utf-8')


if __name__ == '__main__':
    main()
