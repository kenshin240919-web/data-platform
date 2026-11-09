"""Collect movie theaters for movie.guidejung.com (내근처 영화관) → apps/movie/data/theaters.json.

Source: 지방행정 인허가데이터(LOCALDATA) '문화_영화상영관' file (movie_theaters, no application needed). One row is one
상영관(screen), so rows are grouped into a theater by the road address up to the building number plus the chain (CGV·롯데
시네마·메가박스·씨네Q) — or the cleaned name for independent theaters, so two small theaters in one building stay apart.
Only 영업/정상 rows. Coordinates are EPSG:5174 → WGS84 (collect-rest.py); rows without any keep the previous run's or get
them from Kakao (KAKAO_REST_KEY, optional, 30-day refresh). Region codes are the weather site's 시군구 codes.

Box office · film facts (KOBIS) are NOT stored here: KOBIS 오픈API 약관 제6조 ② allows real-time use only — the Worker
fetches them per visit. Showtimes · seats come live from the aka.page relay, also never stored.

Per-theater facts (differ page to page): screens, special screens (IMAX·4DX…), nearest public parking (apps/parking),
other theaters within 5km, the theater's opening year.
Usage: [KAKAO_REST_KEY=...] python scripts/collect-movie.py [--force]
"""
import hashlib, importlib.util, json, os, re, sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('rest', ROOT / 'scripts/collect-rest.py')
R = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(R)
S, K, A = R.S, R.K, R.A
KST, log, txt, compact = S.KST, S.log, S.txt, S.compact
OUT = ROOT / 'apps/movie/data/theaters.json'
PARKING = ROOT / 'apps/parking/data/parkings.json'
SRC = 'movie_theaters'

CHAINS = [('cgv', re.compile(r'cgv|씨지브이')), ('lotte', re.compile(r'롯데시네마|롯데컬처웍스|lottecinema')),
          ('mega', re.compile(r'메가박스|megabox')), ('cineq', re.compile(r'씨네q|cineq'))]
LABEL = {'cgv': 'CGV', 'lotte': '롯데시네마', 'mega': '메가박스', 'cineq': '씨네Q'}
# 특별관: 이름에 나온 것만(본사 공식 목록이 아님).
SPECIAL = [('IMAX', r'imax|아이맥스'), ('4DX', r'4dx'), ('SCREENX', r'screenx|스크린x'), ('돌비', r'dolby|돌비'),
           ('수퍼플렉스', r'수퍼플렉스|superplex'), ('샤롯데', r'샤롯데|charlotte'), ('골드클래스', r'골드클래스|gold ?class'),
           ('템퍼시네마', r'tempur|템퍼'), ('리클라이너', r'리클라이너|recliner'), ('컴포트', r'comfort|컴포트'),
           ('부티크', r'부티크|boutique'), ('스위트', r'suite|스위트'), ('키즈', r'kids|키즈'), ('씨네앤포레', r'cine ?& ?foret|씨네앤포레')]
HALL = re.compile(r'\s*[\(<\[].*?[\)>\]]|\s*-?\s*(?:imax|4dx|screenx|dolby|돌비\S*|tempur\S*|cdc\S*|premium|comfort|컴포트|샤롯데|'
                  r'골드클래스|수퍼플렉스\S*|리클라이너|스위트|suite|씨네앤포레|키즈)\S*\s*관?|\s*(?:제\s*)?\d+\s*(?:관|상영관)?$', re.I)


def chain_of(name):
    n = re.sub(r'\s', '', name).lower()
    return next((c for c, rx in CHAINS if rx.search(n)), None)


def clean(name, chain=None):
    """'CGV센텀시티 4DX관' → '센텀시티', '메가박스 전주객사점' → '전주객사', '낭만극장' → '낭만극장'."""
    n = re.sub(r'\(주\)|㈜|주식회사', '', name)
    for _ in range(3):
        n = HALL.sub('', n).strip()
    n = re.sub(r'\s*\d+(호)?$', '', re.sub(r'[<>]', ' ', n)).strip()
    if chain:
        n = re.sub(r'(?i)cgv|씨지브이|롯데컬처웍스|롯데시네마|메가박스중앙|메가박스|씨네q|cineq|아트하우스', '', n)
        n = re.sub(r'\s*(?:지점|점)(?=\s|$).*$', '', n.strip(' -_')).strip(' -_')
        n = re.sub(r'\s*\d+(호)?$', '', n).strip()
    return re.sub(r'\s+', ' ', n).strip()


