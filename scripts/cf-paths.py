"""사이트(하위 도메인)별로 어떤 주소·어떤 로봇이 요청을 많이 보내는지 — Cloudflare 영역 분석(GraphQL, 읽기만).

11/16 사용자: Workers CPU 상위 사이트(시장·정비소·약국·휴식·여행·동물병원)의 요청이 어디서 오는지 확인.
지난 HOURS시간 요청을 주소 첫 칸(/store, /center, /api …)별·User-Agent 묶음별로 세어 reports/cf/paths-YYYY-MM-DD.md.
"""
import json, os, re, sys, urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

TOKEN = os.environ.get('CLOUDFLARE_API_TOKEN')
HOURS = int(os.environ.get('HOURS') or 24)
HOSTS = (os.environ.get('HOSTS') or 'market,service,pharmacy,rest,trip,pet').split(',')
OUT = Path(__file__).resolve().parents[1] / 'reports/cf'
API = 'https://api.cloudflare.com/client/v4'


def call(url, body=None):
    req = urllib.request.Request(url, method='POST' if body else 'GET', data=json.dumps(body).encode() if body else None,
                                 headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


Q = """query($z:String!,$a:Time!,$b:Time!,$h:String!){viewer{zones(filter:{zoneTag:$z}){
 paths: httpRequestsAdaptiveGroups(limit:10000,filter:{datetime_geq:$a,datetime_lt:$b,clientRequestHTTPHost:$h},orderBy:[count_DESC]){count dimensions{clientRequestPath}}
 agents: httpRequestsAdaptiveGroups(limit:200,filter:{datetime_geq:$a,datetime_lt:$b,clientRequestHTTPHost:$h},orderBy:[count_DESC]){count dimensions{userAgent}}}}}"""

BOTS = [('Googlebot', r'Googlebot|Google-InspectionTool|AdsBot-Google|Mediapartners-Google|Storebot-Google'),
        ('Bingbot', r'bingbot|BingPreview'), ('네이버(Yeti)', r'Yeti|Naver'), ('다음(Daumoa)', r'Daum'),
        ('GPTBot·OAI', r'GPTBot|OAI-SearchBot|ChatGPT'), ('ClaudeBot', r'Claude|anthropic'), ('Perplexity', r'Perplexity'),
        ('Applebot', r'Applebot'), ('Meta', r'meta-external|facebookexternalhit|FacebookBot'), ('Bytespider·TikTok', r'Bytespider|TikTok'),
        ('Amazonbot', r'Amazonbot'), ('Ahrefs·Semrush·MJ12 등 SEO', r'AhrefsBot|SemrushBot|MJ12bot|DotBot|BLEXBot|DataForSeo|serpstat|Barkrowler'),
        ('Yandex·Baidu·Petal', r'YandexBot|Baiduspider|PetalBot|Sogou'), ('기타 bot·crawler·spider', r'bot|crawl|spider|slurp|python|curl|wget|Go-http|okhttp|axios|node-fetch|headless'),
        ('사람 브라우저(추정)', r'.')]


def bot_of(ua):
    for name, pat in BOTS:
        if re.search(pat, ua or '', re.I):
            return name
    return '알 수 없음(빈 값)'


def main():
    if not TOKEN:
        sys.exit('CLOUDFLARE_API_TOKEN 없음')
    z = call(f'{API}/zones?name=guidejung.com')
    if not z.get('success') or not z.get('result'):
        sys.exit(f'영역 조회 실패: {z.get("errors")}')
    zone = z['result'][0]['id']
    end = datetime.now(timezone.utc).replace(second=0, microsecond=0); start = end - timedelta(hours=HOURS)
    lines = [f'# 사이트별 요청 주소·로봇 ({start:%Y-%m-%d %H:%M}~{end:%H:%M} UTC, {HOURS}시간)', '']
    for host in HOSTS:
        h = f'{host}.guidejung.com'
        r = call(f'{API}/graphql', {'query': Q, 'variables': {'z': zone, 'a': start.isoformat().replace('+00:00', 'Z'),
                                                             'b': end.isoformat().replace('+00:00', 'Z'), 'h': h}})
        if r.get('errors'):
            lines += [f'## {h}', '', f'- 오류: {"; ".join(e.get("message", "") for e in r["errors"])}', '']
            continue
        zz = r['data']['viewer']['zones'][0]
        seg = Counter(); total = 0
        for row in zz['paths']:
            p = row['dimensions']['clientRequestPath'] or '/'
            parts = [x for x in p.split('/') if x]
            key = '/' if not parts else ('/' + parts[0] + ('/…' if len(parts) > 1 else '')) if not '.' in parts[-1] or len(parts) > 1 else '/' + parts[0]
            seg[key] += row['count']; total += row['count']
        bots = Counter()
        for row in zz['agents']:
            bots[bot_of(row['dimensions']['userAgent'])] += row['count']
        top_agents = sorted(zz['agents'], key=lambda x: -x['count'])[:8]
        lines += [f'## {h} — 요청 {total:,}건', '', '| 주소 묶음 | 요청 | 비중 |', '|---|--:|--:|']
        lines += [f'| `{k}` | {v:,} | {v / total * 100 if total else 0:.1f}% |' for k, v in seg.most_common(12)]
        bt = sum(bots.values())
        lines += ['', '| 누가(User-Agent 묶음, 상위 200종 기준) | 요청 | 비중 |', '|---|--:|--:|']
        lines += [f'| {k} | {v:,} | {v / bt * 100 if bt else 0:.1f}% |' for k, v in bots.most_common()]
        lines += ['', '상위 User-Agent 8개:', *[f'- {a["count"]:,} · `{(a["dimensions"]["userAgent"] or "")[:140]}`' for a in top_agents], '']
    text = '\n'.join(lines) + '\n'
    print(text)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f'paths-{end.date()}.md').write_text(text, encoding='utf-8')


if __name__ == '__main__':
    main()
