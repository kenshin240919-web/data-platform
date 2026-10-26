"""IndexNow: tell Bing·Naver·Yandex·Seznam (api.indexnow.org shares with every participant) which pages of the 13 내근처
sites are new, removed or recently changed — no account or ownership verification needed, only the key file
https://{host}/{KEY}.txt that every app ships in public/ (10/26 사용자 승인).

Each run reads every site's live sitemap (index → child sitemaps) and compares it with the previous run
(runtime/indexnow/state.json, kept in the Actions cache):
- first time for a host: every URL is queued once
- later: new URLs and URLs that left the sitemap (closed places → 404, so engines drop them), plus trip's rss.xml items
  changed since the last run
At most LIMIT URLs per host per run (one POST); the rest stay queued for the next day. A sitemap that shrank by more
than 30% is treated as broken and skipped. Runs daily in GitHub Actions (.github/workflows/indexnow.yml).
Usage: python scripts/indexnow.py [--dry]
"""
import json, re, sys, time, urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KEY = '399bbd96ca585339cc43eb479173e907'  # 공개용 키(각 사이트 public/{KEY}.txt). 바꾸면 13개 파일도 함께 바꿀 것.
ENDPOINT = 'https://api.indexnow.org/indexnow'
STATE = ROOT / 'runtime/indexnow/state.json'
LIMIT = 10000  # IndexNow 한 번에 최대 10,000개
UA = 'Mozilla/5.0 (compatible; GuideJungIndexNow/1.0; +https://near.guidejung.com)'


def hosts():
    net = (ROOT / 'packages/ui/src/network.tsx').read_text(encoding='utf-8')
    return sorted(set(re.findall(r"url:'https://(\w+\.guidejung\.com)'", net)))


def get(url, timeout=60):
    for n in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.read().decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            return e.code, ''
        except Exception as e:  # 통신 끊김은 다시 시도
            err = e
            time.sleep(5 * (n + 1))
    print(f'  {url}: {err}')
    return 0, ''


def sitemap_urls(host):
    """Every <loc> of the sitemap tree; None when the tree could not be read completely."""
    out, todo, seen = [], [f'https://{host}/sitemap.xml'], set()
    while todo:
        url = todo.pop(0)
        if url in seen:
            continue
        seen.add(url)
        st, body = get(url)
        if st != 200 or '<loc>' not in body:
            print(f'  {url}: {st} — 이 사이트는 이번에 건너뜀')
            return None
        locs = [x.strip().replace('&amp;', '&') for x in re.findall(r'<loc>([^<]+)</loc>', body)]
        if '<sitemapindex' in body:
            todo += locs
        else:
            out += locs
    return list(dict.fromkeys(u for u in out if u.startswith(f'https://{host}/')))


def rss_changed(host, since):
    st, body = get(f'https://{host}/rss.xml')
    if st != 200 or not since:
        return []
    out = []
    for item in re.findall(r'<item>(.*?)</item>', body, re.S):
        link, date = re.search(r'<link>([^<]+)</link>', item), re.search(r'<pubDate>([^<]+)</pubDate>', item)
        try:
            if link and date and parsedate_to_datetime(date.group(1)) > since:
                out.append(link.group(1).strip())
        except (TypeError, ValueError):
            pass
    return out


def submit(host, urls, dry):
    body = json.dumps({'host': host, 'key': KEY, 'keyLocation': f'https://{host}/{KEY}.txt', 'urlList': urls}).encode()
    if dry:
        print(f'  (시험) {len(urls):,}개 보낼 예정')
        return True
    req = urllib.request.Request(ENDPOINT, data=body, method='POST', headers={'Content-Type': 'application/json; charset=utf-8', 'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            st = r.status
    except urllib.error.HTTPError as e:
        st = e.code
    except Exception as e:
        print(f'  보내기 실패: {e}')
        return False
    # 200 받음 · 202 받음(키 확인 대기) · 400 형식 · 403 키 안 맞음 · 422 다른 주소 섞임 · 429 너무 많음
    print(f'  IndexNow 응답 {st} ({len(urls):,}개)')
    return st in (200, 202)


def main():
    dry = '--dry' in sys.argv
    state = json.loads(STATE.read_text(encoding='utf-8')) if STATE.exists() else {}
    now = datetime.now(timezone.utc)
    total = 0
    for host in hosts():
        print(f'[{host}]')
        st, key = get(f'https://{host}/{KEY}.txt', timeout=30)
        if st != 200 or key.strip() != KEY:
            print(f'  키 파일이 아직 없음({st}) — 배포 뒤 다음 실행에 보냄')
            continue
        urls = sitemap_urls(host)
        if not urls:
            continue
        s = state.setdefault(host, {})
        prev = set(s.get('urls') or [])
        pending = s.get('pending') or []
        last = datetime.fromisoformat(s['last']) if s.get('last') else None
        if not prev:
            add, removed = urls, []
        else:
            cur = set(urls)
            removed = [u for u in prev if u not in cur]
            if len(removed) > len(prev) * 0.3:
                print(f'  사이트맵이 {len(prev):,} → {len(urls):,}로 30% 넘게 줄어 이상하다고 보고 건너뜀')
                continue
            add = [u for u in urls if u not in prev] + removed
        add += rss_changed(host, last) if host.startswith('trip.') else []
        pending = list(dict.fromkeys(pending + add))
        print(f'  사이트맵 {len(urls):,} · 새로 {len(add) - len(removed):,} · 빠짐 {len(removed):,} · 보낼 것 {len(pending):,}')
        batch = pending[:LIMIT]
        if batch and submit(host, batch, dry):
            pending = pending[LIMIT:]
            total += len(batch)
        s.update({'urls': urls, 'pending': pending, 'last': now.isoformat(timespec='seconds')})
    if not dry:
        STATE.parent.mkdir(parents=True, exist_ok=True)
        STATE.write_text(json.dumps(state, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'이번에 알린 주소 {total:,}개 · 남은 대기 {sum(len(v.get("pending") or []) for v in state.values()):,}개')


if __name__ == '__main__':
    main()
