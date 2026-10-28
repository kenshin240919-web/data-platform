"""Collect car service places for service.guidejung.com (내근처 서비스센터): repair shops, inspection stations, car washes
and emission-repair businesses, merged into one list (apps/parking-style: apps/service/data/centers.json ships with the site).

Sources (10/23 samples, reports/service-설계안-2026-10-23.md 2-2):
- 전국자동차정비업체표준데이터  api.data.go.kr tn_pubr_public_auto_maintenance_company_api (DATA_GO_KR_KEY) ~36,000 rows, WGS84
- 전국자동차검사소표준데이터    api.data.go.kr tn_pubr_public_car_inspofc_api (DATA_GO_KR_KEY) ~830, WGS84, hours, check types
- 세차장정보 (LOCALDATA file)    file.localdata.go.kr/file/download/car_wash_info/info  CSV cp949 ~16,000, WGS84
- 배출가스전문정비·확인검사대행자 file.localdata.go.kr/file/download/emission_inspection_agencies/info  CSV, TM coords → Kakao by address
LOCALDATA files need a browser User-Agent and the info page as Referer (403 otherwise) and sometimes drop the connection.
Region codes are the weather site's 시군구 codes (scripts/collect-parking.py place()). Closed / suspended businesses are dropped.
Lots without usable coordinates keep the previous run's coordinates or get them from Kakao (KAKAO_REST_KEY, optional).
Usage: DATA_GO_KR_KEY=... [KAKAO_REST_KEY=...] python scripts/collect-service.py [--force]
"""
import bisect, csv, hashlib, importlib.util, io, json, os, re, sys, time, urllib.parse, urllib.request
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('parking', ROOT / 'scripts/collect-parking.py')
K = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(K)
A, KST, log, http_json, txt, hhmm = K.A, K.KST, K.log, K.http_json, K.txt, K.hhmm
OUT = ROOT / 'apps/service/data/centers.json'
API = 'https://api.data.go.kr/openapi/'
LOCALDATA = 'https://file.localdata.go.kr/file'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
# 정비업 종류 코드(표준데이터 inspofcType, 앞의 0은 지자체마다 달라 뺌). 건수 순서로 추정(10/23 표본) — 표준 정의서로 확인할 것.
REPAIR_TYPE = {'1': '종합정비', '2': '소형자동차종합정비', '3': '전문정비', '4': '원동기전문정비'}
CHECKS = [('fdrmInspofcYn', '정기·종합검사'), ('exhstGasInspofcYn', '배출가스 정밀'), ('newInspofcYn', '신규'), ('tempInspofcYn', '임시'),
          ('tuningInspofcYn', '튜닝(구조변경)'), ('repairInspofcYn', '수리'), ('taxiMeterYn', '택시미터')]


def api_rows(key, name):
    rows, page, total = [], 1, None
    while total is None or (page - 1) * 1000 < total:
        q = urllib.parse.urlencode({'serviceKey': key, 'pageNo': page, 'numOfRows': 1000, 'type': 'json'})
        st, d = http_json(f'{API}{name}?{q}', timeout=180)
        resp = d.get('response', d) if isinstance(d, dict) else {}
        body = resp.get('body') or {}
        if st != 200 or 'items' not in body:
            raise SystemExit(f'{name} page {page}: {st} {str(d)[:300]}')
        total = int(body['totalCount'])
        items = body['items'] or []
        items = items.get('item', []) if isinstance(items, dict) else items
        rows += [items] if isinstance(items, dict) else items
        page += 1
    log(f'  {name}: {len(rows):,}/{total:,}')
    return rows


