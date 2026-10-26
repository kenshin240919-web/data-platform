"""Collect registered pet places for pet.guidejung.com (내근처 동물병원): 동물병원(24시는 이름 기준), 동물약국(약국 사이트의
영업 시간을 붙임), 펫호텔·위탁관리, 애견·고양이 카페(동물전시업), 펫택시(동물운송업) — one list that ships with the site
(apps/pet/data/places.json, like rest).

Sources (지방행정 인허가데이터 LOCALDATA files, no application needed; reports/pet-설계안-2026-10-26.md 2장):
- animal_hospitals   동물병원 ~10,700 rows (영업 ~5,500)  진료 시간 없음 → '24시'는 이름에 24가 든 곳(방문 전 전화 확인)
- animal_pharmacies  동물약국 ~21,000 rows (영업 ~13,800) 대부분 사람 약국 → apps/pharmacy/data/pharmacies.json(국립중앙의료원
                     요일별 시간)과 이름+도로명주소(없으면 이름+150m 안)로 맞춰 hours·약국 id(ph)를 붙임(약 80%)
- animal_boarding    동물위탁관리업(펫호텔·유치원) 영업 ~6,100 — 같은 이름·주소의 동물병원이 있으면 병원에 '호텔' 태그만
- animal_exhibition  동물전시업(애견·고양이 카페 등) 영업 ~660
- animal_transport   동물운송업(펫택시) 영업 ~2,400
Only 영업/정상 rows; EPSG:5174 → WGS84 (collect-rest.py tm5174); rows without coordinates keep the previous run's or get
them from Kakao (KAKAO_REST_KEY, optional, 30-day refresh). Region codes are the weather site's 시군구 codes.
Usage: [KAKAO_REST_KEY=...] python scripts/collect-pet.py [--force]
"""
import importlib.util, json, math, os, re, sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('rest', ROOT / 'scripts/collect-rest.py')
R = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(R)
S, K, A = R.S, R.K, R.A
KST, log, txt, compact, xy, ymd = S.KST, S.log, S.txt, S.compact, R.xy, R.ymd
OUT = ROOT / 'apps/pet/data/places.json'
PHARMACIES = ROOT / 'apps/pharmacy/data/pharmacies.json'
SOURCES = {'animal_hospitals': ('hospital', 'h'), 'animal_pharmacies': ('pharmacy', 'p'), 'animal_boarding': ('hotel', 'b'),
           'animal_exhibition': ('cafe', 'c'), 'animal_transport': ('taxi', 't')}
H24 = re.compile(r'24(?!\s*인치)')  # '24시'·'24H'·'메디컬24' — 이름 기준, 진료 시간 데이터는 없음


AREA = {'서울': '02', '부산': '051', '대구': '053', '인천': '032', '광주': '062', '대전': '042', '울산': '052', '세종': '044', '경기': '031',
        '강원': '033', '충청북': '043', '충북': '043', '충청남': '041', '충남': '041', '전북': '063', '전라북': '063', '전라남': '061', '전남': '061',
        '경상북': '054', '경북': '054', '경상남': '055', '경남': '055', '제주': '064'}
GWANGJU = {'동구', '서구', '남구', '북구', '광산구'}


def tel_of(raw, addr):
    """'027627201' → '02-762-7201', 지역번호 없는 '36728441' → 주소 시도의 지역번호를 붙여 '02-3672-8441'(전화 버튼이 걸리게)."""
    d = re.sub(r'\D', '', raw or '')
    if not d:
        return None
    if not d.startswith(('0', '1')) and 7 <= len(d) <= 8:
        a = (addr or '').split()
        sido = a[0] if a else ''
        if sido.startswith('전남광주'):  # 2026 통합: 옛 광주 5개 구만 062
            code = '062' if len(a) > 1 and a[1] in GWANGJU else '061'
        else:
            code = next((v for k, v in AREA.items() if sido.startswith(k)), None)
        if not code:
            return raw
        d = code + d
    if d.startswith('02'):
        return f'02-{d[2:-4]}-{d[-4:]}' if 9 <= len(d) <= 10 else raw
    if d.startswith('050') and len(d) == 12:  # 0507 안심번호
        return f'{d[:4]}-{d[4:8]}-{d[8:]}'
    if d.startswith(('15', '16', '18')) and len(d) == 8:
        return f'{d[:4]}-{d[4:]}'
    if d.startswith('0') and 10 <= len(d) <= 11:
        return f'{d[:3]}-{d[3:-4]}-{d[-4:]}'
    return raw


