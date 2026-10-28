"""Collect every 병·의원 for hospital.guidejung.com (내근처 병원) from 국립중앙의료원 전국 병·의원 찾기 서비스.

The list API gives about 79,000 institutions with coordinates and opening hours per weekday (1=월 … 7=일, 8=공휴일) but no
진료과목, so each 진료과목 code (QD) is listed too and the codes are joined onto the institutions (about 50 calls a day).
Writes runtime/hospital/full.json (for D1, scripts/build-hospital-d1.mjs) and apps/hospital/data/summary.json (static pages).
Region codes are the weather site's 시군구 codes (same rules as the academy/pharmacy collectors).
Runs daily in GitHub Actions (.github/workflows/hospital-collect.yml).
Usage: DATA_GO_KR_KEY=... python scripts/collect-hospital.py [--force]
"""
import bisect, hashlib, importlib.util, json, os, re, sys, urllib.parse
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('pharmacy', ROOT / 'scripts/collect-pharmacy.py')
P = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P)
A, KST, log, http_json, hhmm, office_of = P.A, P.KST, P.log, P.http_json, P.hhmm, P.office_of
OUT = ROOT / 'runtime/hospital'
SUMMARY = ROOT / 'apps/hospital/data/summary.json'
API = 'https://apis.data.go.kr/B552657/HsptlAsembySearchService/getHsptlMdcncListInfoInqire'
ROWS = 5000
# 사이트 진료과목(주소 slug) ← 국립중앙의료원 진료과목 코드. 한의원·치과는 기관 종류로도 붙임.
DEPTS = {'internal': ('내과', ['D001']), 'pediatrics': ('소아청소년과', ['D002']), 'ent': ('이비인후과', ['D013']), 'ortho': ('정형외과', ['D008']),
         'derma': ('피부과', ['D005']), 'eye': ('안과', ['D012']), 'obgyn': ('산부인과', ['D011']), 'family': ('가정의학과', ['D022']),
         'uro': ('비뇨의학과', ['D014']), 'psych': ('정신건강의학과', ['D004']), 'neuro': ('신경과', ['D003']), 'surgery': ('외과', ['D006']),
         'neurosurgery': ('신경외과', ['D009']), 'rehab': ('재활의학과', ['D016']), 'pain': ('마취통증의학과', ['D017']), 'plastic': ('성형외과', ['D010']),
         'dental': ('치과', ['D026']), 'korean': ('한의원', [])}
SKIP_DIV = {'기타(구급차)'}
DIV_RANK = {'상급종합병원': 12, '종합병원': 10, '병원': 8, '요양병원': 3, '의원': 5, '치과병원': 6, '치과의원': 5, '한방병원': 6, '한의원': 4, '보건소': 6}


def fetch(key, **q):
    rows, page, total = [], 1, None
    while total is None or (page - 1) * ROWS < total:
        qs = urllib.parse.urlencode({'serviceKey': key, 'pageNo': page, 'numOfRows': ROWS, '_type': 'json', **q})
        st, d = http_json(f'{API}?{qs}', timeout=180)
        body = d.get('response', {}).get('body', {}) if isinstance(d, dict) else {}
        if st != 200 or 'items' not in body:
            raise SystemExit(f'병의원 API {q} page {page}: {st} {str(d)[:300]}')
        total = int(body.get('totalCount') or 0)
        items = (body['items'] or {}).get('item', []) if isinstance(body['items'], dict) else (body['items'] or [])
        rows += [items] if isinstance(items, dict) else items
        page += 1
        if not total:
            break
    return rows, total


def clean_text(v, limit):
    s = re.sub(r'\s+', ' ', str(v or '')).strip()
    return s[:limit] or None


def span_end(h):
    s, e = int(h[0]), int(h[1])
    return e + 2400 if e <= s else e


