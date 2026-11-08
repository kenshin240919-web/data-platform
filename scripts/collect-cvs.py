"""Collect convenience stores that sell 안전상비의약품 for cvs.guidejung.com (내근처 편의점) → apps/cvs/data/stores.json.

Source: 지방행정 인허가데이터(LOCALDATA) '건강_안전상비의약품 판매업소' file (over_the_counter_medicine_stores, no application
needed). 약사법 제44조의2: 안전상비의약품을 약국 밖에서 팔려면 시장·군수·구청장에게 등록해야 하고, 등록하려면 24시간 연중 무휴
점포를 갖춰야 한다 — so this list is "편의점·마트 where you can buy 상비약, open around the clock by registration rule".
Only 영업/정상 rows. Coordinates are EPSG:5174 → WGS84 (collect-rest.py tm5174); rows without coordinates keep the previous
run's or get them from Kakao (KAKAO_REST_KEY, optional, 30-day refresh). Region codes are the weather site's 시군구 codes.

Facts that differ per store page (Google skips near-identical template pages), computed here from sister-site files:
- ph: the nearest pharmacy (apps/pharmacy/data/pharmacies.json) with its usual weekday closing time and Sunday opening,
  ph_n: pharmacies within 1km, ph_late: the nearest pharmacy open to 22시 or later on weekdays (3km)
- er: the nearest 응급실 (apps/hospital/data/summary.json), n500: other 상비약 stores within 500m
Usage: [KAKAO_REST_KEY=...] python scripts/collect-cvs.py [--force]
"""
import importlib.util, json, os, re, sys, bisect
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('rest', ROOT / 'scripts/collect-rest.py')
R = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(R)
S, K, A = R.S, R.K, R.A
KST, log, txt, compact = S.KST, S.log, S.txt, S.compact
OUT = ROOT / 'apps/cvs/data/stores.json'
PHARMACY = ROOT / 'apps/pharmacy/data/pharmacies.json'
HOSPITAL = ROOT / 'apps/hospital/data/summary.json'
SRC = 'over_the_counter_medicine_stores'

# 상호로 브랜드 판단(띄어쓰기·대소문자 무시). 'CU'는 영어 낱말 속(CUBE 등)에 걸리지 않게 앞뒤가 영문이 아닐 때만.
# 이름은 띄어쓰기·괄호를 지운 소문자로 봄('지에스(GS)25 경희궁자이' → '지에스gs25경희궁자이'). CU 운영사는 BGF리테일.
BRANDS = [
    ('gs25', re.compile(r'gs25|지에스25|^gs(?=[가-힣])|^지에스(?:gs|리테일|(?=[가-힣]{2,}점))|gs편의점|gs리테일')),
    ('cu', re.compile(r'(?<![a-z])cu(?![a-z])|씨유|비지에프|bgf')),
    ('seven', re.compile(r'[세쎄]븐일레븐|7-?eleven|7-11|711|7일레븐|코리아세븐|롯데씨브이에스')),
    ('emart24', re.compile(r'(?:이|e)마트24|emart24|위드미')),
    ('ministop', re.compile(r'미니스톱|ministop')),
]


def brand_of(name):
    n = re.sub(r'[\s()（）\[\]·.]', '', name).lower()
    return next((b for b, rx in BRANDS if rx.search(n)), 'other')


def ymd(v):
    s = re.sub(r'\D', '', v or '')
    return f'{s[:4]}-{s[4:6]}-{s[6:8]}' if len(s) >= 8 else None


