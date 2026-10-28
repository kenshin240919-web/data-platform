"""Collect every pharmacy for pharmacy.guidejung.com (내근처 약국) from 국립중앙의료원 전국 약국 정보 조회 서비스.

The API returns about 25,000 pharmacies with coordinates and opening hours per weekday (1=월 … 7=일, 8=공휴일), so the
whole list ships with the site like the school list: apps/pharmacy/data/pharmacies.json is committed and both the
static pages and the Worker import it. '지금 영업 중' is computed from the hours at view time (browser / Worker).
Region codes are the weather site's 시군구 codes (same rules as scripts/collect-academy.py); every pharmacy has
coordinates, so a name that does not match falls back to the nearest 시군구.
Runs daily in GitHub Actions (.github/workflows/pharmacy-collect.yml).
Usage: DATA_GO_KR_KEY=... python scripts/collect-pharmacy.py [--force]
"""
import bisect, importlib.util, json, os, re, sys, urllib.parse
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('academy', ROOT / 'scripts/collect-academy.py')
A = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(A)
KST, log, http_json = A.KST, A.log, A.http_json
OUT = ROOT / 'apps/pharmacy/data/pharmacies.json'
HOSPITAL = ROOT / 'apps/hospital/data/summary.json'  # 응급실 위치(collect-hospital.py)
PARKING = ROOT / 'apps/parking/data/parkings.json'
API = 'https://apis.data.go.kr/B552657/ErmctInsttInfoInqireService/getParmacyListInfoInqire'
ROWS = 5000
# 주소 첫 낱말 → 교육청 코드(collect-academy.region_code가 시도를 교육청 코드로 받음).
SIDO = {'서울': 'B10', '부산': 'C10', '대구': 'D10', '인천': 'E10', '광주': 'F10', '대전': 'G10', '울산': 'H10', '세종': 'I10', '경기': 'J10',
        '강원': 'K10', '충북': 'M10', '충청북': 'M10', '충남': 'N10', '충청남': 'N10', '전북': 'P10', '전라북': 'P10', '전남': 'Q10', '전라남': 'Q10',
        '경북': 'R10', '경상북': 'R10', '경남': 'S10', '경상남': 'S10', '제주': 'T10'}


def office_of(address):
    first = (address or '').split(' ')[0]
    for k in sorted(SIDO, key=len, reverse=True):
        if first.startswith(k):
            return SIDO[k]
    return None


def hhmm(v):
    """1000 / '0900' / ' 900' → '0900'; empty → None."""
    s = re.sub(r'\D', '', str(v if v is not None else ''))
    return s.zfill(4) if s else None


def fetch(key):
    rows, page, total = [], 1, None
    while total is None or (page - 1) * ROWS < total:
        q = urllib.parse.urlencode({'serviceKey': key, 'pageNo': page, 'numOfRows': ROWS, '_type': 'json'})
        st, d = http_json(f'{API}?{q}', timeout=120)
        body = d.get('response', {}).get('body', {}) if isinstance(d, dict) else {}
        if st != 200 or 'items' not in body:
            raise SystemExit(f'약국 API page {page}: {st} {str(d)[:300]}')
        total = int(body['totalCount'])
        items = (body['items'] or {}).get('item', []) if isinstance(body['items'], dict) else body['items']
        rows += [items] if isinstance(items, dict) else items
        log(f'  {page}쪽 {len(rows):,}/{total:,}')
        page += 1
    return rows


def build(rows, regions):
    out, seen, skipped = [], set(), Counter()
    for r in rows:
        pid, name = (r.get('hpid') or '').strip(), re.sub(r'\s+', ' ', str(r.get('dutyName') or '')).strip()
        if not pid or not name or pid in seen:
            skipped['ID·이름 없음/중복'] += 1
            continue
        try:
            lat, lon = round(float(r['wgs84Lat']), 6), round(float(r['wgs84Lon']), 6)
        except (KeyError, TypeError, ValueError):
            lat = lon = None
        seen.add(pid)
        addr = re.sub(r'\s+', ' ', str(r.get('dutyAddr') or '')).strip() or None
        # 요일별 [시작, 끝] (1=월 … 7=일, 8=공휴일). 끝이 시작보다 작거나 2400을 넘으면 다음 날 새벽까지.
        hours = {}
        for d in range(1, 9):
            s, c = hhmm(r.get(f'dutyTime{d}s')), hhmm(r.get(f'dutyTime{d}c'))
            if s and c and s != c:
                hours[str(d)] = [s, c]
        p = {'id': pid, 'name': name, 'address': addr, 'tel': (str(r.get('dutyTel1') or '').strip() or None), 'lat': lat, 'lon': lon, 'hours': hours,
             'zip': (f"{str(r.get('postCdn1') or '').strip()}{str(r.get('postCdn2') or '').strip()}".strip() or None)}
        office, t = office_of(addr), (addr or '').split(' ')
        hit = A.region_code(office, t[1] if len(t) > 1 else '', regions) if office else None
        if not hit and lat is not None:
            hit = A.nearest_region({'office': office or 'B10', 'lat': lat, 'lon': lon}, regions)
        if not hit:
            skipped['지역 못 정함'] += 1
            continue
        sido = next((x['sidoShort'] for x in regions if x['code'][:2] == hit[0][:2]), '')
        p['region'], p['region_name'] = hit[0], hit[1] if hit[1].split(' ')[0] == sido else f'{sido} {hit[1]}'.strip()
        out.append(p)
    log('뺀 약국', dict(skipped))
    return out


