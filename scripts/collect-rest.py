"""Collect registered rest places for rest.guidejung.com (내근처 휴식): 찜질방·사우나·목욕탕, 1인·프라이빗 목욕·세신,
안마원·안마시술소, 피부관리실 — merged into one list that ships with the site (apps/rest/data/places.json, like service).

Sources (지방행정 인허가데이터 LOCALDATA files, no application needed; reports/rest-설계안-2026-10-25.md 2장):
- public_baths                 목욕장업 ~17,900 rows (영업 ~5,700)  업태: 공동탕업·찜질시설·한증막·목욕장업 기타·관광호텔
- medical_related_businesses   의료유사업 ~3,400 rows (영업 ~1,200)  업태: 안마원·안마시술소 (침술·접골 등은 뺌)
- beauty_salons                미용업 ~460,000 rows → 업태에 '피부'가 든 곳(피부미용업)만, 이름에 '세신'·'스크럽'이 든 곳은 1인·세신으로
Only 영업/정상 rows. Coordinates are EPSG:5174 (Bessel 중부원점 TM) → WGS84 here (no pyproj); rows without coordinates
keep the previous run's or get them from Kakao (KAKAO_REST_KEY, optional, 30-day refresh — collect-parking.py geocode()).
Names with suggestive words are dropped (BLOCK, reviewed by a person; AdSense policy), and '1인' is allowed only for baths.
Region codes are the weather site's 시군구 codes (collect-parking.py place()).
Usage: [KAKAO_REST_KEY=...] python scripts/collect-rest.py [--force]
"""
import importlib.util, json, math, os, re, sys
from collections import Counter
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('service', ROOT / 'scripts/collect-service.py')
S = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(S)
K, A = S.K, S.A
KST, log, txt, coord, compact = S.KST, S.log, S.txt, S.coord, S.compact
OUT = ROOT / 'apps/rest/data/places.json'
PREFIX = {'public_baths': 'b', 'medical_related_businesses': 'm', 'beauty_salons': 'k'}

# 선정적이거나 성인 업소를 떠올리게 하는 이름(설계안 4장). 들어 있으면 목록에서 뺀다 — 사람이 로그를 보고 고친다.
BLOCK = re.compile(r'스웨디시|swedish|건마|슈얼|출장|홈타이|1인샵|남성\s*전용|여성\s*전용|남성\s*전문|커플|아가씨|섹시|sexy|19금|성인|키스|vip\s*룸|힐링\s*타이|타이\s*마사지|마사지\s*룸', re.I)
# 목욕장업 '기타' 중 1인·프라이빗이 아닌 곳(호텔·헬스장·복지관 등의 부대 목욕시설) — 찜질방·사우나로 둔다.
NOT_PRIVATE = re.compile(r'호텔|모텔|리조트|콘도|피트니스|휘트니스|헬스|스포츠|체육|골프|수영|레저|클럽|복지|요양|병원|학교|대학|기숙|생활관|아파트|문화센터|청소년|노인|군인|부대|공단|공사|교회|스테이|펜션|캠핑|온천|대중|목욕탕|사우나|찜질|한증')
PRIVATE_NAME = re.compile(r'1인|프라이빗|private|솔로|solo|세신|스크럽|scrub|독채|개인\s*탕|프라이빗')