def rows(rows_):
    out, skip = [], Counter()
    for r in rows_:
        if r.get('영업상태명') != '영업/정상':
            continue
        name, mid = txt(r.get('사업장명')), txt(r.get('관리번호'))
        if not name or not mid:
            skip['이름·관리번호 없음'] += 1
            continue
        lat, lon = R.xy(r)
        p = S.base('cvs', mid, name, txt(r.get('도로명주소')), txt(r.get('지번주소')), lat, lon, S.txt(r.get('전화번호')), None, ymd(r.get('최종수정시점')))
        p['id'] = 'c-' + re.sub(r'[^0-9A-Za-z]', '', mid).removeprefix('PHMH')  # 관리번호 전체(자르면 끝자리만 다른 곳이 겹침)
        p['brand'] = brand_of(name)
        p['since'] = ymd(r.get('인허가일자'))
        try:
            area = float(r.get('판매점영업면적') or 0)
            p['area'] = round(area) if 3 <= area <= 3000 else None
        except ValueError:
            p['area'] = None
        p['tel'] = tel_of(p['tel'])
        p.pop('ref', None)
        out.append(p)
    log(f'영업 중 {len(out):,}곳', Counter(p['brand'] for p in out), dict(skip))
    return out


def tel_of(t):
    """'027390777' → '02-739-0777' (지역번호가 빠진 7·8자리는 그대로 두지 않고 버림 — 어느 지역인지 모름)."""
    d = re.sub(r'\D', '', t or '')
    if not d or len(d) < 9:
        return None
    if d.startswith('02'):
        return f'02-{d[2:-4]}-{d[-4:]}'
    if d.startswith(('15', '16', '18')) and len(d) == 8:
        return f'{d[:4]}-{d[4:]}'
    return f'{d[:3]}-{d[3:-4]}-{d[-4:]}'


def enrich(items, pharmacies, ers):
    m10 = lambda d: int(round(d, -1))
    ph = [p for p in pharmacies if p.get('lat') is not None]
    gp = A.grid(ph)
    late = [p for p in ph if (p.get('wk_close') or 0) >= 2200]
    gl = A.grid(late)
    geo = [p for p in items if p.get('lat') is not None]
    gs = A.grid(geo)
    ers = sorted(ers, key=lambda e: e['lat'])
    er_lat = [e['lat'] for e in ers]
    for p in geo:
        near = sorted(A.within(gp, p['lat'], p['lon'], 3000), key=lambda e: e[0])
        p['ph_n'] = sum(d <= 1000 for d, _ in near)
        if near:
            d, b = near[0]
            p['ph'] = {'id': b['id'], 'name': b['name'], 'm': m10(d), 'close': b.get('wk_close'), 'sun': '7' in (b.get('hours') or {})}
        lt = min(A.within(gl, p['lat'], p['lon'], 3000), key=lambda e: e[0], default=None)
        if lt and (not near or lt[1] is not near[0][1]):
            p['ph_late'] = {'id': lt[1]['id'], 'name': lt[1]['name'], 'm': m10(lt[0]), 'close': lt[1]['wk_close']}
        p['n500'] = sum(1 for d, b in A.within(gs, p['lat'], p['lon'], 500) if b is not p)
        lo, hi = bisect.bisect_left(er_lat, p['lat'] - 0.5), bisect.bisect_right(er_lat, p['lat'] + 0.5)
        best = min(((A.meters(p['lat'], p['lon'], e['lat'], e['lon']), e) for e in ers[lo:hi]), key=lambda e: e[0], default=None)
        if best:
            p['er'] = {'id': best[1]['id'], 'name': best[1]['name'], 'm': m10(best[0])}


def stage_of(items):
    """Sitemap stage: 1 = 전화번호가 있거나 1km 안에 약국이 없는 곳(상세 내용이 가장 다름), 2 = 나머지.
    SITEMAP_STAGE in the Worker decides how far /sitemap-stores-{n}.xml goes (Google crawls a new site slowly)."""
    for p in items:
        p['stage'] = 1 if p.get('tel') or (p.get('lat') is not None and not p.get('ph_n')) else 2


