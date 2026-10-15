"""Build apps/charge/data/snapshot.json: daily static snapshot of every EV charging station (한국환경공단 getChargerInfo).

The region pages are built from it, so search engines and first-time visitors see each district's station list and
counts in the HTML right away; live charger status is still loaded by the browser from the Worker (/api/stations).
Runs once a day in GitHub Actions (.github/workflows/charge-snapshot.yml) — about 55 calls of the 1,000/day limit.

Usage: DATA_GO_KR_KEY=... python scripts/collect-charge-snapshot.py [--cache DIR]
  --cache DIR  keep raw API pages in DIR and reuse them (development only; DIR must be outside the repo).
"""
import json, os, sys, time, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = 'https://apis.data.go.kr/B552584/EvCharger/getChargerInfo'
ROWS = 9999
TOP = 30  # stations per district kept in the HTML (most chargers first)
SLOW_TYPES = {'02', '08'}


def fetch_page(key, page, cache):
    path = cache / f'page-{page}.json' if cache else None
    if path and path.exists():
        return json.loads(path.read_text(encoding='utf-8'))
    q = urllib.parse.urlencode({'pageNo': page, 'numOfRows': ROWS, 'dataType': 'JSON'})
    url = f'{API}?serviceKey={key}&{q}'  # the key is already URL-encoded as issued
    for attempt in range(5):
        try:
            with urllib.request.urlopen(url, timeout=180) as res:
                body = json.loads(res.read().decode('utf-8'))
            if body.get('resultCode', '00') != '00' or 'items' not in body:
                raise RuntimeError(f"upstream {body.get('resultCode')} {body.get('resultMsg')}")
            if path:
                path.write_text(json.dumps(body, ensure_ascii=False), encoding='utf-8')
            return body
        except Exception as e:  # connection resets happen; back off and retry
            print(f'  page {page} attempt {attempt + 1} failed: {e}', file=sys.stderr)
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f'page {page} failed')


def region_codes():
    # Same folding as apps/charge/lib/regions.ts: only 일반구 of a city ("수원시 장안구" 41111) use the city code.
    data = json.loads((ROOT / 'apps/weather/data/regions.json').read_text(encoding='utf-8'))
    return {r['code'][:4] + '0' if ' ' in r['name'] else r['code'] for r in data}


def fold(code):
    return code if not code or code[4:5] == '0' else code[:4] + '0'


def is_fast(row):
    try:
        return float(row.get('output') or '') >= 30
    except ValueError:
        return row.get('chgerType') not in SLOW_TYPES


def main():
    key = os.environ.get('DATA_GO_KR_KEY')
    if not key:
        sys.exit('DATA_GO_KR_KEY is not set')
    cache = None
    if '--cache' in sys.argv:
        cache = Path(sys.argv[sys.argv.index('--cache') + 1]); cache.mkdir(parents=True, exist_ok=True)

    first = fetch_page(key, 1, cache)
    total = int(first.get('totalCount') or 0)
    pages = -(-total // ROWS)
    print(f'totalCount {total}, {pages} pages')
    rows = list(first['items'].get('item') or [])
    for page in range(2, pages + 1):
        print(f'page {page}/{pages}')
        rows += fetch_page(key, page, cache)['items'].get('item') or []

    codes = region_codes()
    seen, stations, unknown = set(), {}, {}
    for r in rows:
        if r.get('delYn') == 'Y' or (r.get('statId'), r.get('chgerId')) in seen:
            continue
        seen.add((r.get('statId'), r.get('chgerId')))
        code = r.get('zscode') or ''
        if code not in codes:
            code = fold(code)
        if code not in codes:
            unknown[code] = unknown.get(code, 0) + 1
            continue
        s = stations.get(r['statId'])
        if not s:
            try:
                lat, lng = round(float(r['lat']), 6), round(float(r['lng']), 6)
            except (TypeError, ValueError):
                continue
            s = stations[r['statId']] = {'code': code, 'id': r['statId'], 'name': (r.get('statNm') or '').strip(),
                'addr': ' '.join(x for x in [r.get('addr'), r.get('addrDetail')] if x).strip(), 'lat': lat, 'lng': lng,
                'useTime': r.get('useTime') or '', 'busi': r.get('busiNm') or '', 'freeParking': r.get('parkingFree') == 'Y',
                'limited': r.get('limitYn') == 'Y', 'fast': 0, 'slow': 0, 'maxKw': 0}
        if is_fast(r): s['fast'] += 1
        else: s['slow'] += 1
        try: s['maxKw'] = max(s['maxKw'], int(float(r.get('output') or 0)))
        except ValueError: pass

    regions = {}
    for s in stations.values():
        g = regions.setdefault(s.pop('code'), {'stations': 0, 'chargers': 0, 'fast': 0, 'freeParking': 0, 'h24': 0, 'list': []})
        g['stations'] += 1; g['chargers'] += s['fast'] + s['slow']; g['fast'] += s['fast']
        g['freeParking'] += s['freeParking']; g['h24'] += '24' in s['useTime']
        g['list'].append(s)
    for g in regions.values():
        g['list'].sort(key=lambda s: (-s['fast'], -(s['fast'] + s['slow']), s['name']))
        g['list'] = g['list'][:TOP]

    kept = sum(g['chargers'] for g in regions.values())
    print(f'rows {len(rows)}, unique {len(seen)}, kept {kept} chargers in {len(regions)} districts; unknown zscode {unknown}')
    if len(seen) < total * 0.9 or kept < len(seen) * 0.97:
        sys.exit('snapshot looks incomplete; not writing')  # never replace a good snapshot with a broken one
    now = datetime.now(timezone(timedelta(hours=9))).strftime('%Y%m%d%H%M')
    out = {'fetched': now, 'chargers': kept, 'stations': sum(g['stations'] for g in regions.values()),
           'regions': dict(sorted(regions.items()))}
    dest = ROOT / 'apps/charge/data/snapshot.json'
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'wrote {dest.relative_to(ROOT)} ({dest.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()
