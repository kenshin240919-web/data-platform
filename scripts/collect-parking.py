"""Collect every parking lot for parking.guidejung.com (내근처 주차장) from 전국주차장정보표준데이터 (공공데이터포털 15012896).

About 19,000 rows (17,800 lots after merging rows with the same 관리번호; 95% 공영), so the whole list ships with the site
like the pharmacy list: apps/parking/data/parkings.json is committed and both the static pages and the Worker import it.
Fees are kept as numbers (기본시간·기본요금·추가단위) so the site can compute '2시간 세우면 얼마' (apps/parking/lib/fmt.ts).
Region codes are the weather site's 시군구 codes (same rules as scripts/collect-pharmacy.py / collect-academy.py).
Lots without coordinates (about 4%) keep the coordinates of the previous run or get them from Kakao (KAKAO_REST_KEY, optional).
Runs daily in GitHub Actions (.github/workflows/parking-collect.yml).
Usage: DATA_GO_KR_KEY=... [KAKAO_REST_KEY=...] python scripts/collect-parking.py [--force]
"""
import importlib.util, json, os, re, sys, urllib.parse
from collections import Counter
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


A = _load('academy', 'collect-academy.py')
P = _load('pharmacy', 'collect-pharmacy.py')
KST, log, http_json = A.KST, A.log, A.http_json
OUT = ROOT / 'apps/parking/data/parkings.json'
API = 'https://api.data.go.kr/openapi/tn_pubr_prkplce_info_api'
KAKAO = 'https://dapi.kakao.com/v2/local/search/address.json'
ROWS = 1000
GEO_LIMIT = 3000  # 한 번에 좌표를 새로 받을 최대 주소 수(첫 실행 약 800곳)


def fetch(key):
    rows, page, total = [], 1, None
    while total is None or (page - 1) * ROWS < total:
        q = urllib.parse.urlencode({'serviceKey': key, 'pageNo': page, 'numOfRows': ROWS, 'type': 'json'})
        st, d = http_json(f'{API}?{q}', timeout=180)
        resp = d.get('response', d) if isinstance(d, dict) else {}
        body = resp.get('body') or {}
        if st != 200 or 'items' not in body:
            raise SystemExit(f'주차장 API page {page}: {st} {str(d)[:300]}')
        total = int(body['totalCount'])
        items = body['items'] or []
        items = items.get('item', []) if isinstance(items, dict) else items
        rows += [items] if isinstance(items, dict) else items
        log(f'  {page}쪽 {len(rows):,}/{total:,}')
        page += 1
    return rows


def txt(v):
    s = re.sub(r'\s+', ' ', str(v if v is not None else '')).strip()
    return s or None


def won(v):
    """'500' / '1,000' / '500원' → 500; 빈칸·문장 → None."""
    s = re.sub(r'[,\s원]', '', str(v if v is not None else ''))
    return int(float(s)) if re.fullmatch(r'\d+(\.\d+)?', s) else None


def hhmm(v):
    """'09:00' / '0900' / '9:00' → '09:00'; 빈칸 → None."""
    s = re.sub(r'\D', '', str(v if v is not None else ''))
    if not s or len(s) > 4:
        return None
    s = s.zfill(4)
    return f'{s[:2]}:{s[2:]}' if int(s[:2]) <= 24 and int(s[2:]) < 60 else None


def hours(r):
    days = r.get('operDay') or ''
    pair = lambda o, c: [hhmm(r.get(o)), hhmm(r.get(c))] if hhmm(r.get(o)) and hhmm(r.get(c)) else None
    h = {'wk': pair('weekdayOperOpenHhmm', 'weekdayOperColseHhmm') if '평일' in days or not days else None,
         'sat': pair('satOperOperOpenHhmm', 'satOperCloseHhmm') if '토요일' in days else None,
         'hol': pair('holidayOperOpenHhmm', 'holidayCloseOpenHhmm') if '공휴일' in days else None}
    return {k: v for k, v in h.items() if v}


def fee(r, charge):
    if charge == '무료':
        return None
    f = {}
    bt, bc, at, ac = won(r.get('basicTime')), won(r.get('basicCharge')), won(r.get('addUnitTime')), won(r.get('addUnitCharge'))
    if bt and bc:
        f['b'] = [bt, bc]
        if at and ac:
            f['a'] = [at, ac]
    day, dh, month = won(r.get('dayCmmtkt')), won(r.get('dayCmmtktAdjTime')), won(r.get('monthCmmtkt'))
    if day:
        f['d'] = day
        if dh:
            f['dh'] = dh
    if month:
        f['m'] = month
    return f or None


def build(rows, regions, prev_by_id):
    best = {}
    for r in rows:  # 같은 관리번호가 여러 행이면 기준일이 가장 최근인 행
        pid = txt(r.get('prkplceNo'))
        if pid and (pid not in best or (r.get('referenceDate') or '') > (best[pid].get('referenceDate') or '')):
            best[pid] = r
    out, skipped = [], Counter()
    for pid, r in best.items():
        name = txt(r.get('prkplceNm'))
        if not name or not re.fullmatch(r'[0-9A-Za-z-]{3,30}', pid):
            skipped['이름·관리번호 이상'] += 1
            continue
        try:
            lat, lon = round(float(r['latitude']), 6), round(float(r['longitude']), 6)
            if not (33 < lat < 39 and 124 < lon < 132):
                lat = lon = None
        except (KeyError, TypeError, ValueError):
            lat = lon = None
        addr, jibun = txt(r.get('rdnmadr')), txt(r.get('lnmadr'))
        charge = txt(r.get('parkingchrgeInfo')) or '유료'
        charge = '무료' if charge == '무료' else '혼합' if '무' in charge else '유료'
        p = {'id': pid, 'name': name, 'se': txt(r.get('prkplceSe')), 'type': txt(r.get('prkplceType')), 'addr': addr,
             'jibun': jibun if jibun != addr else None, 'spaces': won(r.get('prkcmprt')), 'lat': lat, 'lon': lon,
             'charge': charge, 'fee': fee(r, charge), 'days': txt(r.get('operDay')), 'hours': hours(r), 'pay': txt(r.get('metpay')),
             'note': txt(r.get('spcmnt')), 'org': txt(r.get('institutionNm')), 'tel': txt(r.get('phoneNumber')),
             'dis': (r.get('pwdbsPpkZoneYn') or '').strip().upper() == 'Y', 'ref': txt(r.get('referenceDate'))}
        if p['lat'] is None and prev_by_id.get(pid, {}).get('lat') is not None:
            p['lat'], p['lon'] = prev_by_id[pid]['lat'], prev_by_id[pid]['lon']
        out.append(p)
    log('뺀 주차장', dict(skipped), '· 중복 관리번호로 합친 행', f'{len(rows) - len(best):,}')
    return out