def region_stats(items):
    """시군구별: 브랜드별 수, 1km 안에 약국이 없는 곳 수, 가장 가까운 약국까지 거리 중앙값(m)."""
    by = defaultdict(list)
    for p in items:
        by[p['region']].append(p)
    out = {}
    for code, ps in by.items():
        ds = sorted(p['ph']['m'] for p in ps if p.get('ph'))
        out[code] = {'brands': dict(Counter(p['brand'] for p in ps)), 'no_ph': sum(1 for p in ps if p.get('lat') is not None and not p.get('ph_n')),
                     'ph_mid': ds[len(ds) // 2] if ds else None}
    return out


def main():
    args = sys.argv[1:]
    now = datetime.now(KST)
    regions = A.weather_regions()
    prev = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else None
    prev_by_id = {p['id']: p for p in prev['items']} if prev else {}
    items = rows(S.localdata_rows(SRC))
    seen, uniq = set(), []
    for p in items:
        if p['id'] not in seen:
            seen.add(p['id'])
            uniq.append(p)
    items = uniq
    for p in items:
        if p['lat'] is None and prev_by_id.get(p['id'], {}).get('lat') is not None:  # 원본에 좌표가 없어 카카오로 받았던 곳
            q = prev_by_id[p['id']]
            p['lat'], p['lon'], p['geo_at'] = q['lat'], q['lon'], q.get('geo_at') or ''
    kakao = os.environ.get('KAKAO_REST_KEY', '').strip()
    if kakao:
        K.geocode(items, kakao)
    items = K.place(items, regions)
    for p in items:
        for k in ('hours', 'fee', 'off', 'org', 'sub', 'tags', 'kind'):
            p.pop(k, None)
    for p in items:  # "세종 세종시" → "세종시" (약국 사이트와 같은 이름)
        sido, _, rest = p['region_name'].partition(' ')
        if sido == '세종' and rest:
            p['region_name'] = rest
    pharm = json.loads(PHARMACY.read_text(encoding='utf-8'))['items'] if PHARMACY.exists() else []
    ers = [e for r in json.loads(HOSPITAL.read_text(encoding='utf-8'))['regions'] for e in r['er'] if e.get('lat') is not None] if HOSPITAL.exists() else []
    log(f'약국 {len(pharm):,}곳 · 응급실 {len(ers):,}곳으로 주변 정보 계산')
    enrich(items, pharm, ers)
    stage_of(items)
    items = [compact(p) for p in items]
    for p in items:
        p.pop('tags', None)
        p.pop('hours', None)
    items.sort(key=lambda p: (p['region'], p['brand'], p['name'], p['id']))
    if prev and len(items) < len(prev['items']) * 0.9 and '--force' not in args:
        raise SystemExit(f"상비약 편의점 수가 {len(prev['items']):,} → {len(items):,}로 10% 넘게 줄어 중단합니다 (--force로 무시)")
    stats = region_stats(items)
    if prev and prev['items'] == items:
        log('변경 없음')
        return
    brands = Counter(p['brand'] for p in items)
    status = {'updated_at': now.isoformat(timespec='seconds'), 'count': len(items), 'brands': dict(brands),
              'with_coords': sum(1 for p in items if p.get('lat') is not None), 'with_tel': sum(1 for p in items if p.get('tel')),
              'no_ph': sum(1 for p in items if p.get('lat') is not None and not p.get('ph_n')),
              'stage1': sum(1 for p in items if p.get('stage') == 1),
              'new': sum(1 for p in items if prev and p['id'] not in prev_by_id),
              'removed': len(set(prev_by_id) - {p['id'] for p in items}) if prev else 0}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'status': status, 'stats': stats, 'items': items}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    log(f"상비약 편의점 {len(items):,}곳 {dict(brands)} · 좌표 {status['with_coords']:,} · 전화 {status['with_tel']:,} · "
        f"1km 안 약국 없음 {status['no_ph']:,} · 지역 {len(stats)} · 파일 {OUT.stat().st_size / 1e6:.1f}MB")
    log('기타 상호 예', [p['name'] for p in items if p['brand'] == 'other'][:60])


if __name__ == '__main__':
    main()
