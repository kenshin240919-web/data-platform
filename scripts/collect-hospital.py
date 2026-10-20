"""Collect every 병·의원 for hospital.guidejung.com (내근처 병원) from 국립중앙의료원 전국 병·의원 찾기 서비스.

The list API gives about 79,000 institutions with coordinates and opening hours per weekday (1=월 … 7=일, 8=공휴일) but no
진료과목, so each 진료과목 code (QD) is listed too and the codes are joined onto the institutions (about 50 calls a day).
Writes runtime/hospital/full.json (for D1, scripts/build-hospital-d1.mjs) and apps/hospital/data/summary.json (static pages).
Region codes are the weather site's 시군구 codes (same rules as the academy/pharmacy collectors).
Runs daily in GitHub Actions (.github/workflows/hospital-collect.yml).
Usage: DATA_GO_KR_KEY=... python scripts/collect-hospital.py [--force]
"""
import hashlib, importlib.util, json, os, re, sys, urllib.parse
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
        h['region'], h['region_name'] = hit[0], hit[1] if hit[1].startswith(sido) else f'{sido} {hit[1]}'.strip()
        h['sido'] = reg['sidoName'] if reg else None  # 응급실 실시간 병상 조회(STAGE1)용 시도 이름
        rank = DIV_RANK.get(div or '', 4) + 20 * h['sun'] + 15 * h['hol'] + 15 * h['night'] + 5 * h['sat'] + 5 * bool(h['info']) + 10 * h['er']
        h['rank'] = round(rank + int(hashlib.sha1(hid.encode()).hexdigest()[:6], 16) / 0xFFFFFF, 4)
        out.append(h)
    log('뺀 기관', dict(skipped))
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
    for h in items:  # "세종 세종시" → "세종시"
        sido, _, rest = h['region_name'].partition(' ')
        if rest.startswith(sido):
            h['region_name'] = rest
    items.sort(key=lambda h: (h['region'], -h['rank']))
    OUT.mkdir(parents=True, exist_ok=True)
    prev_path = OUT / 'full.json'
    prev = json.loads(prev_path.read_text(encoding='utf-8')) if prev_path.exists() else None
    if prev and len(items) < len(prev['items']) * 0.9 and '--force' not in args:
        raise SystemExit(f"기관 수가 {len(prev['items']):,} → {len(items):,}로 10% 넘게 줄어 중단합니다 (--force로 무시)")
    status = {'updated_at': now.isoformat(timespec='seconds'), 'source': '국립중앙의료원 전국 병·의원 찾기 서비스', 'count': len(items),
              'with_coords': sum(1 for h in items if h['lat'] is not None)}
    tmp = prev_path.with_suffix('.tmp')
    tmp.write_text(json.dumps({'status': status, 'items': items}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    tmp.replace(prev_path)
    s = summary(items, status)
    SUMMARY.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY.write_text(json.dumps(s, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    log(f"기관 {status['count']:,}곳 · 좌표 {status['with_coords']:,} · 응급실 {s['er']:,} · 야간 {s['cond']['night']:,} · 일요일 {s['cond']['sun']:,} · 공휴일 {s['cond']['hol']:,}")
    log('과목', s['nation'])
    log('종류', s['divs'])
    log(f"지역 {len(s['regions'])} · 요약 파일 {SUMMARY.stat().st_size:,} bytes")


if __name__ == '__main__':
    main()
