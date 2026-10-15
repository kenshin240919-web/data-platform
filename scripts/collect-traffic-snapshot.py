"""Build apps/traffic/data/snapshot.json: highway routes (구간 순서) and rest areas from the 한국도로공사 Open API.

Daily in GitHub Actions (.github/workflows/traffic-snapshot.yml). Pages are built from it; live speeds come from the
Worker (/api/traffic). The API's firewall rejects requests without a browser-like User-Agent.

Usage: EX_API_KEY=... python scripts/collect-traffic-snapshot.py [--cache DIR]
"""
import json, math, os, re, sys, time, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://data.ex.co.kr/openapi/'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'


def get(key, path, params, cache):
    name = path.replace('/', '_') + '_' + '_'.join(f'{k}{v}' for k, v in params.items()) + '.json'
    if cache and (cache / name).exists():
        return json.loads((cache / name).read_text(encoding='utf-8'))
    url = BASE + path + '?' + urllib.parse.urlencode({**params, 'key': key, 'type': 'json'})
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=120) as res:
                body = json.loads(res.read().decode('utf-8'))
            if cache:
                (cache / name).write_text(json.dumps(body, ensure_ascii=False), encoding='utf-8')
            return body
        except Exception as e:
            print(f'  {path} attempt {attempt + 1}: {e}', file=sys.stderr)
            time.sleep(4 * (attempt + 1))
    raise RuntimeError(f'{path} failed')


def get_all(key, path, cache, list_key='list', rows=99):
    first = get(key, path, {'numOfRows': rows, 'pageNo': 1}, cache)
    items = list(first.get(list_key) or [])
    pages = int(first.get('pageSize') or 1)
    for page in range(2, pages + 1):
        items += get(key, path, {'numOfRows': rows, 'pageNo': page}, cache).get(list_key) or []
    print(f'{path}: {len(items)} (count {first.get("count")})')
    return items


def price(v, low=1000):
    # Drop obvious source errors (e.g. "184원" seen 10/15) so rankings stay meaningful.
    n = int(''.join(c for c in (v or '') if c.isdigit()) or 0)
    return v if low <= n <= 3500 else ''


def norm(name):
    # "판교IC", "판교JC", "판교(영)" → "판교" so IC·영업소 lists match the 구간 node names.
    n = re.sub(r'\(.*?\)', '', (name or '').strip())
    return re.sub(r'(하이패스IC|하이패스|분기점|요금소|나들목|휴게소|JCT|JC|IC|TG|Hi|HI)$', '', n).strip()


def route_nodes(rt):
    # Same order as the page's 노선도: E 구간 "A-B" chain, or S reversed when a route has only S.
    if rt['E']:
        return [rt['E'][0][1].split('-')[0]] + [n.split('-')[-1] for _, n in rt['E']]
    seq = [n.split('-') for _, n in reversed(rt['S'])]
    return [seq[0][-1]] + [p[0] for p in seq] if seq else []


def place_nodes(route_list, ics, units):
    by_route, anywhere = {}, {}
    for x in ics:
        try: pt = (float(x['yValue']), float(x['xValue']))
        except (TypeError, ValueError): continue
        by_route.setdefault(x['routeNo'], {}).setdefault(norm(x['icName']), pt); anywhere.setdefault(norm(x['icName']), pt)
    for x in units:
        try: anywhere.setdefault(norm(x['unitName']), (float(x['yValue']), float(x['xValue'])))
        except (TypeError, ValueError): continue
    found = total = 0
    for rt in route_list:
        names = route_nodes(rt)
        pts = [by_route.get(rt['no'], {}).get(norm(n)) or anywhere.get(norm(n)) for n in names]
        # Same name elsewhere in the country (e.g. 서울TG) → drop points far from both known neighbours.
        known = [i for i, p in enumerate(pts) if p]
        far = [i for k, i in enumerate(known)
               if (nb := [pts[known[j]] for j in (k - 1, k + 1) if 0 <= j < len(known)]) and all(math.dist(pts[i], q) > 0.8 for q in nb)]
        for i in far:
            pts[i] = None
        known = [i for i, p in enumerate(pts) if p]
        found += len(known); total += len(pts)
        if not known:
            continue
        for i in range(len(pts)):  # straight-line guess between the nearest known nodes
            if pts[i]: continue
            a = max((j for j in known if j < i), default=None); b = min((j for j in known if j > i), default=None)
            if a is None: pts[i] = pts[b]
            elif b is None: pts[i] = pts[a]
            else:
                t = (i - a) / (b - a); pts[i] = (pts[a][0] + (pts[b][0] - pts[a][0]) * t, pts[a][1] + (pts[b][1] - pts[a][1]) * t)
        rt['pts'] = [[round(p[0], 4), round(p[1], 4)] for p in pts]
    print(f'node coordinates: {found}/{total} matched, rest interpolated')


