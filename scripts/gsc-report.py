"""Search Console 주간 점검(서비스 계정 ga-reader, 도메인 속성 sc-domain:guidejung.com '전체' 권한 — 10/26 사용자 추가).

1. 내근처 사이트(packages/ui/src/network.tsx SITES)마다 sitemap.xml·rss.xml이 속성에 없거나, 오류가 있는데 한 번도 못 읽었으면 제출(PUT).
2. 사이트맵 상태: 마지막 제출·마지막 읽음·대기·오류·경고·제출된 주소 수.
3. 색인 표본: 사이트마다 첫 화면 + 사이트맵에서 고른 4쪽을 URL 검사(주 약 70건, 하루 한도 2,000건) → 색인됨/안 됨·이유·마지막 수집일.
결과는 reports/gsc/주간-YYYY-MM-DD.md(공개 저장소). 클릭·노출 같은 검색 실적 숫자는 넣지 않는다. 우리 사이트 말고 다른 속성(WordPress 등)은 다루지 않는다.
Usage: GA_SERVICE_ACCOUNT_JSON=... python scripts/gsc-report.py [--no-submit]
"""
import json
import os
import re
import sys
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account

ROOT = Path(__file__).resolve().parent.parent
PROP = 'sc-domain:guidejung.com'
API = 'https://searchconsole.googleapis.com/webmasters/v3'
INSPECT = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'
KST = timezone(timedelta(hours=9))
UA = {'User-Agent': 'Mozilla/5.0 (compatible; GuideJungGSC/1.0; +https://near.guidejung.com)'}
VERDICT = {'PASS': '✅ 색인됨', 'NEUTRAL': '⏳ 아직', 'FAIL': '❌ 문제', 'PARTIAL': '⚠️ 일부'}


def hosts():
    net = (ROOT / 'packages/ui/src/network.tsx').read_text(encoding='utf-8')
    return [(k, h) for k, h in re.findall(r"^\s+(\w+):\{url:'https://(\w+\.guidejung\.com)'", net, re.M)]


def sample(host, n=4):
    """사이트맵(묶음이면 첫 하위 사이트맵)에서 고르게 n쪽."""
    try:
        body = requests.get(f'https://{host}/sitemap.xml', headers=UA, timeout=60).text
        if '<sitemapindex' in body:
            locs = re.findall(r'<loc>([^<]+)</loc>', body)
            pages = [l for l in locs if 'pages' in l] or locs[:1]
            body = requests.get(pages[0].strip(), headers=UA, timeout=60).text if pages else ''
        urls = [u.strip().replace('&amp;', '&') for u in re.findall(r'<loc>([^<]+)</loc>', body)]
        urls = [u for u in urls if u.rstrip('/') != f'https://{host}']
    except requests.RequestException:
        return []
    if len(urls) <= n:
        return urls
    return [urls[(i * (len(urls) - 1)) // (n - 1)] for i in range(n)]


def main():
    submit = '--no-submit' not in sys.argv
    info = json.loads(os.environ['GA_SERVICE_ACCOUNT_JSON'])
    cred = service_account.Credentials.from_service_account_info(info, scopes=['https://www.googleapis.com/auth/webmasters'])
    cred.refresh(Request())
    H = {'Authorization': f'Bearer {cred.token}'}
    site = urllib.parse.quote(PROP, safe='')
    now = datetime.now(KST)
    lines = [f'# Google 색인 점검 {now:%Y-%m-%d}', '',
             f'Search Console 도메인 속성 `{PROP}` 기준(서비스 계정 읽기 + 사이트맵 제출). 검색 실적(클릭·노출) 숫자는 넣지 않습니다.', '']

    def sitemaps():
        r = requests.get(f'{API}/sites/{site}/sitemaps', headers=H, timeout=60)
        r.raise_for_status()
        return {x['path']: x for x in r.json().get('sitemap', [])}

    have = sitemaps()
    sites = hosts()
    done = []
    for key, host in sites:
        for feed in (f'https://{host}/sitemap.xml', f'https://{host}/rss.xml'):
            x = have.get(feed)
            broken = x and int(x.get('errors') or 0) > 0 and not x.get('lastDownloaded')
            if x and not broken:
                continue
            if not submit:
                done.append((feed, '제출 필요(이번엔 시험만)'))
                continue
            r = requests.put(f"{API}/sites/{site}/sitemaps/{urllib.parse.quote(feed, safe='')}", headers=H, timeout=60)
            done.append((feed, '제출함' if r.status_code in (200, 204) else f'실패 {r.status_code} {r.text[:150]}'))
            print('제출', feed, r.status_code)
    if done:
        lines += ['## 이번에 제출한 사이트맵', '', '| 주소 | 결과 |', '|---|---|'] + [f'| {f} | {s} |' for f, s in done] + ['']
        have = sitemaps()

    lines += ['## 사이트맵 상태', '', '| 사이트 | 파일 | 마지막 제출 | 마지막 읽음 | 상태 | 제출된 주소 |', '|---|---|---|---|---|---|']
    for key, host in sites:
        for name in ('sitemap.xml', 'rss.xml'):
            x = have.get(f'https://{host}/{name}')
            if not x:
                lines.append(f'| {key} | {name} | - | - | 없음 | - |')
                continue
            subs = sum(int(c.get('submitted') or 0) for c in x.get('contents', []))
            st = '대기' if x.get('isPending') else f"오류 {x.get('errors', 0)}·경고 {x.get('warnings', 0)}" if (int(x.get('errors') or 0) or int(x.get('warnings') or 0)) else '정상'
            lines.append(f"| {key} | {name}{' (묶음)' if x.get('isSitemapsIndex') else ''} | {str(x.get('lastSubmitted', '-'))[:10]} | {str(x.get('lastDownloaded', '-'))[:10]} | {st} | {subs:,} |")
    lines += ['', '※ 묶음(사이트맵 색인) 파일은 구글이 하위 파일을 다 읽기 전까지 제출된 주소가 0으로 보일 수 있습니다.', '']

    lines += ['## 색인 표본(첫 화면 + 사이트맵에서 고른 4쪽)', '', '| 사이트 | 색인 | 페이지 | 구글 설명 | 마지막 수집 |', '|---|---|---|---|---|']
    tally = {}
    for key, host in sites:
        for url in [f'https://{host}/'] + sample(host):
            r = requests.post(INSPECT, headers=H, timeout=60, json={'inspectionUrl': url, 'siteUrl': PROP, 'languageCode': 'ko-KR'})
            if not r.ok:
                lines.append(f'| {key} | 확인 실패 {r.status_code} | {url} | {r.text[:80]} | - |')
                continue
            ix = r.json().get('inspectionResult', {}).get('indexStatusResult', {})
            v = ix.get('verdict', '')
            t = tally.setdefault(key, [0, 0])
            t[0] += v == 'PASS'
            t[1] += 1
            lines.append(f"| {key} | {VERDICT.get(v, v or '-')} | {url} | {ix.get('coverageState', '-')} | {str(ix.get('lastCrawlTime', '-'))[:10]} |")
    lines += ['', '## 사이트별 요약', '', '| 사이트 | 표본 중 색인됨 |', '|---|---|'] + [f'| {k} | {p}/{n} |' for k, (p, n) in tally.items()] + ['']
    out = ROOT / f'reports/gsc/주간-{now:%Y-%m-%d}.md'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print('저장', out.relative_to(ROOT), '· 제출', len(done), '· 표본', sum(n for _, n in tally.values()), '· 색인됨', sum(p for p, _ in tally.values()))


if __name__ == '__main__':
    main()