def norm(s):
    return re.sub(r'[\s()·.,\-]', '', s or '')


def road_key(addr):
    """'서울특별시 종로구 사직로8길 4, 301동 (사직동)' → '종로구 사직로8길 4' (시도 이름 표기가 달라도 맞도록 시도는 뺌)."""
    a = re.sub(r'\(.*?\)', '', addr or '').split(',')[0].split()
    return ' '.join(a[1:4])


def sub_of(kind, name):
    if kind == 'hospital':
        return '24시' if H24.search(name) else '동물메디컬센터' if re.search(r'메디컬|의료센터|센터', name) else '동물병원'
    if kind == 'pharmacy':
        return '동물약국' if '동물' in name else '약국'
    if kind == 'cafe':
        return ('고양이 카페' if re.search(r'고양이|캣|cat|냥', name, re.I) else '애견 카페' if re.search(r'애견|강아지|도그|dog|멍|펫', name, re.I)
                else '동물 체험')
    if kind == 'hotel':
        return '유치원' if re.search(r'유치원|스쿨|school|놀이', name, re.I) else '펫호텔'
    return None


def rows_of(src):
    kind, prefix = SOURCES[src]
    out = []
    for r in S.localdata_rows(src):
        if r.get('영업상태명') != '영업/정상':
            continue
        name, mid = txt(r.get('사업장명')), txt(r.get('관리번호'))
        if not name or not mid:
            continue
        lat, lon = xy(r)
        p = S.base(kind, mid, name, txt(r.get('도로명주소')), txt(r.get('지번주소')), lat, lon, tel_of(txt(r.get('전화번호')), txt(r.get('도로명주소')) or txt(r.get('지번주소'))), None, ymd(r.get('최종수정시점')))
        p['id'] = f"{prefix}-{re.sub(r'[^0-9A-Za-z]', '', mid)[:24]}"
        p['sub'], p['since'] = sub_of(kind, name), ymd(r.get('인허가일자'))
        if kind == 'hospital':
            p['tags'] = [t for t, ok in (('24시', p['sub'] == '24시'), ('응급', '응급' in name), ('야간', '야간' in name)) if ok]
        out.append(p)
    log(f'  {src}: 영업 중 {len(out):,}곳')
    return out


def dist(a, b):
    return math.hypot(a['lat'] - b['lat'], (a['lon'] - b['lon']) * 0.8) * 111.0


def attach_hours(items):
    """동물약국을 약국 사이트 데이터(요일별 영업 시간)와 맞춤: 이름+도로명주소, 없으면 같은 이름 150m 안."""
    if not PHARMACIES.exists():
        log('약국 데이터 없음 — 동물약국 영업 시간 건너뜀')
        return
    ph = json.loads(PHARMACIES.read_text(encoding='utf-8'))['items']
    by_key, by_name = {}, defaultdict(list)
    for q in ph:
        by_key.setdefault((norm(q['name']), road_key(q.get('address'))), q)
        by_name[norm(q['name'])].append(q)
    hit = Counter()
    for p in items:
        if p['kind'] != 'pharmacy':
            continue
        q = by_key.get((norm(p['name']), road_key(p['addr'])))
        if q:
            hit['주소'] += 1
        elif p['lat'] is not None:
            near = [x for x in by_name.get(norm(p['name']), []) if x.get('lat') is not None and dist(p, x) < 0.15]
            q = min(near, key=lambda x: dist(p, x)) if near else None
            hit['거리' if q else '없음'] += 1
        else:
            hit['없음'] += 1
        if q:
            p['hours'], p['ph'] = q.get('hours') or {}, q['id']
            if not p['tel'] and q.get('tel'):
                p['tel'] = tel_of(q['tel'], p['addr'] or p['jibun'])
    log('동물약국 영업 시간 연결', dict(hit))


