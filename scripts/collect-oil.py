"""Collect fuel prices for oil.guidejung.com (내근처 주유소) from 오피넷 무료 API (한국석유공사).

The free key allows only 300 calls a day, so this runs once a day (GitHub Actions oil-collect.yml) and the site and
Worker only read the file it writes: apps/oil/data/oil.json.
Calls (about 270): 전국 평균·최근 7일·시도 평균 (5) → 시도별 시군구 평균 휘발유 (17) → 시군구별 휘발유 최저가 20곳
(about 230) → 시도별 경유 최저가 20곳 (17) → 시도별 시군구 평균 경유 (17, only while the budget lasts).
Area codes (apps/oil/data/areas.json) are fetched only when missing or on the 1st of the month (18 calls).
Coordinates come as KATEC (Bessel TM) and are converted to WGS84 here.
Usage: OPINET_API_KEY=... python scripts/collect-oil.py [--budget 280]
"""
import json, math, os, sys, time, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'apps/oil/data'
OUT, AREAS = DATA / 'oil.json', DATA / 'areas.json'
BASE = 'https://www.opinet.co.kr/api/'
KST = timezone(timedelta(hours=9))
PRODUCTS = {'B027': '휘발유', 'D047': '경유', 'B034': '고급휘발유', 'K015': 'LPG', 'C004': '실내등유'}
BRANDS = {'SKE': 'SK에너지', 'GSC': 'GS칼텍스', 'HDO': 'HD현대오일뱅크', 'SOL': 'S-OIL', 'RTO': '알뜰주유소', 'RTE': '알뜰주유소', 'RTX': '고속도로 알뜰',
          'NHO': '농협알뜰', 'ETC': '자가상표', 'E1G': 'E1', 'SKG': 'SK가스'}


def log(*a):
    print(datetime.now(KST).strftime('%H:%M:%S'), *a, flush=True)


class Api:
    def __init__(self, key, budget):
        self.key, self.budget, self.calls = key, budget, 0

    def left(self):
        return self.budget - self.calls

    def __call__(self, name, **q):
        """One call (no retry on success; one retry on a network error — every attempt counts against the daily 300)."""
        if self.calls >= self.budget:
            raise RuntimeError('budget')
        qs = urllib.parse.urlencode({'code': self.key, 'out': 'json', **q})
        for n in range(2):
            self.calls += 1
            try:
                req = urllib.request.Request(f'{BASE}{name}?{qs}', headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=60) as r:
                    return json.loads(r.read().decode('utf-8', 'replace')).get('RESULT', {}).get('OIL', []) or []
            except Exception as e:
                log(f'  {name} {q} 오류 {e}')
                if n or self.calls >= self.budget:
                    return None
                time.sleep(5)


def katec_to_wgs84(x, y):
    """KATEC (Bessel 1841, TM lat0 38 lon0 128 k0 0.9999, FE 400000 FN 600000) → WGS84 (3-parameter shift)."""
    a, f = 6377397.155, 1 / 299.1528128
    e2 = 2 * f - f * f
    k0, lat0, lon0, fe, fn = 0.9999, math.radians(38), math.radians(128), 400000.0, 600000.0
    def meridian(phi):
        return a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * phi - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * math.sin(2 * phi)
                    + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * math.sin(4 * phi) - (35 * e2 ** 3 / 3072) * math.sin(6 * phi))
    m = meridian(lat0) + (y - fn) / k0
    mu = m / (a * (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256))
    e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))
    phi1 = (mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * math.sin(2 * mu) + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * math.sin(4 * mu)
            + (151 * e1 ** 3 / 96) * math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * math.sin(8 * mu))
    ep2 = e2 / (1 - e2)
    c1, t1 = ep2 * math.cos(phi1) ** 2, math.tan(phi1) ** 2
    n1 = a / math.sqrt(1 - e2 * math.sin(phi1) ** 2)
    r1 = a * (1 - e2) / (1 - e2 * math.sin(phi1) ** 2) ** 1.5
    d = (x - fe) / (n1 * k0)
    lat = phi1 - (n1 * math.tan(phi1) / r1) * (d ** 2 / 2 - (5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * ep2) * d ** 4 / 24
                                               + (61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * ep2 - 3 * c1 ** 2) * d ** 6 / 720)
    lon = lon0 + (d - (1 + 2 * t1 + c1) * d ** 3 / 6 + (5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * ep2 + 24 * t1 ** 2) * d ** 5 / 120) / math.cos(phi1)
    # Bessel geodetic → geocentric → +shift → WGS84 geodetic
    nn = a / math.sqrt(1 - e2 * math.sin(lat) ** 2)
    X, Y, Z = nn * math.cos(lat) * math.cos(lon), nn * math.cos(lat) * math.sin(lon), nn * (1 - e2) * math.sin(lat)
    X, Y, Z = X - 146.43, Y + 507.89, Z + 681.46
    A, F = 6378137.0, 1 / 298.257223563
    E2 = 2 * F - F * F
    p = math.hypot(X, Y)
    la = math.atan2(Z, p * (1 - E2))
    for _ in range(6):
        N = A / math.sqrt(1 - E2 * math.sin(la) ** 2)
        la = math.atan2(Z + E2 * N * math.sin(la), p)
    return round(math.degrees(la), 6), round(math.degrees(math.atan2(Y, X)), 6)


