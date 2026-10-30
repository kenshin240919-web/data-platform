"""애드센스 보고서(AdSense Management API v2, 읽기 전용).

Secrets: ADSENSE_CLIENT_ID · ADSENSE_CLIENT_SECRET · ADSENSE_REFRESH_TOKEN(사용자 OAuth — 애드센스 API는 서비스 계정을 받지 않음).
  --check      연결 시험: 계정·도메인 이름·행 수만 출력.
  --out DIR    지난 7일(어제까지)·그 전 7일 보고서를 DIR/주간-YYYY-MM-DD.md 로 쓴다.
수익·클릭률 같은 숫자는 로그에 출력하지 않는다(공개 저장소의 Actions 로그는 누구나 봄). 보고서는 비공개 저장소
ads 에만 올린다(adsense-weekly.yml) — 애드센스 약관의 기밀 정보에 클릭률 등 실적 통계가 들어간다고 알려져 있어 보수적으로.
"""
import datetime as dt
import os
import pathlib
import sys

import requests

API = 'https://adsense.googleapis.com/v2'
KST = dt.timezone(dt.timedelta(hours=9))
METRICS = ['ESTIMATED_EARNINGS', 'PAGE_VIEWS', 'PAGE_VIEWS_RPM', 'IMPRESSIONS', 'CLICKS', 'IMPRESSIONS_CTR']
# guidejung.com 쪽(워드프레스 등)은 읽기만 하고 '그 밖'으로 묶어 보여 준다.
OURS = ('trip', 'weather', 'traffic', 'charge', 'academy', 'school', 'pharmacy', 'hospital', 'oil', 'parking',
        'service', 'near', 'rest', 'pet', 'minwon', 'market', 'benefit')


def token():
    env = {k: os.environ.get(k, '').strip() for k in ('ADSENSE_CLIENT_ID', 'ADSENSE_CLIENT_SECRET', 'ADSENSE_REFRESH_TOKEN')}
    miss = [k for k, v in env.items() if not v]
    if miss:
        sys.exit('비어 있는 Secret: ' + ', '.join(miss))
    r = requests.post('https://oauth2.googleapis.com/token', data={
        'client_id': env['ADSENSE_CLIENT_ID'], 'client_secret': env['ADSENSE_CLIENT_SECRET'],
        'refresh_token': env['ADSENSE_REFRESH_TOKEN'], 'grant_type': 'refresh_token'}, timeout=30)
    if r.status_code != 200:
        # 오류 본문에는 토큰이 없다(error·error_description만).
        sys.exit(f'토큰 갱신 실패 {r.status_code}: {r.json().get("error")} — {r.json().get("error_description", "")}')
    return r.json()['access_token']


S = requests.Session()


def get(path, params=None):
    r = S.get(f'{API}/{path}', params=params, timeout=60)
    if r.status_code != 200:
        sys.exit(f'{path} 오류 {r.status_code}: {r.text[:300]}')
    return r.json()


CUR = {'code': None}


def report(acc, start, end, dims, metrics=METRICS):
    p = [('dateRange', 'CUSTOM'),
         ('startDate.year', start.year), ('startDate.month', start.month), ('startDate.day', start.day),
         ('endDate.year', end.year), ('endDate.month', end.month), ('endDate.day', end.day)]
    p += [('dimensions', d) for d in dims] + [('metrics', m) for m in metrics]
    d = get(f'{acc}/reports:generate', p)
    heads = d.get('headers', [])
    for h in heads:
        if h.get('currencyCode'):
            CUR['code'] = h['currencyCode']
    names = [h['name'] for h in heads]

    def conv(n, v):
        if n in dims:
            return v or ''
        try:
            return float(v)
        except (TypeError, ValueError):
            return 0.0
    rows = [{n: conv(n, c.get('value')) for n, c in zip(names, r['cells'])} for r in d.get('rows', [])]
    tot = {n: conv(n, c.get('value')) for n, c in zip(names, (d.get('totals') or {}).get('cells', []))} if d.get('totals') else {}
    return rows, tot


def money(v):
    if CUR['code'] in (None, 'KRW', 'JPY'):
        return f'{round(v):,}원' if CUR['code'] in (None, 'KRW') else f'¥{round(v):,}'
    return f'{v:,.2f} {CUR["code"]}'


def pct(v):
    return f'{v * 100:.2f}%'


def delta(a, b):
    if not b:
        return '새로' if a else '—'
    d = (a - b) / b * 100
    return f'{"+" if d >= 0 else ""}{d:.0f}%'


def site(dom):
    sub = dom.split('.')[0] if dom.endswith('.guidejung.com') else ''
    return sub if sub in OURS else ''


def table(heads, rows):
    out = ['| ' + ' | '.join(heads) + ' |', '|' + '---|' * len(heads)]
    out += ['| ' + ' | '.join(str(c) for c in r) + ' |' for r in rows]
    return '\n'.join(out)