def addr_key(r):
    a = re.split(r',|\s\(', txt(r.get('도로명주소')) or '')[0].strip()
    return a or ' '.join((txt(r.get('지번주소')) or '').split()[:4])


def ymd(v):
    s = re.sub(r'\D', '', v or '')
    return f'{s[:4]}-{s[4:6]}-{s[6:8]}' if len(s) >= 8 else None


def tel_of(t):
    d = re.sub(r'\D', '', t or '')
    if not d or len(d) < 8:
        return None
    if d.startswith(('15', '16', '18')) and len(d) == 8:
        return f'{d[:4]}-{d[4:]}'
    if len(d) < 9:
        return None
    if d.startswith('02'):
        return f'02-{d[2:-4]}-{d[-4:]}'
    return f'{d[:3]}-{d[3:-4]}-{d[-4:]}'


def theaters(rows_):
    groups = defaultdict(list)
    for r in rows_:
        if r.get('영업상태명') != '영업/정상' or not txt(r.get('사업장명')):
            continue
        name = txt(r.get('사업장명'))
        ch = chain_of(name)
        groups[(addr_key(r), ch or clean(name))].append(r)
    out = []
    for (key, who), rs in groups.items():
        rs.sort(key=lambda r: txt(r.get('관리번호')) or '')
        ch = chain_of(txt(rs[0]['사업장명']))
        places = Counter(c for r in rs if (c := clean(txt(r['사업장명']), ch)))
        place = places.most_common(1)[0][0] if places else ''
        if ch and not place:  # 'CGV 3관'뿐인 곳 → 주소 괄호 속 동 이름('(천호동)' → '천호')
            m = re.search(r'\(([가-힣0-9]+?)(?:동|가|읍|면)?[,)]', txt(rs[0].get('도로명주소')) or '')
            place = m.group(1) if m else (txt(rs[0].get('도로명주소')) or '').split(' ')[1:2][0] if len((txt(rs[0].get('도로명주소')) or '').split(' ')) > 1 else ''
        name = f'{LABEL[ch]} {place}'.strip() if ch else place
        if not name:
            continue
        lat = lon = None
        for r in rs:
            lat, lon = R.xy(r)
            if lat is not None:
                break
        first = rs[0]
        road = txt(first.get('도로명주소'))
        p = S.base('movie', txt(first['관리번호']), name, road, txt(first.get('지번주소')), lat, lon,
                   next((t for r in rs if (t := tel_of(r.get('전화번호')))), None), None, ymd(max(r.get('최종수정시점') or '' for r in rs)))
        # 관리번호는 상영관마다 겹쳐(3,489행에 491개) 극장 열쇠(주소+체인/이름)로 만든 짧은 해시를 주소로 씀
        p['id'] = 'm-' + hashlib.sha1(f'{key}|{who}'.encode()).hexdigest()[:10]
        p['chain'] = ch or 'indie'
        p['screens'] = len(rs)
        all_names = ' '.join(txt(r['사업장명']) for r in rs).lower()
        p['special'] = [k for k, rx in SPECIAL if re.search(rx, all_names)]
        p['drive'] = any(r.get('공연장형태구분명') == '자동차극장' for r in rs) or None
        p['since'] = min((d for r in rs if (d := ymd(r.get('인허가일자')))), default=None)
        p.pop('ref', None)
        out.append(p)
    # 주소 표기만 달라(도로명 없는 줄·지번) 둘로 나뉜 같은 극장: 이름이 같고 500m 안(좌표 없으면 같은 지번 동)이면 하나로
    merged, by_name = [], defaultdict(list)
    for p in sorted(out, key=lambda p: -p['screens']):
        twin = next((q for q in by_name[p['name']] if (p['lat'] is not None and q['lat'] is not None and A.meters(p['lat'], p['lon'], q['lat'], q['lon']) < 500)
                     or ((p['lat'] is None or q['lat'] is None) and (p['jibun'] or p['addr'] or '').split(' ')[:3] == (q['jibun'] or q['addr'] or '').split(' ')[:3])), None)
        if twin:
            twin['screens'] += p['screens']
            twin['special'] = sorted(set(twin['special']) | set(p['special']))
            twin['tel'] = twin['tel'] or p['tel']
            twin['since'] = min(filter(None, [twin['since'], p['since']]), default=None)
            if twin['lat'] is None:
                twin['lat'], twin['lon'] = p['lat'], p['lon']
            continue
        by_name[p['name']].append(p)
        merged.append(p)
    log(f'상영관 → 극장 {len(merged):,}곳(합친 곳 {len(out) - len(merged)})', Counter(p['chain'] for p in merged))
    return merged