def build(rows, depts_of, regions):
    out, seen, skipped = [], set(), Counter()
    for r in rows:
        hid, name = (r.get('hpid') or '').strip(), re.sub(r'\s+', ' ', str(r.get('dutyName') or '')).strip()
        div = (r.get('dutyDivNam') or '').strip() or None
        if not hid or not name or hid in seen or div in SKIP_DIV:
            skipped['ID·이름 없음/중복/구급차'] += 1
            continue
        try:
            lat, lon = round(float(r['wgs84Lat']), 6), round(float(r['wgs84Lon']), 6)
        except (KeyError, TypeError, ValueError):
            lat = lon = None
        seen.add(hid)
        addr = re.sub(r'\s+', ' ', str(r.get('dutyAddr') or '')).strip() or None
        hours = {}
        for d in range(1, 9):
            s, c = hhmm(r.get(f'dutyTime{d}s')), hhmm(r.get(f'dutyTime{d}c'))
            if s and c and s != c:
                hours[str(d)] = [s, c]
        depts = sorted(depts_of.get(hid, set()))
        if div in ('한의원', '한방병원') and 'korean' not in depts:
            depts.append('korean')
        if div in ('치과의원', '치과병원') and 'dental' not in depts:
            depts.append('dental')
        night = any(span_end(hours[d]) > 2000 for d in '12345' if d in hours)  # 저녁 8시 넘어서까지
        h = {'id': hid, 'name': name, 'div': div, 'address': addr, 'tel': clean_text(r.get('dutyTel1'), 20), 'er_tel': clean_text(r.get('dutyTel3'), 20),
             'er': str(r.get('dutyEryn')) == '1', 'lat': lat, 'lon': lon, 'hours': hours, 'depts': sorted(depts),
             'info': clean_text(r.get('dutyInf'), 400), 'note': clean_text(r.get('dutyEtc'), 200),
             'zip': (f"{str(r.get('postCdn1') or '').strip()}{str(r.get('postCdn2') or '').strip()}".strip() or None),
             'night': night, 'sat': '6' in hours, 'sun': '7' in hours, 'hol': '8' in hours}
        office, t = office_of(addr), (addr or '').split(' ')
        hit = A.region_code(office, t[1] if len(t) > 1 else '', regions) if office else None
        if not hit and lat is not None:
            hit = A.nearest_region({'office': office or 'B10', 'lat': lat, 'lon': lon}, regions)
        if not hit:
            skipped['지역 못 정함'] += 1
            continue
        reg = next((x for x in regions if x['code'][:2] == hit[0][:2]), None)
        sido = reg['sidoShort'] if reg else ''
        h['region'], h['region_name'] = hit[0], hit[1] if hit[1].split(' ')[0] == sido else f'{sido} {hit[1]}'.strip()
        h['sido'] = reg['sidoName'] if reg else None  # 응급실 실시간 병상 조회(STAGE1)용 시도 이름
        rank = DIV_RANK.get(div or '', 4) + 20 * h['sun'] + 15 * h['hol'] + 15 * h['night'] + 5 * h['sat'] + 5 * bool(h['info']) + 10 * h['er']
        h['rank'] = round(rank + int(hashlib.sha1(hid.encode()).hexdigest()[:6], 16) / 0xFFFFFF, 4)
        out.append(h)
    log('뺀 기관', dict(skipped))
    return out


def mins(t):
    return int(t) // 100 * 60 + int(t) % 100


HOSPITAL_DIVS = {'병원', '종합병원', '상급종합병원', '한방병원', '치과병원', '요양병원'}


def main_dept(h):
    """대표 진료과목: 이름에 있는 과목('OO소아청소년과의원' → 소아청소년과, 가장 긴 이름 우선), 치과·한의원은 종류로,
    없으면 내과가 아닌 첫 과목(내과는 거의 모든 병원이 신고해서 맨 뒤)."""
    named = sorted((k for k, (label, _) in DEPTS.items() if label in h['name'] and k in h['depts']), key=lambda k: -len(DEPTS[k][0]))
    if named:
        return named[0]
    if 'dental' in h['depts'] and '치과' in (h['div'] or ''):
        return 'dental'
    if 'korean' in h['depts'] and '한' in (h['div'] or ''):
        return 'korean'
    return next((d for d in h['depts'] if d != 'internal'), h['depts'][0] if h['depts'] else None)


