"""Search Console 연결 시험(읽기만): 서비스 계정이 볼 수 있는 속성·권한, 속성별 제출된 사이트맵 상태, URL 검사 1건.
공개 저장소의 Actions 로그에 남으므로 클릭·노출 같은 검색 실적 숫자는 출력하지 않는다(사이트맵 처리 상태·색인 여부만)."""
import json
import os
import sys
import urllib.parse

import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']
API = 'https://searchconsole.googleapis.com/webmasters/v3'

raw = os.environ.get('GA_SERVICE_ACCOUNT_JSON', '')
if not raw.strip():
    sys.exit('GA_SERVICE_ACCOUNT_JSON 비어 있음')
info = json.loads(raw)
print('서비스 계정:', info.get('client_email'))
cred = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
cred.refresh(Request())
H = {'Authorization': f'Bearer {cred.token}'}

r = requests.get(f'{API}/sites', headers=H, timeout=30)
print('속성 목록:', r.status_code, '' if r.ok else r.text[:400])
sites = r.json().get('siteEntry', []) if r.ok else []
for s in sites:
    print(f"  {s['siteUrl']} · 권한 {s['permissionLevel']}")
for s in sites:
    u = s['siteUrl']
    m = requests.get(f"{API}/sites/{urllib.parse.quote(u, safe='')}/sitemaps", headers=H, timeout=30)
    print(f'\n[{u}] 사이트맵 {m.status_code}', '' if m.ok else m.text[:300])
    for x in (m.json().get('sitemap', []) if m.ok else []):
        subs = sum(int(c.get('submitted') or 0) for c in x.get('contents', []))
        print(f"  {x.get('path')} · 마지막 제출 {str(x.get('lastSubmitted', '-'))[:10]} · 마지막 읽음 {str(x.get('lastDownloaded', '-'))[:10]}"
              f" · 대기 {x.get('isPending')} · 묶음 {x.get('isSitemapsIndex')} · 오류 {x.get('errors', 0)} · 경고 {x.get('warnings', 0)} · 제출된 주소 {subs:,}")
if sites:  # URL 검사 1건(색인 여부만)
    prop = next((s['siteUrl'] for s in sites if s['siteUrl'].startswith('sc-domain:')), sites[0]['siteUrl'])
    for page in ('https://trip.guidejung.com/', 'https://pet.guidejung.com/'):
        q = requests.post('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', headers=H, timeout=60,
                          json={'inspectionUrl': page, 'siteUrl': prop, 'languageCode': 'ko-KR'})
        if q.ok:
            ix = q.json().get('inspectionResult', {}).get('indexStatusResult', {})
            print(f"\nURL 검사 {page}: {ix.get('verdict')} · {ix.get('coverageState')} · 마지막 수집 {str(ix.get('lastCrawlTime', '-'))[:10]}")
        else:
            print(f'\nURL 검사 {page}: {q.status_code} {q.text[:300]}')