def build(acc, out_dir):
    end = dt.datetime.now(KST).date() - dt.timedelta(days=1)
    start = end - dt.timedelta(days=6)
    pend, pstart = start - dt.timedelta(days=1), start - dt.timedelta(days=7)
    this, tot = report(acc, start, end, ['DOMAIN_NAME'])
    prev, ptot = report(acc, pstart, pend, ['DOMAIN_NAME'])
    pmap = {r['DOMAIN_NAME']: r for r in prev}
    E = 'ESTIMATED_EARNINGS'
    total = tot.get(E) or sum(r[E] for r in this)
    L = [f'# 애드센스 주간 보고서 {end.isoformat()}', '',
         f'기간 {start}~{end}(한국 날짜, 어제까지 7일) · 비교 {pstart}~{pend} · 통화 {CUR["code"] or "?"} · 추정 수익(확정 전).',
         '비공개 저장소 전용 — 공개 저장소·채팅 밖으로 옮기지 말 것.', '']
    pv = tot.get('PAGE_VIEWS') or sum(r['PAGE_VIEWS'] for r in this)
    L += ['## 한 줄 요약', '',
          f'- 수익 {money(total)} ({delta(total, ptot.get(E, 0))}) · 페이지 조회 {round(pv):,} ({delta(pv, ptot.get("PAGE_VIEWS", 0))}) · '
          f'페이지 RPM {money(tot.get("PAGE_VIEWS_RPM", 0))} · 클릭 {round(tot.get("CLICKS", 0)):,} · 노출 클릭률 {pct(tot.get("IMPRESSIONS_CTR", 0))}', '']
    rows = []
    ours_e = 0.0
    for r in sorted(this, key=lambda r: -r[E]):
        s = site(r['DOMAIN_NAME'])
        if s:
            ours_e += r[E]
        p = pmap.get(r['DOMAIN_NAME'], {})
        rows.append([r['DOMAIN_NAME'] + ('' if s else ' (내근처 아님)'), money(r[E]), pct(r[E] / total) if total else '—',
                     delta(r[E], p.get(E, 0)), f'{round(r["PAGE_VIEWS"]):,}', money(r['PAGE_VIEWS_RPM']),
                     f'{round(r["CLICKS"]):,}', pct(r['IMPRESSIONS_CTR'])])
    L += [f'## 사이트별 (내근처 합계 {money(ours_e)} · 전체의 {pct(ours_e / total) if total else "—"})', '',
          table(['도메인', '수익', '비중', '지난주 대비', '페이지 조회', '페이지 RPM', '클릭', '노출 클릭률'], rows), '']
    # 조회는 많은데 RPM이 낮은 곳 = 광고 배치·콘텐츠 개선 후보, RPM이 높은 곳 = 트래픽을 키울 곳.
    ours = [r for r in this if site(r['DOMAIN_NAME']) and r['PAGE_VIEWS'] >= 100]
    if ours:
        hi = sorted(ours, key=lambda r: -r['PAGE_VIEWS_RPM'])[:3]
        lo = sorted(ours, key=lambda r: r['PAGE_VIEWS_RPM'])[:3]
        L += ['## 읽을 거리(조회 100회 이상 내근처 사이트)', '',
              '- RPM 높은 곳(트래픽을 키우면 수익이 잘 느는 곳): ' + ', '.join(f'{site(r["DOMAIN_NAME"])} {money(r["PAGE_VIEWS_RPM"])}' for r in hi),
              '- RPM 낮은 곳(광고 배치·체류 개선 후보): ' + ', '.join(f'{site(r["DOMAIN_NAME"])} {money(r["PAGE_VIEWS_RPM"])}' for r in lo), '']
    for dim, title in (('PLATFORM_TYPE_NAME', '기기별'), ('AD_UNIT_NAME', '광고 단위별(이름 없음 = 자동광고)')):
        rs, _ = report(acc, start, end, [dim])
        L += [f'## {title}', '', table(['구분', '수익', '비중', '페이지 RPM', '노출', '노출 클릭률'], [
            [r[dim] or '(이름 없음)', money(r[E]), pct(r[E] / total) if total else '—', money(r['PAGE_VIEWS_RPM']),
             f'{round(r["IMPRESSIONS"]):,}', pct(r['IMPRESSIONS_CTR'])] for r in sorted(rs, key=lambda r: -r[E])]), '']
    days, _ = report(acc, start, end, ['DATE'], [E, 'PAGE_VIEWS'])
    L += ['## 날짜별', '', table(['날짜', '수익', '페이지 조회'],
                                 [[r['DATE'], money(r[E]), f'{round(r["PAGE_VIEWS"]):,}'] for r in sorted(days, key=lambda r: r['DATE'])]), '']
    p = pathlib.Path(out_dir) / f'주간-{end.isoformat()}.md'
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text('\n'.join(L), encoding='utf-8')
    print(f'보고서 저장: {p.name} (도메인 {len(this)}개)')


def main():
    S.headers['Authorization'] = f'Bearer {token()}'
    accs = get('accounts').get('accounts', [])
    print(f'계정 {len(accs)}개')
    if not accs:
        sys.exit('애드센스 계정이 보이지 않음(로그인한 구글 계정 확인)')
    acc = accs[0]['name']
    if '--check' in sys.argv:
        end = dt.datetime.now(KST).date() - dt.timedelta(days=1)
        start = end - dt.timedelta(days=6)
        rows, _ = report(acc, start, end, ['DOMAIN_NAME'], ['PAGE_VIEWS'])
        doms = sorted({r['DOMAIN_NAME'] for r in rows if r.get('DOMAIN_NAME')})
        print(f'계정 상태 {accs[0].get("state", "?")} · 기간 {start}~{end} · 도메인 {len(doms)}개')
        for d in doms:
            print('  ', d)
        units, _ = report(acc, start, end, ['AD_UNIT_NAME'], ['IMPRESSIONS'])
        print(f'광고 단위 행 {len(units)}개 — 연결 정상(숫자는 출력하지 않음)')
        return
    if '--out' not in sys.argv:
        sys.exit('--out DIR 필요(비공개 저장소 폴더)')
    build(acc, sys.argv[sys.argv.index('--out') + 1])


main()