def nearest_region(regions, lat, lng):
    best = min(regions, key=lambda r: (r['lat'] - lat) ** 2 + ((r['lon'] - lng) * math.cos(math.radians(lat))) ** 2)
    return best


def main():
    key = os.environ.get('EX_API_KEY')
    if not key:
        sys.exit('EX_API_KEY is not set')
    cache = None
    if '--cache' in sys.argv:
        cache = Path(sys.argv[sys.argv.index('--cache') + 1]); cache.mkdir(parents=True, exist_ok=True)

    # Route structure: every 콘존(구간) seen in the live feed, in ID order (= distance order from the route's start).
    live = get(key, 'odtraffic/trafficAmountByRealtime', {}, cache).get('list') or []
    # The live feed sometimes leaves the 구간 fields empty (seen 10/15 08:03); keep the last good structure then.
    dest_dir = ROOT / 'apps/traffic/data'
    if sum(1 for r in live if r.get('conzoneId')) < len(live) * 0.9:
        old = dest_dir / 'snapshot.json'
        if not old.exists() or not (dest_dir / 'vds.json').exists():
            sys.exit('live feed has no 구간 fields and there is no previous snapshot')
        print('live feed lacks 구간 fields; keeping previous routes and detector map')
        route_list = json.loads(old.read_text(encoding='utf-8'))['routes']; vds = None
    else:
        vds = {r['vdsId']: r['conzoneId'] for r in live if r.get('vdsId')}
        routes = {}
        for r in live:
            rt = routes.setdefault(r['routeNo'], {'no': r['routeNo'], 'name': r['routeName'], 'E': {}, 'S': {}})
            rt[r['updownTypeCode']][r['conzoneId']] = r['conzoneName']
        route_list = []
        for rt in sorted(routes.values(), key=lambda x: x['no']):
            e = sorted(rt['E'].items()); s = sorted(rt['S'].items())
            seq = e or s
            if not seq:
                continue
            start = seq[0][1].split('-')[0]; end = seq[-1][1].split('-')[-1]
            route_list.append({'no': rt['no'], 'name': rt['name'], 'start': start, 'end': end,
                               'E': [[k, v] for k, v in e], 'S': [[k, v] for k, v in s]})
    if len(route_list) < 30:
        sys.exit(f'only {len(route_list)} routes; not writing')

    ics = get(key, 'locationinfo/locationinfoIc', {'numOfRows': 999, 'pageNo': 1}, cache).get('list') or []
    units = get_all(key, 'locationinfo/locationinfoUnit', cache)
    place_nodes(route_list, ics, units)

    loc = get_all(key, 'locationinfo/locationinfoRest', cache)
    foods = get_all(key, 'restinfo/restBestfoodList', cache)
    conv = get_all(key, 'restinfo/restConvList', cache)
    brands = get_all(key, 'business/serviceAreaRoute', cache)
    gas = get_all(key, 'business/curStateStation', cache)

    regions = json.loads((ROOT / 'apps/weather/data/regions.json').read_text(encoding='utf-8'))
    by_food, by_conv = {}, {}
    for f in foods:
        if f.get('foodNm'):
            by_food.setdefault(f['stdRestCd'], []).append({'name': f['foodNm'].strip().lstrip('★☆*').strip(), 'cost': f.get('foodCost') or '', 'desc': (f.get('etc') or '').strip()[:120],
                                                            'best': 'Y' in (f.get('bestfoodyn'), f.get('recommendyn'), f.get('premiumyn'))})
    for c in conv:
        if c.get('psName'):
            by_conv.setdefault(c['stdRestCd'], []).append(c['psName'].strip())
    by_brand = {b['serviceAreaCode']: b for b in brands}
    by_gas = {}
    for g in gas:
        nm = (g.get('serviceAreaName') or '').replace('주유소', '휴게소')
        by_gas[nm] = {'gasoline': price(g.get('gasolinePrice')), 'diesel': price(g.get('diselPrice')), 'lpg': price(g.get('lpgPrice'), 500) if g.get('lpgYn') == 'Y' else '',
                      'company': g.get('oilCompany') or '', 'tel': g.get('telNo') or ''}

    rests = []
    for l in loc:
        try:
            lat, lng = float(l['yValue']), float(l['xValue'])
        except (TypeError, ValueError):
            continue
        b = by_brand.get(l.get('serviceAreaCode'), {})
        near = nearest_region(regions, lat, lng)
        wcode = near['code']
        rests.append({'code': l['stdRestCd'], 'name': l['unitName'].strip(), 'routeNo': l['routeNo'], 'route': l['routeName'],
                      'lat': round(lat, 6), 'lng': round(lng, 6), 'dir': b.get('direction') or '',
                      'brands': b.get('brand') or '', 'facilities': sorted(set((b.get('convenience') or '').split('|') + by_conv.get(l['stdRestCd'], [])) - {''}),
                      'foods': sorted(by_food.get(l['stdRestCd'], []), key=lambda f: not f['best'])[:10], 'gas': by_gas.get(l['unitName'].strip()),
                      'weather': wcode, 'charge': wcode if wcode[4] == '0' else wcode[:4] + '0', 'area': f"{near['sidoShort']} {near['name']}"})
    # Direction names people use ("서울 방향") from the rest areas' 방향: the city nearer the route's end is E.
    places = {}
    for r in regions:
        for key in (r['sidoShort'], r['name'].split()[0], re.sub(r'(시|군|구)$', '', r['name'].split()[0])):
            places.setdefault(key, (r['lat'], r['lon']))
    for rt in route_list:
        names = sorted({x['dir'] for x in rests if x['routeNo'] == rt['no'] and x['dir']})
        pts = rt.get('pts')
        if len(names) != 2 or not pts or not all(n in places for n in names):
            continue
        d = [(math.dist(places[n], pts[-1]) - math.dist(places[n], pts[0]), n) for n in names]
        (_, to_end), (_, to_start) = sorted(d)
        rt['dirs'] = {'E': to_end, 'S': to_start}

    if len(rests) < 150:
        sys.exit(f'only {len(rests)} rest areas; not writing')
    rests.sort(key=lambda r: (r['routeNo'], r['code']))

    now = datetime.now(timezone(timedelta(hours=9))).strftime('%Y%m%d%H%M')
    out = {'fetched': now, 'routes': route_list, 'rests': rests}
    dest = dest_dir / 'snapshot.json'
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    if vds:  # detector → 구간, used by the Worker because live rows may lack the 구간 ID
        (dest_dir / 'vds.json').write_text(json.dumps(dict(sorted(vds.items())), separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'routes {len(route_list)}, zones {sum(len(r["E"]) + len(r["S"]) for r in route_list)}, rests {len(rests)} '
          f'(foods {sum(1 for r in rests if r["foods"])}, gas {sum(1 for r in rests if r["gas"])}); wrote {dest.relative_to(ROOT)} ({dest.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()