def tm5174(x, y):
    """EPSG:5174 (Bessel 1841, TM lat0 38 lon0 127.0028902777778 k0 1, FE 200000 FN 500000,
    towgs84 -115.80,474.99,674.11,1.16,-2.31,-1.63,6.43 position-vector) → WGS84 (lat, lon)."""
    a, f = 6377397.155, 1 / 299.1528128
    e2 = 2 * f - f * f
    k0, lat0, lon0, fe, fn = 1.0, math.radians(38), math.radians(127.0028902777778), 200000.0, 500000.0
    c0 = 1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256

    def meridian(phi):
        return a * (c0 * phi - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * math.sin(2 * phi)
                    + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * math.sin(4 * phi) - (35 * e2 ** 3 / 3072) * math.sin(6 * phi))
    mu = (meridian(lat0) + (y - fn) / k0) / (a * c0)
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
    nn = a / math.sqrt(1 - e2 * math.sin(lat) ** 2)
    X, Y, Z = nn * math.cos(lat) * math.cos(lon), nn * math.cos(lat) * math.sin(lon), nn * (1 - e2) * math.sin(lat)
    sec = math.pi / 180 / 3600
    rx, ry, rz, m = 1.16 * sec, -2.31 * sec, -1.63 * sec, 1 + 6.43e-6
    X, Y, Z = (-115.80 + m * (X - rz * Y + ry * Z), 474.99 + m * (rz * X + Y - rx * Z), 674.11 + m * (-ry * X + rx * Y + Z))
    A_, F = 6378137.0, 1 / 298.257223563
    E2 = 2 * F - F * F
    p = math.hypot(X, Y)
    la = math.atan2(Z, p * (1 - E2))
    for _ in range(6):
        N = A_ / math.sqrt(1 - E2 * math.sin(la) ** 2)
        la = math.atan2(Z + E2 * N * math.sin(la), p)
    return round(math.degrees(la), 6), round(math.degrees(math.atan2(Y, X)), 6)


def xy(r):
    try:
        x, y = float(r.get('좌표정보(X)') or ''), float(r.get('좌표정보(Y)') or '')
    except ValueError:
        return None, None
    return coord(*tm5174(x, y)) if x > 0 and y > 0 else (None, None)


def ymd(v):
    s = re.sub(r'\D', '', v or '')
    return f'{s[:4]}-{s[4:6]}-{s[6:8]}' if len(s) >= 8 else None


def kind_of(src, r, name):
    up = ' '.join(x for x in (r.get('업태구분명'), r.get('위생업태명')) if x)
    if src == 'public_baths':
        if PRIVATE_NAME.search(name) or ('기타' in up and not NOT_PRIVATE.search(name)):
            return 'private', '1인·프라이빗'
        sub = ('찜질방' if '찜질' in up and '공동탕' not in up else '목욕탕·찜질방' if '찜질' in up else '한증막' if '한증' in up
               else '호텔 사우나' if '호텔' in up else '목욕탕' if '공동탕' in up else '사우나')
        return 'sauna', sub
    if src == 'medical_related_businesses':
        return ('anma', '안마시술소' if '시술소' in up else '안마원') if '안마' in up else (None, None)
    if re.search(r'세신|스크럽|scrub', name, re.I):
        return 'private', '세신샵'
    if '피부' not in up:
        return None, None
    sub = ('왁싱' if re.search(r'왁싱|wax', name, re.I) else '속눈썹·눈썹' if re.search(r'속눈썹|래쉬|lash|브로우|brow|눈썹', name, re.I)
           else '반영구' if '반영구' in name else '피부관리')
    return 'skin', sub


def rows_of(src, skipped, seen):
    out = []
    for r in S.localdata_rows(src):
        if r.get('영업상태명') != '영업/정상':
            continue
        name, mid = txt(r.get('사업장명')), txt(r.get('관리번호'))
        if not name or not mid:
            continue
        kind, sub = kind_of(src, r, name)
        if not kind:
            continue
        if BLOCK.search(name) or (kind in ('anma', 'skin') and '1인' in name):
            skipped[f'{kind} 이름 제외'] += 1
            seen.append(f'{kind}:{name}')
            continue
        lat, lon = xy(r)
        p = S.base(kind, mid, name, txt(r.get('도로명주소')), txt(r.get('지번주소')), lat, lon, txt(r.get('전화번호')), None, ymd(r.get('최종수정시점')))
        p['id'] = f"{PREFIX[src]}-{re.sub(r'[^0-9A-Za-z]', '', mid)[:24]}"  # 종류 판단을 바꿔도 주소가 그대로이도록 출처 기준
        p['sub'], p['since'] = sub, ymd(r.get('인허가일자'))
        p['src'] = src
        p['tags'] = [t for t in (('발한실' if (r.get('발한실여부') or '').upper() == 'Y' else None),) if t]
        out.append(p)
    log(f'  {src}: 영업 중 대상 {len(out):,}곳', Counter(p['kind'] for p in out))
    return out