def load(path, default):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default


def areas(api, now):
    cur = load(AREAS, None)
    if cur and now.day != 1:  # 지역 코드는 매달 1일에만 다시 받음(18회)
        return cur
    sidos = api('areaCode.do')
    if not sidos:
        if cur:
            return cur
        raise SystemExit('지역 코드를 받지 못했습니다')
    out = []
    for s in sidos:
        subs = api('areaCode.do', area=s['AREA_CD'])
        if subs is None and cur:
            return cur
        out.append({'code': s['AREA_CD'], 'name': s['AREA_NM'], 'sigungu': [{'code': g['AREA_CD'], 'name': g['AREA_NM']} for g in subs or []]})
    DATA.mkdir(parents=True, exist_ok=True)
    AREAS.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    log(f'지역 코드 시도 {len(out)} · 시군구 {sum(len(s["sigungu"]) for s in out)}')
    return out


def price(v):
    try:
        return round(float(v), 2)
    except (TypeError, ValueError):
        return None


def main():
    args = sys.argv[1:]
    key = os.environ.get('OPINET_API_KEY', '').strip()
    if not key:
        raise SystemExit('OPINET_API_KEY missing')
    budget = int(args[args.index('--budget') + 1]) if '--budget' in args else 280
    api, now = Api(key, budget), datetime.now(KST)
    prev = load(OUT, {})
    ar = areas(api, now)

    nation = {r['PRODCD']: {'price': price(r['PRICE']), 'diff': price(r['DIFF'])} for r in api('avgAllPrice.do') or []}
    if not nation.get('B027'):
        raise SystemExit('전국 평균 가격을 받지 못했습니다 (키·한도 확인)')
    recent = {p: [{'date': r['DATE'], 'price': price(r['PRICE'])} for r in api('avgRecentPrice.do', prodcd=p) or []] for p in ('B027', 'D047')}
    sido = {}
    for p in ('B027', 'D047'):
        for r in api('avgSidoPrice.do', prodcd=p) or []:
            if r['SIDOCD'] != '00':
                sido.setdefault(r['SIDOCD'], {'code': r['SIDOCD'], 'name': r['SIDONM']})[p] = {'price': price(r['PRICE']), 'diff': price(r['DIFF'])}

    sigun_avg = {}
    def sigun(p):
        for s in ar:
            if api.left() < 1:
                return
            for r in api('avgSigunPrice.do', prodcd=p, sido=s['code']) or []:
                sigun_avg.setdefault(r['SIGUNCD'], {})[p] = {'price': price(r['PRICE']), 'diff': price(r['DIFF'])}
    sigun('B027')

    stations, regions, fresh = {}, [], set()
    def add(r, p, region=None):
        sid = r.get('UNI_ID')
        if not sid:
            return None
        fresh.add(sid)
        s = stations.get(sid)
        if not s:
            try:
                lat, lon = katec_to_wgs84(float(r['GIS_X_COOR']), float(r['GIS_Y_COOR']))
            except (KeyError, TypeError, ValueError):
                lat = lon = None
            name = (r.get('OS_NM') or '').strip()
            s = stations[sid] = {'id': sid, 'name': name, 'brand': BRANDS.get(r.get('POLL_DIV_CD') or r.get('POLL_DIV_CO'), r.get('POLL_DIV_CD')),
                                 'address': ' '.join((r.get('NEW_ADR') or r.get('VAN_ADR') or '').split()) or None,
                                 'self': '셀프' in name, 'lat': lat, 'lon': lon, 'region': region, 'prices': {}}
        if region and not s['region']:
            s['region'] = region
        s['prices'][p] = int(r['PRICE']) if r.get('PRICE') not in (None, '') else None
        return sid

    skipped = 0
    for s in ar:
        for g in s['sigungu']:
            # keep room for 경유 시도 최저가; an area not fetched today keeps yesterday's list
            rows = api('lowTop10.do', prodcd='B027', area=g['code'], cnt=20) if api.left() >= 18 else None
            if rows is None:
                skipped += 1
                old = next((x for x in prev.get('regions', []) if x['code'] == g['code']), None)
                if old:  # keep yesterday's list for this area rather than dropping the page
                    regions.append(old)
                    for sid in old['top']:
                        if sid in prev.get('stations', {}) and sid not in stations:
                            stations[sid] = dict(prev['stations'][sid])
                continue
            ids = [x for x in (add(r, 'B027', g['code']) for r in rows) if x]
            regions.append({'code': g['code'], 'name': g['name'], 'sido': s['code'], 'sido_name': s['name'], 'avg': sigun_avg.get(g['code'], {}), 'top': ids})
    diesel = {}
    for s in ar:
        if api.left() < 1:
            break
        rows = api('lowTop10.do', prodcd='D047', area=s['code'], cnt=20) or []
        diesel[s['code']] = [x for x in (add(r, 'D047') for r in rows) if x]
    sigun('D047')
    for r in regions:
        r['avg'] = sigun_avg.get(r['code'], r.get('avg', {}))
    # 지역을 모르는 경유 최저가 주유소: 같은 시도의 가장 가까운 시군구(최저가 주유소들의 평균 위치)
    centers = {}
    for r in regions:
        pts = [stations[i] for i in r['top'] if stations[i]['lat'] is not None]
        if pts:
            centers[r['code']] = (sum(p['lat'] for p in pts) / len(pts), sum(p['lon'] for p in pts) / len(pts))
    for st in stations.values():
        if not st['region'] and st['lat'] is not None:
            near = [(abs(c[0] - st['lat']) + abs(c[1] - st['lon']), k) for k, c in centers.items()]
            st['region'] = min(near)[1] if near else None

    # 오늘 최저가 목록에서 빠진 주유소도 60일 동안 상세 페이지를 남김(검색에 올라간 주소가 깨지지 않게, 마지막 확인 가격·날짜 표시).
    today = now.strftime('%Y%m%d')
    for sid in fresh:
        stations[sid]['seen'] = today
    keep_from = (now - timedelta(days=60)).strftime('%Y%m%d')
    for sid, st in prev.get('stations', {}).items():
        # 'seen'이 없던 첫 수집(10/21) 주유소는 그날 확인한 것으로 봄(오늘 가격으로 잘못 보이지 않게)
        st.setdefault('seen', prev.get('status', {}).get('date') or prev.get('status', {}).get('updated_at', '')[:10].replace('-', '') or today)
        if sid not in stations and st['seen'] >= keep_from:
            stations[sid] = st
    history = {h['date']: h for h in prev.get('history', [])}
    for p, rows in recent.items():
        for r in rows:
            history.setdefault(r['date'], {'date': r['date']})[p] = r['price']
    history = sorted(history.values(), key=lambda h: h['date'])[-400:]
    status = {'updated_at': now.isoformat(timespec='seconds'), 'date': today, 'source': '한국석유공사 오피넷', 'calls': api.calls, 'stations': len(stations),
              'today': sum(1 for st in stations.values() if st.get('seen') == today),
              'regions': len(regions), 'skipped_regions': skipped}
    if len(regions) < len(prev.get('regions', [])) * 0.9 and '--force' not in args:
        raise SystemExit(f"시군구 수가 {len(prev['regions'])} → {len(regions)}로 줄어 중단합니다 (--force로 무시)")
    out = {'status': status, 'products': PRODUCTS, 'nation': nation, 'history': history, 'sido': sorted(sido.values(), key=lambda s: s['code']),
           'regions': regions, 'diesel': diesel, 'stations': stations}
    DATA.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    log(f"호출 {api.calls}회 · 시군구 {len(regions)}(건너뜀 {skipped}) · 주유소 {len(stations):,} · 전국 휘발유 {nation['B027']['price']:,}원 · {OUT.stat().st_size:,} bytes")


if __name__ == '__main__':
    main()