def merge(items):
    """위탁관리업으로 함께 신고한 동물병원(같은 이름·주소)은 병원 한 곳에 '호텔' 태그로. 같은 이름·주소가 두 번이면 하나만."""
    key = lambda p: (norm(p['name']), norm(p['addr'] or p['jibun'] or ''))
    hosp = {key(p): p for p in items if p['kind'] == 'hospital'}
    out, seen, merged = [], set(), 0
    for p in items:
        if p['kind'] == 'hotel' and key(p) in hosp:
            h = hosp[key(p)]
            if '호텔' not in h['tags']:
                h['tags'].append('호텔')
            merged += 1
            continue
        k = (p['kind'],) + key(p)
        if k in seen:
            merged += 1
            continue
        seen.add(k)
        out.append(p)
    log(f'같은 이름·주소로 합친 곳 {merged:,}')
    return out


def main():
    args = sys.argv[1:]
    now = datetime.now(KST)
    regions = A.weather_regions()
    prev = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else None
    prev_by_id = {p['id']: p for p in prev['items']} if prev else {}
    items, ids = [], set()
    for src in SOURCES:
        for p in rows_of(src):
            if p['id'] not in ids:
                ids.add(p['id'])
                items.append(p)
    items = merge(items)
    for p in items:
        if p['lat'] is None and prev_by_id.get(p['id'], {}).get('lat') is not None:  # 원본에 좌표가 없어 카카오로 받았던 곳
            q = prev_by_id[p['id']]
            p['lat'], p['lon'], p['geo_at'] = q['lat'], q['lon'], q.get('geo_at') or ''
    kakao = os.environ.get('KAKAO_REST_KEY', '').strip()
    if kakao:
        K.geocode(items, kakao)
    attach_hours(items)
    placed = K.place(items, regions)
    items = [compact(p) for p in placed]
    for p in items:
        if not p['hours']:
            p.pop('hours')  # 영업 시간은 동물약국 중 약국 데이터와 맞춘 곳만
    items.sort(key=lambda p: (p['region'], p['kind'], p['name'], p['id']))
    if prev and len(items) < len(prev['items']) * 0.9 and '--force' not in args:
        raise SystemExit(f"반려동물 장소 수가 {len(prev['items']):,} → {len(items):,}로 10% 넘게 줄어 중단합니다 (--force로 무시)")
    log('24시(이름 기준) 예', [p['name'] for p in items if p.get('sub') == '24시'][:40])
    if prev and prev['items'] == items:
        log('변경 없음')
        return
    kinds = Counter(p['kind'] for p in items)
    status = {'updated_at': now.isoformat(timespec='seconds'), 'count': len(items), 'kinds': dict(kinds),
              'h24': sum(1 for p in items if p.get('sub') == '24시'), 'with_hours': sum(1 for p in items if p.get('hours')),
              'with_coords': sum(1 for p in items if p.get('lat') is not None), 'new': sum(1 for p in items if prev and p['id'] not in prev_by_id),
              'removed': len(set(prev_by_id) - {p['id'] for p in items}) if prev else 0}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'status': status, 'items': items}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    log(f"반려동물 {len(items):,}곳 {dict(kinds)} · 24시 {status['h24']:,} · 영업 시간 {status['with_hours']:,} · 좌표 {status['with_coords']:,}"
        f" · 지역 {len({p['region'] for p in items})} · 파일 {OUT.stat().st_size / 1e6:.1f}MB")
    log('세부', Counter((p['kind'], p.get('sub')) for p in items).most_common())


if __name__ == '__main__':
    main()
