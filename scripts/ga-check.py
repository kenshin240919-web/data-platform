"""GA 연결 시험: 서비스 계정으로 볼 수 있는 속성·웹 스트림 목록과 Data API 응답 여부만 출력.
공개 저장소의 Actions 로그에 남으므로 방문 수 같은 숫자는 출력하지 않는다."""
import json
import os
import sys

import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

SCOPES = ['https://www.googleapis.com/auth/analytics.readonly']
SITES = {
    'G-WN326BYC7E': 'trip', 'G-MFS9C8WXBV': 'weather', 'G-1S5MH65EE3': 'traffic',
    'G-2DF9TG7EP5': 'charge', 'G-2GK6W3WQ5C': 'academy', 'G-FLG82C9D1P': 'school',
    'G-6LD4WJJCTH': 'pharmacy', 'G-NB6822FH1B': 'hospital', 'G-45BQ6EFDMZ': 'oil',
    'G-NXZWMSBESF': 'parking', 'G-KKTGJHYGKE': 'service', 'G-E02X7KDB7H': 'near', 'G-M9FGX8WRZJ': 'rest', 'G-QWM4LNN23V': 'pet', 'G-NME313D4B7': 'civil', 'G-L2J6MMPR8B': 'market',
}

raw = os.environ.get('GA_SERVICE_ACCOUNT_JSON', '')
if not raw.strip():
    sys.exit('GA_SERVICE_ACCOUNT_JSON 비어 있음')
info = json.loads(raw)
print('서비스 계정:', info.get('client_email'))
cred = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
cred.refresh(Request())
H = {'Authorization': f'Bearer {cred.token}'}


def get(url):
    r = requests.get(url, headers=H, timeout=30)
    if r.status_code != 200:
        print('  오류', r.status_code, r.text[:300])
        return {}
    return r.json()


summ, token = [], ''
while True:
    j = get('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200' + (f'&pageToken={token}' if token else ''))
    summ += j.get('accountSummaries', [])
    token = j.get('nextPageToken')
    if not token:
        break
print('계정 수:', len(summ))
found = {}
for a in summ:
    print(f"\n[계정] {a.get('displayName')} ({a.get('account')})")
    for p in a.get('propertySummaries', []):
        pid = p['property'].split('/')[-1]
        streams = get(f'https://analyticsadmin.googleapis.com/v1beta/properties/{pid}/dataStreams').get('dataStreams', [])
        mids = [(s.get('webStreamData') or {}).get('measurementId', '') for s in streams]
        uris = [(s.get('webStreamData') or {}).get('defaultUri', '') for s in streams]
        site = next((SITES[m] for m in mids if m in SITES), '-')
        r = requests.post(f'https://analyticsdata.googleapis.com/v1beta/properties/{pid}:runReport', headers=H, timeout=30,
                          json={'dateRanges': [{'startDate': '7daysAgo', 'endDate': 'today'}], 'metrics': [{'name': 'activeUsers'}]})
        ok = 'Data API OK' if r.status_code == 200 else f'Data API 오류 {r.status_code} {r.text[:200]}'
        print(f"  속성 {pid} '{p.get('displayName')}' 측정ID {','.join(mids) or '-'} {','.join(uris)} → {site} / {ok}")
        if site != '-':
            found[site] = pid
print('\n연결된 사이트', len(found), '/', len(SITES), ':', ', '.join(sorted(found)))
missing = sorted(set(SITES.values()) - set(found))
if missing:
    print('못 찾은 사이트:', ', '.join(missing))