def geocode(items, key):
    todo = [p for p in items if p['lat'] is None and (p['addr'] or p['jibun'])][:GEO_LIMIT]
    log(f'좌표 없는 주차장 {sum(1 for p in items if p["lat"] is None):,}곳 · 이번에 변환 {len(todo):,}곳')
    got = 0
    for p in todo:
        for q in dict.fromkeys(x for x in (p['addr'], p['jibun'], re.sub(r'\s*[(,].*$', '', p['addr'] or '')) if x):
            st, d = http_json(f'{KAKAO}?{urllib.parse.urlencode({"query": q})}', {'Authorization': f'KakaoAK {key}'}, timeout=20, tries=2)
            if st != 200:
                if st in (401, 403, 429) or st == 0:
                    log(f'좌표 변환 중단: {st} {str(d)[:200]}')
                    return
                break
            docs = d.get('documents') or []
            if docs:
                p['lat'], p['lon'] = round(float(docs[0]['y']), 6), round(float(docs[0]['x']), 6)
                got += 1
                break
    log(f'좌표 변환 성공 {got:,}곳')


def place(items, regions):
    out, skipped = [], 0
    for p in items:
        where = p['addr'] or p['jibun'] or p['org'] or ''
        office, t = P.office_of(where), where.split(' ')
        hit = A.region_code(office, t[1] if len(t) > 1 else '', regions) if office else None
        if not hit and p['lat'] is not None:
            hit = A.nearest_region({'office': office or 'B10', 'lat': p['lat'], 'lon': p['lon']}, regions)
        if not hit:
            skipped += 1
            continue
        sido = next((x['sidoShort'] for x in regions if x['code'][:2] == hit[0][:2]), '')
        name = hit[1] if hit[1].split(' ')[0] == sido else f'{sido} {hit[1]}'.strip()  # '제주시' → '제주 제주시'
        s, _, rest = name.partition(' ')  # "세종 세종시" → "세종시" (제주 제주시·부산 부산진구는 그대로)
        p['region'], p['region_name'] = hit[0], rest if s == '세종' and rest else name
        out.append(p)
    log(f'지역 못 정해 뺀 주차장 {skipped:,}곳')
    return out


def main():
    args = sys.argv[1:]
    key = os.environ.get('DATA_GO_KR_KEY', '').strip()
    if not key:
        raise SystemExit('DATA_GO_KR_KEY missing')
    now = datetime.now(KST)
    regions = A.weather_regions()
    prev = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else None
    prev_by_id = {p['id']: p for p in prev['items']} if prev else {}
    items = build(fetch(key), regions, prev_by_id)
    kakao = os.environ.get('KAKAO_REST_KEY', '').strip()
    if kakao:
        geocode(items, kakao)
    items = place(items, regions)
    items.sort(key=lambda p: (p['region'], p['name'], p['id']))
    # A broken response must not wipe the site: refuse a list more than 10% smaller than the last one.
    if prev and len(items) < len(prev['items']) * 0.9 and '--force' not in args:
        raise SystemExit(f"주차장 수가 {len(prev['items']):,} → {len(items):,}로 10% 넘게 줄어 중단합니다 (--force로 무시)")
    if prev and prev['items'] == items:
        log('변경 없음')
        return
    prev_ids = set(prev_by_id)
    refs = sorted(p['ref'] for p in items if p['ref'])
    status = {'updated_at': now.isoformat(timespec='seconds'), 'source': '전국주차장정보표준데이터(공공데이터포털)', 'count': len(items),
              'with_coords': sum(1 for p in items if p['lat'] is not None), 'free': sum(1 for p in items if p['charge'] == '무료'),
              'ref_min': refs[0] if refs else None, 'ref_max': refs[-1] if refs else None,
              'new': sum(1 for p in items if prev and p['id'] not in prev_ids), 'removed': len(prev_ids - {p['id'] for p in items}) if prev else 0}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'status': status, 'items': items}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    paid = [p for p in items if p['charge'] != '무료']
    log(f"주차장 {status['count']:,}곳 · 좌표 {status['with_coords']:,} · 무료 {status['free']:,} · 유료·혼합 {len(paid):,}"
        f" (요금 계산 가능 {sum(1 for p in paid if p['fee'] and 'b' in p['fee']):,}) · 지역 {len({p['region'] for p in items})}"
        f" · 새로 {status['new']:,} · 빠짐 {status['removed']:,} · 파일 {OUT.stat().st_size / 1e6:.1f}MB")
    log('시간 예시', Counter(json.dumps(p['hours'], ensure_ascii=False) for p in items).most_common(4))


if __name__ == '__main__':
    main()