def mins(t):
    return int(t) // 100 * 60 + int(t) % 100


def span_end(h):
    """끝 시각, 다음 날 새벽까지면 +2400 (['0900','0100'] → 2500)."""
    s, e = int(h[0]), int(h[1])
    return e + 2400 if e <= s else e


def open_at(p, day, t):
    v = p['hours'].get(day)
    return bool(v) and mins(v[0]) <= t < mins(span_end(v))


def enrich(items, ers, parkings):
    """Facts that differ on every detail page (Google skips near-identical template pages): the usual weekday closing
    time and weekly hours, pharmacies within 1km, and where to go after this one closes — the nearest pharmacy still
    open 10분 after its weekday close (2km), a Sunday-open one when this one closes on Sunday (5km), the nearest
    응급실 and 공영주차장 (500m). Distances are rounded to 10m so a nearby change rewrites little."""
    for p in items:
        wk = sorted(span_end(p['hours'][d]) for d in '12345' if d in p['hours'])
        p['wk_close'] = wk[len(wk) // 2] if wk else None
        p['week_h'] = round(sum(mins(span_end(v)) - mins(v[0]) for d, v in p['hours'].items() if d in '1234567') / 30) / 2  # 30분 단위
    geo = [p for p in items if p.get('lat') is not None]
    g = A.grid(geo)
    gk = A.grid([x for x in parkings if x.get('lat') is not None])
    sun = sorted((p for p in geo if '7' in p['hours']), key=lambda p: p['lat'])
    sun_lat = [p['lat'] for p in sun]
    ers = sorted(ers, key=lambda e: e['lat'])
    er_lat = [e['lat'] for e in ers]
    m10 = lambda d: int(round(d, -1))
    for p in geo:
        near = sorted(((d, b) for d, b in A.within(g, p['lat'], p['lon'], 2000) if b is not p), key=lambda e: e[0])
        p['around'] = {'n': sum(d <= 1000 for d, _ in near), 'sun': sum(d <= 1000 and '7' in b['hours'] for d, b in near)}
        day = next((d for d in '12345' if d in p['hours']), None)
        if day:
            t = mins(span_end(p['hours'][day])) + 10  # 이 약국이 닫고 10분 뒤(자정 넘으면 다음 날 새벽)
            nxt = str(int(day) % 7 + 1)
            best = next(((d, b) for d, b in near if open_at(b, day, t) or (t >= 1440 and open_at(b, nxt, t - 1440))), None)
            if best:  # 이름·시간은 Worker가 id로 찾음(파일 크기)
                p['after'] = {'id': best[1]['id'], 'm': m10(best[0])}
        if '7' not in p['hours']:
            lo, hi = bisect.bisect_left(sun_lat, p['lat'] - 0.05), bisect.bisect_right(sun_lat, p['lat'] + 0.05)
            best = min(((A.meters(p['lat'], p['lon'], b['lat'], b['lon']), b) for b in sun[lo:hi]), key=lambda e: e[0], default=None)
            if best and best[0] <= 5000:
                p['sun_alt'] = {'id': best[1]['id'], 'm': m10(best[0])}
        lo, hi = bisect.bisect_left(er_lat, p['lat'] - 0.5), bisect.bisect_right(er_lat, p['lat'] + 0.5)
        best = min(((A.meters(p['lat'], p['lon'], e['lat'], e['lon']), e) for e in ers[lo:hi]), key=lambda e: e[0], default=None)
        if best:
            p['er_near'] = {'id': best[1]['id'], 'name': best[1]['name'], 'm': m10(best[0])}
        park = min(A.within(gk, p['lat'], p['lon'], 500), key=lambda e: e[0], default=None)
        if park:
            p['park'] = {'id': park[1]['id'], 'name': park[1]['name'], 'm': m10(park[0]), 'free': park[1].get('charge') == '무료'}


def late(p):
    return any(d in p['hours'] and span_end(p['hours'][d]) >= 2200 for d in '12345')


def stage_of(items):
    """Sitemap stage: 1 = 밤 10시 이후·일요일·공휴일에 여는 곳 (submitted first), 2 = 평일 20시 이후나 토요일 17시 이후까지,
    3 = rest. SITEMAP_STAGE in app/sitemap.xml/route.ts decides how far the sitemap goes (Google crawls a new site slowly)."""
    for p in items:
        h = p['hours']
        p['stage'] = (1 if late(p) or '7' in h or '8' in h
                      else 2 if (p['wk_close'] or 0) >= 2000 or ('6' in h and span_end(h['6']) >= 1700) else 3)


def region_stats(items):
    """Per region: count, weekday closing time quartiles, weekly hours median, 토·일·공휴일·밤 10시 이후 counts — the
    detail page compares one pharmacy with its neighbours without storing them on every row."""
    by = defaultdict(list)
    for p in items:
        by[p['region']].append(p)
    q = lambda v, f: v[int(len(v) * f)] if v else None
    out = {}
    for rid, ps in by.items():
        close, week = sorted(p['wk_close'] for p in ps if p['wk_close']), sorted(p['week_h'] for p in ps if p['week_h'])
        st = {'n': len(ps), 'c25': q(close, .25), 'c50': q(close, .5), 'c75': q(close, .75), 'week': q(week, .5),
              'sat': sum('6' in p['hours'] for p in ps), 'sun': sum('7' in p['hours'] for p in ps), 'hol': sum('8' in p['hours'] for p in ps),
              'night': sum(late(p) for p in ps)}
        out[rid] = {a: v for a, v in st.items() if v is not None}
    return out


def main():
    args = sys.argv[1:]
    key = os.environ.get('DATA_GO_KR_KEY', '').strip()
    if not key:
        raise SystemExit('DATA_GO_KR_KEY missing')
    now = datetime.now(KST)
    regions = A.weather_regions()
    items = build(fetch(key), regions)
    for p in items:  # "세종 세종시" → "세종시" (제주 제주시·부산 부산진구는 그대로)
        sido, _, rest = p['region_name'].partition(' ')
        if sido == '세종' and rest:
            p['region_name'] = rest
    items.sort(key=lambda p: (p['region'], p['name'], p['id']))
    ers = [e for r in json.loads(HOSPITAL.read_text(encoding='utf-8'))['regions'] for e in r['er'] if e.get('lat') is not None] if HOSPITAL.exists() else []
    enrich(items, ers, json.loads(PARKING.read_text(encoding='utf-8'))['items'] if PARKING.exists() else [])
    stage_of(items)
    stats = region_stats(items)
    prev = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else None
    # A broken response must not wipe the site: refuse a list more than 10% smaller than the last one.
    if prev and len(items) < len(prev['items']) * 0.9 and '--force' not in args:
        raise SystemExit(f"약국 수가 {len(prev['items']):,} → {len(items):,}로 10% 넘게 줄어 중단합니다 (--force로 무시)")
    if prev and prev['items'] == items and prev.get('stats') == stats:
        log('변경 없음')
        return
    prev_ids = {p['id'] for p in prev['items']} if prev else set()
    status = {'updated_at': now.isoformat(timespec='seconds'), 'source': '국립중앙의료원 전국 약국 정보 조회 서비스', 'count': len(items),
              'with_coords': sum(1 for p in items if p.get('lat') is not None), 'new': sum(1 for p in items if prev and p['id'] not in prev_ids),
              'removed': len(prev_ids - {p['id'] for p in items}) if prev else 0}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'status': status, 'stats': stats, 'items': items}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    h = lambda d: sum(1 for p in items if d in p['hours'])
    log(f"약국 {status['count']:,}곳 · 좌표 {status['with_coords']:,} · 일요일 {h('7'):,} · 공휴일 {h('8'):,} · 새로 {status['new']:,} · 빠짐 {status['removed']:,}")
    log('단계', sorted(Counter(p['stage'] for p in items).items()), '닫은 뒤 갈 곳', sum('after' in p for p in items), '일요일 대신', sum('sun_alt' in p for p in items))
    log('지역', len({p['region'] for p in items}), '시간 예시', Counter(tuple(p['hours'].get('1', [])) for p in items).most_common(5))


if __name__ == '__main__':
    main()
