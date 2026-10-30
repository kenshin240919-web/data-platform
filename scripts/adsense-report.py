"""애드센스 보고서(AdSense Management API v2, 읽기 전용).

Secrets: ADSENSE_CLIENT_ID · ADSENSE_CLIENT_SECRET · ADSENSE_REFRESH_TOKEN(사용자 OAuth — 애드센스 API는 서비스 계정을 받지 않음).
  --check  연결 시험: 계정·도메인 이름·행 수만 출력(수익·클릭률 등 숫자는 출력하지 않음 — 공개 저장소의 Actions 로그는 누구나 봄).
  (기본)   지난 7일·그 전 7일 보고서를 OUT 경로에 마크다운으로 쓴다. 공개 저장소에 커밋하지 말 것
           (애드센스 약관의 기밀 정보에 클릭률 등 실적 통계가 들어간다고 알려져 있음 — 확인 전이라 보수적으로).
"""
import datetime as dt
import os
import sys

import requests

API = 'https://adsense.googleapis.com/v2'
KST = dt.timezone(dt.timedelta(hours=9))


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


def report(acc, start, end, dims, metrics):
    p = [('dateRange', 'CUSTOM'),
         ('startDate.year', start.year), ('startDate.month', start.month), ('startDate.day', start.day),
         ('endDate.year', end.year), ('endDate.month', end.month), ('endDate.day', end.day)]
    p += [('dimensions', d) for d in dims] + [('metrics', m) for m in metrics]
    d = get(f'{acc}/reports:generate', p)
    heads = [h['name'] for h in d.get('headers', [])]
    rows = [dict(zip(heads, [c.get('value') for c in r['cells']])) for r in d.get('rows', [])]
    return rows, d.get('totals'), heads


def main():
    S.headers['Authorization'] = f'Bearer {token()}'
    accs = get('accounts').get('accounts', [])
    print(f'계정 {len(accs)}개')
    if not accs:
        sys.exit('애드센스 계정이 보이지 않음(로그인한 구글 계정 확인)')
    acc = accs[0]['name']
    end = dt.datetime.now(KST).date() - dt.timedelta(days=1)
    start = end - dt.timedelta(days=6)
    rows, _, _ = report(acc, start, end, ['DOMAIN_NAME'], ['PAGE_VIEWS'])
    doms = sorted({r['DOMAIN_NAME'] for r in rows if r.get('DOMAIN_NAME')})
    if '--check' in sys.argv:
        print(f'계정 상태 {accs[0].get("state", "?")} · 기간 {start}~{end} · 도메인 {len(doms)}개')
        for d in doms:
            print('  ', d)
        units, _, _ = report(acc, start, end, ['AD_UNIT_NAME'], ['IMPRESSIONS'])
        print(f'광고 단위 행 {len(units)}개 — 연결 정상(숫자는 출력하지 않음)')
        return
    sys.exit('보고서 저장 위치를 정한 뒤 사용(공개 저장소 커밋 금지)')


main()