def enrich(items, pharmacies, parkings):
    """Facts that differ on every detail page (Google skips near-identical template pages): the usual weekday closing
    time and weekly hours, the same 진료과목 within 1km, and where to go next — nearest 약국 (open after 진료 ends?),
    nearest 응급실, nearest 공영주차장. Distances are rounded so a nearby change rewrites few D1 rows."""
    for h in items:
        h['dept'] = main_dept(h)
        wk = sorted(span_end(h['hours'][d]) for d in '12345' if d in h['hours'])
        h['wk_close'] = wk[len(wk) // 2] if wk else None
        h['week_h'] = round(sum(mins(span_end(v)) - mins(v[0]) for d, v in h['hours'].items() if d in '1234567') / 30) / 2  # 30분 단위
    geo = [h for h in items if h['lat'] is not None]
    gh = A.grid(geo)
    gp = A.grid([x for x in pharmacies if x.get('lat') is not None])
    gk = A.grid([x for x in parkings if x.get('lat') is not None])
    ers = sorted((h for h in geo if h['er']), key=lambda h: h['lat'])
    er_lat = [h['lat'] for h in ers]
    for h in items:
        h['around'], h['pharm'], h['er_near'], h['park'] = None, [], None, None
        if h['lat'] is None:
            continue
        k = h['dept']
        near = [b for _, b in A.within(gh, h['lat'], h['lon'], 1000) if b is not h]
        same = [b for b in near if k in b['depts']]
        h['around'] = {'n': len(near), 'same': len(same), 'sun': sum(b['sun'] for b in same), 'night': sum(b['night'] for b in same)}
        day = next((d for d in '12345' if d in h['hours']), None)
        t = mins(h['wk_close']) + 10 if h['wk_close'] else None

        def after(x):  # 그 약국이 평일 진료 마감 10분 뒤에도 여는지
            v = x.get('hours', {}).get(day) if day and t is not None else None
            return bool(v) and mins(v[0]) <= t < mins(span_end(v))
        h['pharm'] = [{'id': x['id'], 'name': x['name'], 'm': int(round(d, -1)), 'after': after(x)} for d, x in sorted(A.within(gp, h['lat'], h['lon'], 1000), key=lambda e: e[0])[:2]]
        park = min(A.within(gk, h['lat'], h['lon'], 500), key=lambda e: e[0], default=None)
        if park:
            h['park'] = {'id': park[1]['id'], 'name': park[1]['name'], 'm': int(round(park[0], -1)), 'free': park[1].get('charge') == '무료'}
        if not h['er']:
            lo, hi = bisect.bisect_left(er_lat, h['lat'] - 0.5), bisect.bisect_right(er_lat, h['lat'] + 0.5)
            best = min(((A.meters(h['lat'], h['lon'], e['lat'], e['lon']), e) for e in ers[lo:hi]), key=lambda e: e[0], default=None)
            if best:
                h['er_near'] = {'id': best[1]['id'], 'name': best[1]['name'], 'm': int(round(best[0], -1))}


def stage_of(items, s):
    """Sitemap stage: 1 = linked from the static region·과목·조건 pages (submitted first), 2 = 야간·일요일·공휴일·응급실·병원급,
    3 = rest. The Worker's SITEMAP_STAGE decides how far the sitemap goes (Google crawls a new site's pages slowly)."""
    linked = {c['id'] for r in s['regions'] for c in r['top'] + r['er'] + [c for v in r['cond_top'].values() for c in v] + [c for v in r['depts'].values() for c in v['top']]}
    for h in items:
        h['stage'] = 1 if h['id'] in linked else 2 if h['night'] or h['sun'] or h['hol'] or h['er'] or h['div'] in HOSPITAL_DIVS else 3


def region_stats(items):
    """Per region and 진료과목: count, weekday closing time quartiles, weekly hours median, 토·일·공휴일·야간 counts
    (D1 regions.stats): the detail page compares one hospital with its neighbours without storing them in every row."""
    by = defaultdict(list)
    for h in items:
        for k in h['depts']:
            by[(h['region'], k)].append(h)
    q = lambda v, f: v[int(len(v) * f)] if v else None
    out = defaultdict(dict)
    for (rid, k), hs in by.items():
        close, week = sorted(h['wk_close'] for h in hs if h['wk_close']), sorted(h['week_h'] for h in hs if h['week_h'])
        out[rid][k] = {'n': len(hs), 'c25': q(close, .25), 'c50': q(close, .5), 'c75': q(close, .75), 'week': q(week, .5),
                       'sat': sum(h['sat'] for h in hs), 'sun': sum(h['sun'] for h in hs), 'hol': sum(h['hol'] for h in hs), 'night': sum(h['night'] for h in hs)}
    return out


def card(h):
    return {k: h[k] for k in ('id', 'name', 'div', 'address', 'tel', 'lat', 'lon', 'hours', 'depts', 'er')}


def summary(items, status):
    by = defaultdict(list)
    for h in items:
        by[h['region']].append(h)
    regions = []
    for rid, hs in sorted(by.items()):
        hs.sort(key=lambda h: -h['rank'])
        pts = [h for h in hs if h['lat'] is not None]
        depts = {}
        for k in DEPTS:
            sub = [h for h in hs if k in h['depts']]
            if sub:
                depts[k] = {'count': len(sub), 'night': sum(h['night'] for h in sub), 'sun': sum(h['sun'] for h in sub), 'hol': sum(h['hol'] for h in sub),
                            'top': [card(h) for h in sub[:8]]}
        regions.append({'id': rid, 'name': hs[0]['region_name'], 'sido': hs[0]['sido'], 'count': len(hs),
                        'lat': round(sum(h['lat'] for h in pts) / len(pts), 5) if pts else None, 'lon': round(sum(h['lon'] for h in pts) / len(pts), 5) if pts else None,
                        'divs': dict(Counter(h['div'] for h in hs).most_common()), 'er': [card(h) for h in hs if h['er']][:10],
                        'cond': {c: sum(h[c] for h in hs) for c in ('night', 'sat', 'sun', 'hol')},
                        'cond_top': {c: [card(h) for h in hs if h[c]][:8] for c in ('night', 'sun', 'hol')},
                        'depts': depts, 'top': [card(h) for h in hs[:12]]})
    nation = {k: sum(1 for h in items if k in h['depts']) for k in DEPTS}
    return {'status': status, 'depts': {k: v[0] for k, v in DEPTS.items()}, 'nation': nation,
            'cond': {c: sum(h[c] for h in items) for c in ('night', 'sat', 'sun', 'hol')}, 'er': sum(h['er'] for h in items),
            'divs': dict(Counter(h['div'] for h in items).most_common()), 'regions': regions}


def main():
    args = sys.argv[1:]
    key = os.environ.get('DATA_GO_KR_KEY', '').strip()
    if not key:
        raise SystemExit('DATA_GO_KR_KEY missing')
    now = datetime.now(KST)
    rows, total = fetch(key)
    log(f'병의원 목록 {len(rows):,}/{total:,}')
    depts_of = defaultdict(set)
    for slug, (label, codes) in DEPTS.items():
        for code in codes:
            rs, n = fetch(key, QD=code)
            for r in rs:
                depts_of[(r.get('hpid') or '').strip()].add(slug)
            log(f'  {label}({code}) {n:,}곳')
    regions = A.weather_regions()
    items = build(rows, depts_of, regions)
    for h in items:  # "세종 세종시" → "세종시" (제주 제주시·부산 부산진구는 그대로)
        sido, _, rest = h['region_name'].partition(' ')
        if sido == '세종' and rest:
            h['region_name'] = rest
    items.sort(key=lambda h: (h['region'], -h['rank']))
    OUT.mkdir(parents=True, exist_ok=True)
    prev_path = OUT / 'full.json'
    prev = json.loads(prev_path.read_text(encoding='utf-8')) if prev_path.exists() else None
    if prev and len(items) < len(prev['items']) * 0.9 and '--force' not in args:
        raise SystemExit(f"기관 수가 {len(prev['items']):,} → {len(items):,}로 10% 넘게 줄어 중단합니다 (--force로 무시)")
    status = {'updated_at': now.isoformat(timespec='seconds'), 'source': '국립중앙의료원 전국 병·의원 찾기 서비스', 'count': len(items),
              'with_coords': sum(1 for h in items if h['lat'] is not None)}
    s = summary(items, status)
    enrich(items, json.loads((ROOT / 'apps/pharmacy/data/pharmacies.json').read_text(encoding='utf-8'))['items'],
           json.loads((ROOT / 'apps/parking/data/parkings.json').read_text(encoding='utf-8'))['items'])
    stage_of(items, s)
    log('사이트맵 단계', sorted(Counter(h['stage'] for h in items).items()))
    tmp = prev_path.with_suffix('.tmp')
    tmp.write_text(json.dumps({'status': status, 'stats': region_stats(items), 'items': items}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    tmp.replace(prev_path)
    SUMMARY.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY.write_text(json.dumps(s, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    log(f"기관 {status['count']:,}곳 · 좌표 {status['with_coords']:,} · 응급실 {s['er']:,} · 야간 {s['cond']['night']:,} · 일요일 {s['cond']['sun']:,} · 공휴일 {s['cond']['hol']:,}")
    log('과목', s['nation'])
    log('종류', s['divs'])
    log(f"지역 {len(s['regions'])} · 요약 파일 {SUMMARY.stat().st_size:,} bytes")


if __name__ == '__main__':
    main()