def localdata_rows(kind):
    url, ref = f'{LOCALDATA}/download/{kind}/info', f'{LOCALDATA}/{kind}/info'
    for n in range(6):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Referer': ref, 'Accept': 'text/csv,*/*'})
            with urllib.request.urlopen(req, timeout=300) as r:
                raw = r.read()
            if raw[:20].lstrip().startswith(b'<'):
                raise ValueError('HTML instead of CSV')
            text = next(raw.decode(e) for e in ('utf-8-sig', 'cp949') if _decodes(raw, e))
            rows = list(csv.DictReader(io.StringIO(text)))
            log(f'  {kind}: {len(rows):,}행 ({len(raw) / 1e6:.1f}MB)')
            return rows
        except Exception as e:  # connection reset is common: back off and retry
            log(f'  {kind} 시도 {n + 1} 실패: {e}')
            time.sleep(10 * (n + 1))
    raise SystemExit(f'{kind} 파일을 받지 못했습니다')


def _decodes(raw, enc):
    try:
        raw.decode(enc)
        return True
    except UnicodeDecodeError:
        return False


def coord(lat, lon):
    try:
        lat, lon = round(float(lat), 6), round(float(lon), 6)
        return (lat, lon) if 33 < lat < 39 and 124 < lon < 132 else (None, None)
    except (TypeError, ValueError):
        return None, None


def hid(*parts):
    return hashlib.sha1('|'.join(str(p or '') for p in parts).encode()).hexdigest()[:10]


def pair(o, c):
    o, c = hhmm(o), hhmm(c)
    return [o, c] if o and c and o != c else None


def base(kind, pid, name, addr, jibun, lat, lon, tel, org, ref):
    return {'id': f'{kind[0]}-{re.sub(r"[^0-9A-Za-z]", "", pid)[:24]}', 'kind': kind, 'name': name, 'sub': None, 'addr': addr,
            'jibun': jibun if jibun != addr else None, 'lat': lat, 'lon': lon, 'tel': tel, 'hours': {}, 'since': None, 'tags': [],
            'fee': None, 'off': None, 'org': org, 'ref': ref}


def repairs(rows, today):
    out, skip = [], Counter()
    for r in rows:
        st = (r.get('bsnSttus') or '').lstrip('0')
        b, e = (r.get('sssBeginDate') or '').replace('-', ''), (r.get('sssEndDate') or '').replace('-', '')
        if st != '1' or (r.get('clsbizDate') or '').strip():
            skip['폐업·휴업'] += 1
            continue
        if b and b <= today and (not e or today <= e):
            skip['휴업 기간'] += 1
            continue
        name = txt(r.get('inspofcNm'))
        if not name:
            skip['이름 없음'] += 1
            continue
        lat, lon = coord(r.get('latitude'), r.get('longitude'))
        p = base('repair', hid(r.get('insttCode'), name, r.get('bizrnoDate'), r.get('rdnmadr') or r.get('lnmadr')), name, txt(r.get('rdnmadr')),
                 txt(r.get('lnmadr')), lat, lon, txt(r.get('phoneNumber')), txt(r.get('insttNm')) or txt(r.get('institutionNm')), txt(r.get('referenceDate')))
        p['sub'] = REPAIR_TYPE.get((r.get('inspofcType') or '').strip().lstrip('0'))
        p['since'] = txt(r.get('bizrnoDate'))
        h = pair(r.get('operOpenHm'), r.get('operCloseHm'))
        if h:
            p['hours'] = {'wk': h}
        out.append(p)
    log('정비업체 뺀 곳', dict(skip))
    return out


OPER = re.compile(r'(?:(평일|토요일|토|공휴일|일요일|휴일)[^\d]{0,4})?(\d{1,2})\s*[: ]\s*(\d{2})\s*[~-]\s*(\d{1,2})\s*[: ]\s*(\d{2})')


def parse_oper(s):
    """'평일:09:00~18:00+토요일:09:00~13:00' / '09:00 ~ 18:00' / '평일09 00-18 00 토요일09 00-13 00' → {'wk': [...], 'sat': [...]}
    (요일이 없는 첫 시간은 평일로 봄)"""
    out = {}
    for m in OPER.finditer(s or ''):
        k = {'평일': 'wk', '토요일': 'sat', '토': 'sat', None: 'wk'}.get(m.group(1), 'hol')
        if k in out:
            continue
        h = pair(f'{m.group(2)}:{m.group(3)}', f'{m.group(4)}:{m.group(5)}')
        if h:
            out[k] = h
    return out


def compact(p):
    """빈 값은 저장하지 않음(파일 크기 절반 가까이 줄어듦). tags·hours는 항상 둠."""
    return {k: v for k, v in p.items() if k in ('tags', 'hours') or v not in (None, '', [], {})}


def inspections(rows):
    out = []
    for r in rows:
        name = txt(r.get('inspofcNm'))
        if not name:
            continue
        lat, lon = coord(r.get('latitude'), r.get('longitude'))
        p = base('inspect', hid(r.get('insttCode'), name, r.get('rdnmadr') or r.get('lnmadr')), name, txt(r.get('rdnmadr')), txt(r.get('lnmadr')),
                 lat, lon, txt(r.get('inspofcPhoneNumber')) or txt(r.get('phoneNumber')), txt(r.get('insttNm')) or txt(r.get('institutionNm')), txt(r.get('referenceDate')))
        p['sub'] = '공공(교통안전공단)' if (r.get('inspofcType') or '').strip() == '공공' else '민간 지정'
        p['hours'] = parse_oper(r.get('operTime'))
        p['hours_text'] = txt(r.get('operTime'))
        p['tags'] = [label for k, label in CHECKS if (r.get(k) or '').strip().upper() == 'Y']
        out.append(p)
    return out


def washes(rows):
    out = []
    for r in rows:
        name, mid = txt(r.get('사업장명')), txt(r.get('관리번호'))
        if not name or not mid:
            continue
        lat, lon = coord(r.get('WGS84위도'), r.get('WGS84경도'))
        p = base('wash', mid, name, txt(r.get('소재지도로명주소')), txt(r.get('소재지지번주소')), lat, lon, txt(r.get('세차장전화번호')),
                 ' '.join(x for x in (txt(r.get('시도명')), txt(r.get('시군구명'))) if x) or None, txt(r.get('데이터기준일자')))
        p['sub'] = txt(r.get('세차유형'))
        h = {'wk': pair(r.get('평일운영시작시각'), r.get('평일운영종료시각')), 'hol': pair(r.get('휴일운영시작시각'), r.get('휴일운영종료시각'))}
        p['hours'] = {k: v for k, v in h.items() if v}
        p['fee'], p['off'] = txt(r.get('세차요금정보')), txt(r.get('휴무일'))
        out.append(p)
    return out


def emissions(rows):
    out = []
    for r in rows:
        name, mid = txt(r.get('사업장명')), txt(r.get('관리번호'))
        if not name or not mid or (r.get('영업상태코드') or '').strip() != '01':
            continue
        p = base('emission', mid, name, txt(r.get('도로명주소')), txt(r.get('지번주소')), None, None, txt(r.get('전화번호')), None, None)
        p['sub'] = txt(r.get('환경업무구분명'))
        p['since'] = txt(r.get('인허가일자'))
        p['tags'] = [t for t in (txt(r.get('업태구분명')),) if t]
        out.append(p)
    return out


BIG = ('종합정비', '소형자동차종합정비')
hm = lambda s: int(s[:2]) * 60 + int(s[3:5])


def enrich(items, parkings):
    """Facts that differ on every detail page (Google skips near-identical template pages): 정비소·세차장 within 1km,
    the nearest 검사소 (20km) and 공영주차장 (500m). Distances are rounded to 10m so a nearby change rewrites little."""
    geo = [p for p in items if p.get('lat') is not None]
    g = A.grid(geo)
    gk = A.grid([x for x in parkings if x.get('lat') is not None])
    ins = sorted((p for p in geo if p['kind'] == 'inspect'), key=lambda p: p['lat'])
    ins_lat = [p['lat'] for p in ins]
    for p in geo:
        near = [b for _, b in A.within(g, p['lat'], p['lon'], 1000) if b is not p]
        rep = [b for b in near if b['kind'] == 'repair']
        p['around'] = {'r': len(rep), 'b': sum(b.get('sub') in BIG for b in rep), 'w': sum(b['kind'] == 'wash' for b in near)}
        lo, hi = bisect.bisect_left(ins_lat, p['lat'] - 0.2), bisect.bisect_right(ins_lat, p['lat'] + 0.2)
        best = min(((A.meters(p['lat'], p['lon'], e['lat'], e['lon']), e) for e in ins[lo:hi] if e is not p), key=lambda e: e[0], default=None)
        if best and best[0] <= 20000:
            p['insp'] = {'id': best[1]['id'], 'm': int(round(best[0], -1))}
        park = min(A.within(gk, p['lat'], p['lon'], 500), key=lambda e: e[0], default=None)
        if park:
            p['park'] = {'id': park[1]['id'], 'name': park[1]['name'], 'm': int(round(park[0], -1)), 'free': park[1].get('charge') == '무료'}


def stage_of(items):
    """Sitemap stage: 1 = 검사소·종합/소형 정비소·전화와 시간이 있는 세차장 (submitted first), 2 = 전화나 시간이 있는 곳,
    3 = 이름·주소뿐인 곳. The Worker's SITEMAP_STAGE decides how far the sitemap goes (Google crawls a new site slowly)."""
    for p in items:
        p['stage'] = (1 if p['kind'] == 'inspect' or (p['kind'] == 'repair' and p.get('sub') in BIG) or (p['kind'] == 'wash' and p.get('tel') and p['hours'])
                      else 2 if p.get('tel') or p['hours'] else 3)


def region_stats(items):
    """Per region and kind: count, 등록 연도 and 평일 마감 quartiles, 토·일요일 시간 등록 수, 종합·소형 정비소 수 — the detail
    page compares one place with its neighbours without storing them on every row."""
    by = defaultdict(list)
    for p in items:
        by[(p['region'], p['kind'])].append(p)
    q = lambda v, f: v[int(len(v) * f)] if v else None
    out = defaultdict(dict)
    for (rid, k), ps in by.items():
        year = sorted(int(p['since'][:4]) for p in ps if (p.get('since') or '')[:4].isdigit())
        close = sorted(hm(p['hours']['wk'][1]) for p in ps if 'wk' in p['hours'])
        st = {'n': len(ps), 'y25': q(year, .25), 'y50': q(year, .5), 'y75': q(year, .75), 'hours': len(close),
              'c25': q(close, .25), 'c50': q(close, .5), 'c75': q(close, .75),
              'sat': sum('sat' in p['hours'] for p in ps), 'hol': sum('hol' in p['hours'] for p in ps)}
        if k == 'repair':
            st['big'] = sum(p.get('sub') in BIG for p in ps)
        out[rid][k] = {a: v for a, v in st.items() if v is not None}
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
    items = (repairs(api_rows(key, 'tn_pubr_public_auto_maintenance_company_api'), now.strftime('%Y%m%d'))
             + inspections(api_rows(key, 'tn_pubr_public_car_inspofc_api'))
             + washes(localdata_rows('car_wash_info'))
             + emissions(localdata_rows('emission_inspection_agencies')))
    # 같은 id(같은 지자체·이름·등록일)가 두 번 나오면 하나만.
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
    items = [compact(p) for p in K.place(items, regions)]
    items.sort(key=lambda p: (p['region'], p['kind'], p['name'], p['id']))
    enrich(items, json.loads((ROOT / 'apps/parking/data/parkings.json').read_text(encoding='utf-8'))['items'])
    stage_of(items)
    stats = region_stats(items)
    if prev and len(items) < len(prev['items']) * 0.9 and '--force' not in args:
        raise SystemExit(f"서비스센터 수가 {len(prev['items']):,} → {len(items):,}로 10% 넘게 줄어 중단합니다 (--force로 무시)")
    if prev and prev['items'] == items and prev.get('stats') == stats:
        log('변경 없음')
        return
    kinds = Counter(p['kind'] for p in items)
    status = {'updated_at': now.isoformat(timespec='seconds'), 'count': len(items), 'kinds': dict(kinds),
              'with_coords': sum(1 for p in items if p.get('lat') is not None), 'new': sum(1 for p in items if prev and p['id'] not in prev_by_id),
              'removed': len(set(prev_by_id) - {p['id'] for p in items}) if prev else 0}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'status': status, 'stats': stats, 'items': items}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    log(f"서비스센터 {len(items):,}곳 {dict(kinds)} · 좌표 {status['with_coords']:,} · 지역 {len({p['region'] for p in items})} · 파일 {OUT.stat().st_size / 1e6:.1f}MB")
    log('사이트맵 단계', sorted(Counter(p['stage'] for p in items).items()))
    log('정비 종류', Counter(p.get('sub') for p in items if p['kind'] == 'repair').most_common())
    # 종류 코드 추정 확인: 이름에 '공업사'(보통 종합정비)·'타이어'·'카센터'가 든 곳의 종류 분포
    for word in ('공업사', '타이어', '카센터', '오토', '모터스'):
        log(f'  이름 "{word}"', Counter(p.get('sub') for p in items if p['kind'] == 'repair' and word in p['name']).most_common())
    log('세차 유형', Counter(p.get('sub') for p in items if p['kind'] == 'wash').most_common(8))
    log('검사소', Counter(p.get('sub') for p in items if p['kind'] == 'inspect').most_common(), '시간 파싱', sum(1 for p in items if p['kind'] == 'inspect' and p['hours']))


if __name__ == '__main__':
    main()
