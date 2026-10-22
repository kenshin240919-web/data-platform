"""Collect every pharmacy for pharmacy.guidejung.com (내근처 약국) from 국립중앙의료원 전국 약국 정보 조회 서비스.

The API returns about 25,000 pharmacies with coordinates and opening hours per weekday (1=월 … 7=일, 8=공휴일), so the
whole list ships with the site like the school list: apps/pharmacy/data/pharmacies.json is committed and both the
static pages and the Worker import it. '지금 영업 중' is computed from the hours at view time (browser / Worker).
Region codes are the weather site's 시군구 codes (same rules as scripts/collect-academy.py); every pharmacy has
coordinates, so a name that does not match falls back to the nearest 시군구.
Runs daily in GitHub Actions (.github/workflows/pharmacy-collect.yml).
Usage: DATA_GO_KR_KEY=... python scripts/collect-pharmacy.py [--force]
"""
import importlib.util, json, os, re, sys, urllib.parse
from collections import Counter
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('academy', ROOT / 'scripts/collect-academy.py')
A = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(A)
KST, log, http_json = A.KST, A.log, A.http_json
OUT = ROOT / 'apps/pharmacy/data/pharmacies.json'
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
    prev = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else None
    # A broken response must not wipe the site: refuse a list more than 10% smaller than the last one.
    if prev and len(items) < len(prev['items']) * 0.9 and '--force' not in args:
        raise SystemExit(f"약국 수가 {len(prev['items']):,} → {len(items):,}로 10% 넘게 줄어 중단합니다 (--force로 무시)")
    if prev and prev['items'] == items:
        log('변경 없음')
        return
    prev_ids = {p['id'] for p in prev['items']} if prev else set()
    status = {'updated_at': now.isoformat(timespec='seconds'), 'source': '국립중앙의료원 전국 약국 정보 조회 서비스', 'count': len(items),
              'with_coords': sum(1 for p in items if p['lat'] is not None), 'new': sum(1 for p in items if prev and p['id'] not in prev_ids),
              'removed': len(prev_ids - {p['id'] for p in items}) if prev else 0}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'status': status, 'items': items}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    h = lambda d: sum(1 for p in items if d in p['hours'])
    log(f"약국 {status['count']:,}곳 · 좌표 {status['with_coords']:,} · 일요일 {h('7'):,} · 공휴일 {h('8'):,} · 새로 {status['new']:,} · 빠짐 {status['removed']:,}")
    log('지역', len({p['region'] for p in items}), '시간 예시', Counter(tuple(p['hours'].get('1', [])) for p in items).most_common(5))


if __name__ == '__main__':
    main()