def merge(items):
    """같은 이름·주소가 목욕장업과 미용업에 함께 신고된 곳(예: 시수하우스)은 한 곳으로 — 목욕장업 쪽(1인·프라이빗)을 남김."""
    key = lambda p: (re.sub(r'\s+', '', p['name']), re.sub(r'\s+', '', p['addr'] or p['jibun'] or ''))
    order = {'private': 0, 'sauna': 1, 'anma': 2, 'skin': 3}
    best = {}
    for p in sorted(items, key=lambda p: (order[p['kind']], p['src'] != 'public_baths')):
        best.setdefault(key(p), p)
    log(f'같은 이름·주소로 합친 곳 {len(items) - len(best):,}')
    return list(best.values())


def main():
    args = sys.argv[1:]
    now = datetime.now(KST)
    regions = A.weather_regions()
    prev = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else None
    prev_by_id = {p['id']: p for p in prev['items']} if prev else {}
    skipped, blocked = Counter(), []
    items = []
    for src in ('public_baths', 'medical_related_businesses', 'beauty_salons'):
        items += rows_of(src, skipped, blocked)
    seen, uniq = set(), []
    for p in items:  # 같은 관리번호가 두 번 나오면 하나만
        if p['id'] not in seen:
            seen.add(p['id'])
            uniq.append(p)
    items = merge(uniq)
    for p in items:
        if p['lat'] is None and prev_by_id.get(p['id'], {}).get('lat') is not None:  # 원본에 좌표가 없어 카카오로 받았던 곳
            q = prev_by_id[p['id']]
            p['lat'], p['lon'], p['geo_at'] = q['lat'], q['lon'], q.get('geo_at') or ''
    kakao = os.environ.get('KAKAO_REST_KEY', '').strip()
    if kakao:
        K.geocode(items, kakao)
    for p in items:
        p.pop('src', None)
    # 좌표 변환 확인: 주소로 정한 시군구와 좌표로 가장 가까운 시군구 중심이 같은 비율(같은 시도 기준).
    placed = K.place(items, regions)
    chk = [p for p in placed if p['lat'] is not None and 'geo_at' not in p][:3000]
    near = lambda p: min(regions, key=lambda r: (r['lat'] - p['lat']) ** 2 + ((r['lon'] - p['lon']) * 0.8) ** 2)['code'][:2]
    same = sum(1 for p in chk if near(p) == p['region'][:2])
    log(f'좌표 확인: 주소 시도와 좌표 시도가 같은 곳 {same:,}/{len(chk):,}')
    items = [compact(p) for p in placed]
    items.sort(key=lambda p: (p['region'], p['kind'], p['name'], p['id']))
    if prev and len(items) < len(prev['items']) * 0.9 and '--force' not in args:
        raise SystemExit(f"휴식 업소 수가 {len(prev['items']):,} → {len(items):,}로 10% 넘게 줄어 중단합니다 (--force로 무시)")
    log('이름으로 뺀 곳', dict(skipped), '예:', blocked[:40])
    priv = [p for p in items if p['kind'] == 'private']
    log('1인·프라이빗', len(priv), [(p['name'], p.get('sub')) for p in priv[:80]])
    log('목욕장업 기타 중 찜질방·사우나로 둔 곳(이름 예)', [p['name'] for p in items if p['kind'] == 'sauna' and p.get('sub') == '사우나'][:60])
    if prev and prev['items'] == items:
        log('변경 없음')
        return
    kinds = Counter(p['kind'] for p in items)
    status = {'updated_at': now.isoformat(timespec='seconds'), 'count': len(items), 'kinds': dict(kinds),
              'with_coords': sum(1 for p in items if p.get('lat') is not None), 'new': sum(1 for p in items if prev and p['id'] not in prev_by_id),
              'removed': len(set(prev_by_id) - {p['id'] for p in items}) if prev else 0}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'status': status, 'items': items}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    log(f"휴식 {len(items):,}곳 {dict(kinds)} · 좌표 {status['with_coords']:,} · 지역 {len({p['region'] for p in items})} · 파일 {OUT.stat().st_size / 1e6:.1f}MB")
    log('세부', Counter((p['kind'], p.get('sub')) for p in items).most_common())


if __name__ == '__main__':
    main()