def enrich(items, parkings):
    m10 = lambda d: int(round(d, -1))
    pk = [p for p in parkings if p.get('lat') is not None]
    gp = A.grid(pk)
    geo = [p for p in items if p.get('lat') is not None]
    gt = A.grid(geo)
    for p in geo:
        near = sorted(A.within(gp, p['lat'], p['lon'], 500), key=lambda e: e[0])
        if near:
            free = [e for e in near if e[1].get('charge') == '무료']
            d, b = (free or near)[0]
            p['park'] = {'id': b['id'], 'name': b['name'], 'm': m10(d), 'free': b.get('charge') == '무료', 'n': len(near)}
        others = [(d, b) for d, b in A.within(gt, p['lat'], p['lon'], 5000) if b is not p]
        p['n5'] = len(others)
        if others:
            d, b = min(others, key=lambda e: e[0])
            p['near'] = {'id': b['id'], 'name': b['name'], 'm': m10(d)}


def region_stats(items):
    by = defaultdict(list)
    for p in items:
        by[p['region']].append(p)
    return {code: {'chains': dict(Counter(p['chain'] for p in ps)), 'screens': sum(p['screens'] for p in ps)} for code, ps in by.items()}


def main():
    args = sys.argv[1:]
    now = datetime.now(KST)
    regions = A.weather_regions()
    prev = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else None
    prev_by_id = {p['id']: p for p in prev['items']} if prev else {}
    items = theaters(S.localdata_rows(SRC))
    items = list({p['id']: p for p in items}.values())
    for p in items:
        if p['lat'] is None and prev_by_id.get(p['id'], {}).get('lat') is not None:
            q = prev_by_id[p['id']]
            p['lat'], p['lon'], p['geo_at'] = q['lat'], q['lon'], q.get('geo_at') or ''
    kakao = os.environ.get('KAKAO_REST_KEY', '').strip()
    if kakao:
        K.geocode(items, kakao)
    items = K.place(items, regions)
    for p in items:
        for k in ('hours', 'fee', 'off', 'org', 'sub', 'tags', 'kind'):
            p.pop(k, None)
        sido, _, rest = p['region_name'].partition(' ')
        if sido == '세종' and rest:
            p['region_name'] = rest
    parkings = json.loads(PARKING.read_text(encoding='utf-8'))['items'] if PARKING.exists() else []
    enrich(items, parkings)
    items = [compact(p) for p in items]
    for p in items:
        p.pop('tags', None)
        p.pop('hours', None)
    items.sort(key=lambda p: (p['region'], p['chain'], p['name'], p['id']))
    if prev and len(items) < len(prev['items']) * 0.9 and '--force' not in args:
        raise SystemExit(f"극장 수가 {len(prev['items']):,} → {len(items):,}로 10% 넘게 줄어 중단합니다 (--force로 무시)")
    if prev and prev['items'] == items:
        log('변경 없음')
        return
    chains = Counter(p['chain'] for p in items)
    status = {'updated_at': now.isoformat(timespec='seconds'), 'count': len(items), 'chains': dict(chains),
              'screens': sum(p['screens'] for p in items), 'with_coords': sum(1 for p in items if p.get('lat') is not None),
              'with_tel': sum(1 for p in items if p.get('tel')), 'drive': sum(1 for p in items if p.get('drive')),
              'new': sum(1 for p in items if prev and p['id'] not in prev_by_id),
              'removed': len(set(prev_by_id) - {p['id'] for p in items}) if prev else 0}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'status': status, 'stats': region_stats(items), 'items': items}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    log(f"극장 {len(items):,}곳 {dict(chains)} · 상영관 {status['screens']:,} · 좌표 {status['with_coords']:,} · 전화 {status['with_tel']:,} · "
        f"파일 {OUT.stat().st_size / 1e6:.2f}MB")


if __name__ == '__main__':
    main()
