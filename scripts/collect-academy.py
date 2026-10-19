"""Collect every 학원·교습소 for academy.guidejung.com (내근처 학원) from the NEIS open API and geocode the addresses.

The NEIS 학원교습소정보 API (acaInsTiInfo) returns one row per 교습과정, so rows are grouped by the 지정번호
(ACA_ASNUM) into one academy. Closed academies are not in the response: an id that disappears is dropped.
Addresses have no coordinates; they are geocoded with Kakao Local (address search) and kept in a cache so later runs
only look up new addresses.

Runs daily in GitHub Actions (.github/workflows/academy-collect.yml); runtime/academy is kept in the Actions cache.
Usage: NEIS_API_KEY=... KAKAO_REST_KEY=... python scripts/collect-academy.py [--minutes N] [--no-geocode]
Writes runtime/academy/full.json (all academies) and runtime/academy/geo.json (address → [lat, lon]).
"""
import json, os, re, sys, time, urllib.error, urllib.parse, urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'runtime/academy'
KST = timezone(timedelta(hours=9))
OFFICES = {
    'B10': '서울', 'C10': '부산', 'D10': '대구', 'E10': '인천', 'F10': '광주', 'G10': '대전', 'H10': '울산', 'I10': '세종',
    'J10': '경기', 'K10': '강원', 'M10': '충북', 'N10': '충남', 'P10': '전북', 'Q10': '전남', 'R10': '경북', 'S10': '경남', 'T10': '제주',
}
NEIS = 'https://open.neis.go.kr/hub/acaInsTiInfo'
KAKAO = 'https://dapi.kakao.com/v2/local/search/address.json'
GEO_THREADS = 8
MISS_RETRY_DAYS = 30  # an address Kakao did not find is tried again after this many days

# 과목: matched against course and fee names (first match wins per name, a name can carry several subjects).
SUBJECTS = [
    ('math', '수학', r'수학|연산|사고력|산수'),
    ('english', '영어', r'영어|파닉스|리딩|리스닝|스피킹|토익|토플|텝스|챕터북|english'),
    ('korean', '국어', r'국어|문학|한글'),
    ('science', '과학', r'과학|물리|화학|생물|생명과학|지구과학'),
    ('social', '사회', r'사회|역사|한국사'),
    ('essay', '논술·독서', r'논술|독서|속독|글쓰기|작문'),
    ('coding', '코딩·컴퓨터', r'코딩|컴퓨터|소프트웨어|프로그래밍|로봇|정보처리'),
    ('foreign', '제2외국어', r'중국어|일본어|스페인어|프랑스어|독일어|한자'),
    ('music', '음악', r'음악|피아노|바이엘|체르니|바이올린|첼로|플루트|기타(?!\()|드럼|우쿨렐레|성악|보컬|작곡|실용음악|가야금'),
    ('art', '미술', r'미술|드로잉|소묘|회화|디자인|만들기|공예|서예|캘리'),
    ('dance', '무용·댄스', r'무용|발레|댄스|방송댄스|한국무용|현대무용'),
    ('baduk', '바둑', r'바둑|체스'),
    ('study', '독서실', r'독서실'),
    ('job', '자격증·직업', r'자격증|미용|바리스타|조리|제과|제빵|간호|운전|전기|용접|회계|세무'),
]
GRADES = [('kinder', '유아', r'유아|유치|미취학|7세|6세|5세'), ('elem', '초등', r'초등|초[1-6]|초저|초고|초\s'), ('middle', '중등', r'중등|중학|중[1-3]'),
          ('high', '고등', r'고등|고[1-3]|수능'), ('adult', '성인', r'성인|일반인|직장인|취업')]
SUBJECT_RE = [(k, re.compile(p, re.I)) for k, _, p in SUBJECTS]
GRADE_RE = [(k, re.compile(p)) for k, _, p in GRADES]
# 분야(REALM_SC_NM) → 사이트 분류. 처음 범위(10/19 사용자): 입시·보습 + 예체능, 영어 학원이 많은 국제화·종합·독서실도 포함.
REALMS = {'입시.검정 및 보습': 'study', '예능(대)': 'arts', '국제화': 'lang', '종합(대)': 'study', '독서실': 'reading'}
SIDO = {k: v for k, v in OFFICES.items()}
FEE_OK = (10_000, 3_000_000)  # 이 범위 밖 금액(원본 오류·연간 금액 등)은 통계에서 뺌
FEE_RE = re.compile(r'([^:,]+?)\s*:\s*([0-9]+)')
PLACEHOLDER_TEL = re.compile(r'^0\d{1,2}-0{3,4}-0{4}$')


def log(*a):
    print(*a, flush=True)


def http_json(url, headers=None, timeout=60, tries=4):
    for n in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers or {}), timeout=timeout) as r:
                return r.status, json.load(r)
        except urllib.error.HTTPError as e:
            if e.code < 500:
                return e.code, e.read().decode('utf-8', 'replace')[:300]
            err = e
        except Exception as e:  # connection reset / timeout: back off and retry
            err = e
        time.sleep(4 * (n + 1))
    return 0, str(err)


def neis_rows(key):
    rows = []
    for code in OFFICES:
        page, total = 1, None
        while total is None or (page - 1) * 1000 < total:
            q = urllib.parse.urlencode({'KEY': key, 'Type': 'json', 'pIndex': page, 'pSize': 1000, 'ATPT_OFCDC_SC_CODE': code})
            st, d = http_json(f'{NEIS}?{q}')
            if st != 200 or 'acaInsTiInfo' not in d:
                raise SystemExit(f'NEIS {code} page {page}: {st} {str(d)[:200]}')
            head, body = d['acaInsTiInfo']
            total = head['head'][0]['list_total_count']
            rows += body['row']
            page += 1
        log(f'NEIS {code} {OFFICES[code]} {total:,}행')
    return rows


def weather_regions():
    # 시군구 코드·중심 좌표는 weather 지역표(apps/weather/data/regions.json)와 같게: 사이트 간 연결·주소가 같은 코드를 씀.
    return json.loads((ROOT / 'apps/weather/data/regions.json').read_text(encoding='utf-8'))


def region_code(office, zone, regions, misses):
    """NEIS 교육청 + 행정구역명 → 5자리 시군구 코드. 일반구가 있는 시('수원시')는 시 코드(41110, charge와 같은 규칙)."""
    short = OFFICES[office]
    cand = [r for r in regions if r['sidoShort'] == short or (short in ('광주', '전남') and r['sidoShort'] == '전남광주')]
    z = (zone or '').replace(' ', '')
    for r in cand:
        if r['name'].replace(' ', '') == z:
            return r['code']
    city = [r for r in cand if r['name'].split(' ')[0] == z]
    if city:
        return city[0]['code'][:4] + '0'
    if len(cand) == 1:  # 세종
        return cand[0]['code']
    misses[(short, zone)] += 1
    return f'{office}-{z}'


def clean(v):
    v = (v or '').strip()
    return v or None


def tags(text, table):
    return [k for k, rx in table if rx.search(text or '')]


def build(rows):
    by_id = defaultdict(list)
    for r in rows:
        by_id[r['ACA_ASNUM']].append(r)
    items = []
    for aid, rs in by_id.items():
        r0 = rs[0]
        courses, fees, seen = [], [], set()
        for r in rs:
            c = {k: clean(r.get(f)) for k, f in (('order', 'LE_ORD_NM'), ('course', 'LE_CRSE_NM'), ('list', 'LE_CRSE_LIST_NM'), ('realm', 'REALM_SC_NM'))}
            if any(c.values()) and c not in courses:
                courses.append(c)
            for name, won in FEE_RE.findall(r.get('PSNBY_THCC_CNTNT') or ''):
                name = name.strip()
                if (name, won) in seen or not re.search(r'[가-힣A-Za-z]', name):
                    continue  # duplicates across rows, and junk like "12323:11"
                seen.add((name, won))
                fees.append({'name': name, 'won': int(won), 'subjects': tags(name, SUBJECT_RE), 'grades': tags(name, GRADE_RE)})
        text = ' '.join([r0.get('ACA_NM') or ''] + [v for c in courses for k, v in c.items() if v and k != 'realm'] + [f['name'] for f in fees])
        tel = clean(r0.get('FA_TELNO'))
        items.append({
            'id': aid,
            'name': r0['ACA_NM'].strip(),
            'type': clean(r0.get('ACA_INSTI_SC_NM')),          # 학원 | 교습소
            'office': r0['ATPT_OFCDC_SC_CODE'], 'office_name': clean(r0.get('ATPT_OFCDC_SC_NM')),
            'zone': clean(r0.get('ADMST_ZONE_NM')),             # 시군구
            'realms': sorted({c['realm'] for c in courses if c['realm']}),
            'courses': courses,
            'fees': fees,
            'fee_public': (r0.get('THCC_OTHBC_YN') or '').strip() == 'Y',
            'subjects': tags(text, SUBJECT_RE),
            'grades': tags(text, GRADE_RE),
            'capacity': max((r.get('TOFOR_SMTOT') or 0) for r in rs) or None,
            'capacity_now': max((r.get('DTM_RCPTN_ABLTY_NMPR_SMTOT') or 0) for r in rs) or None,
            'boarding': (r0.get('BRHS_ACA_YN') or '').strip() == 'Y',
            'established': clean(r0.get('ESTBL_YMD')), 'registered': clean(r0.get('REG_YMD')),
            'closed_from': clean(r0.get('CAA_BEGIN_YMD')), 'closed_until': (clean(r0.get('CAA_END_YMD')) or '').replace('99991231', '') or None,
            'address': clean(r0.get('FA_RDNMA')), 'address_detail': clean((r0.get('FA_RDNDA') or '').lstrip(', ')), 'zip': clean(r0.get('FA_RDNZC')),
            'tel': None if not tel or PLACEHOLDER_TEL.match(tel) else tel,
            'loaded': clean(r0.get('LOAD_DTM')),
        })
    items = [a for a in items if any(r in REALMS for r in a['realms'])]
    regions, misses = weather_regions(), Counter()
    for a in items:
        a['realm'] = next(REALMS[r] for r in a['realms'] if r in REALMS)
        a['region_id'] = region_code(a['office'], a['zone'], regions, misses)
        a['region_name'] = f"{OFFICES[a['office']]} {a['zone'] or ''}".strip()
        ok = [f['won'] for f in a['fees'] if FEE_OK[0] <= f['won'] <= FEE_OK[1]]
        a['fee_min'], a['fee_max'] = (min(ok), max(ok)) if ok else (None, None)
        # 목록 순서: 수강료 공개 + 과정 정보가 많은 곳 먼저, 같은 점수는 id로 섞음(가나다순 아님).
        a['rank'] = (40 if ok else 0) + min(len(a['fees']), 10) * 2 + (10 if a['type'] == '학원' else 0) + (10 if a['tel'] else 0) + sum(map(ord, a['id'])) % 97 / 100
    if misses:
        log('시군구 코드를 못 찾은 지역', misses.most_common())
    items.sort(key=lambda a: a['id'])
    return items


def geocode(items, key, cache, deadline):
    today = datetime.now(KST).date()
    def due(a):
        v = cache.get(a)
        return v is None or (isinstance(v, dict) and (today - datetime.fromisoformat(v['miss']).date()).days >= MISS_RETRY_DAYS)
    todo = sorted({a['address'] for a in items if a['address'] and due(a['address'])})
    log(f'좌표 변환 대상 주소 {len(todo):,}곳 (저장된 주소 {len(cache):,}곳)')
    stop = {'why': None}
    def one(addr):
        if stop['why'] or time.time() > deadline:
            return
        for q in dict.fromkeys([addr, re.sub(r'\s*[(,].*$', '', addr)]):
            st, d = http_json(f'{KAKAO}?{urllib.parse.urlencode({"query": q})}', {'Authorization': f'KakaoAK {key}'}, timeout=20)
            if st != 200:
                if st in (401, 403, 429) or st == 0:
                    stop['why'] = f'{st} {str(d)[:200]}'  # key / quota / network trouble: keep what we have, retry next run
                return
            docs = d.get('documents') or []
            if docs:
                cache[addr] = [round(float(docs[0]['y']), 6), round(float(docs[0]['x']), 6)]
                return
        cache[addr] = {'miss': today.isoformat()}
    done = 0
    with ThreadPoolExecutor(GEO_THREADS) as pool:
        for i in range(0, len(todo), 2000):
            list(pool.map(one, todo[i:i + 2000]))
            done = min(i + 2000, len(todo))
            save_json(OUT / 'geo.json', cache)
            log(f'  좌표 {done:,}/{len(todo):,}')
            if stop['why'] or time.time() > deadline:
                break
    if stop['why']:
        log(f'좌표 변환 중단: {stop["why"]} — 다음 실행에서 이어서 합니다')
    elif time.time() > deadline:
        log('좌표 변환 시간 초과 — 다음 실행에서 이어서 합니다')


def card(a):
    return {'id': a['id'], 'name': a['name'], 'type': a['type'], 'subjects': a['subjects'], 'grades': a['grades'],
            'fee_min': a['fee_min'], 'fee_max': a['fee_max'], 'address': a['address'], 'lat': a['lat'], 'lon': a['lon']}


def fee_stats(won):
    won = sorted(won)
    if not won:
        return None
    return {'n': len(won), 'min': won[0], 'median': won[len(won) // 2], 'max': won[-1]}


def make_summary(items, status):
    """Small build file for the static pages (apps/academy/data/summary.json): per region counts, fee statistics per
    subject and the first cards, so each region page has real numbers and names in its HTML."""
    by_region = defaultdict(list)
    for a in items:
        by_region[a['region_id']].append(a)
    regions = []
    for rid, rs in sorted(by_region.items()):
        rs.sort(key=lambda a: -a['rank'])
        pts = [(a['lat'], a['lon']) for a in rs if a['lat'] is not None]
        subjects = {}
        for k, label, _ in SUBJECTS:
            sub = [a for a in rs if k in a['subjects']]
            if not sub:
                continue
            won = [f['won'] for a in sub for f in a['fees'] if k in f['subjects'] and FEE_OK[0] <= f['won'] <= FEE_OK[1]]
            subjects[k] = {'count': len(sub), 'fees': fee_stats(won), 'top': [card(a) for a in sub[:6]]}
        regions.append({
            'id': rid, 'name': rs[0]['region_name'], 'sido': OFFICES[rs[0]['office']], 'zone': rs[0]['zone'], 'count': len(rs),
            'academies': sum(1 for a in rs if a['type'] == '학원'), 'with_fees': sum(1 for a in rs if a['fee_min']),
            'lat': round(sum(p[0] for p in pts) / len(pts), 5) if pts else None, 'lon': round(sum(p[1] for p in pts) / len(pts), 5) if pts else None,
            'realms': dict(Counter(a['realm'] for a in rs)), 'grades': dict(Counter(g for a in rs for g in a['grades'])),
            'subjects': subjects, 'top': [card(a) for a in rs[:24]],
            'new': [card(a) for a in sorted(rs, key=lambda a: a['established'] or '', reverse=True)[:6]],
        })
    nation = {}
    for k, label, _ in SUBJECTS:
        won = [f['won'] for a in items for f in a['fees'] if k in f['subjects'] and FEE_OK[0] <= f['won'] <= FEE_OK[1]]
        nation[k] = {'count': sum(1 for a in items if k in a['subjects']), 'fees': fee_stats(won)}
    return {'status': status, 'subjects': [{'key': k, 'label': l} for k, l, _ in SUBJECTS], 'grades': [{'key': k, 'label': l} for k, l, _ in GRADES],
            'nation': nation, 'regions': regions}


def save_json(path, data):
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    tmp.replace(path)


def main():
    args = sys.argv[1:]
    minutes = int(args[args.index('--minutes') + 1]) if '--minutes' in args else 300
    deadline = time.time() + minutes * 60
    neis_key, kakao_key = os.environ.get('NEIS_API_KEY', '').strip(), os.environ.get('KAKAO_REST_KEY', '').strip()
    if not neis_key:
        raise SystemExit('NEIS_API_KEY missing')
    OUT.mkdir(parents=True, exist_ok=True)
    items = build(neis_rows(neis_key))
    prev_path = OUT / 'full.json'
    prev = json.loads(prev_path.read_text(encoding='utf-8')) if prev_path.exists() else None
    # A broken response must not wipe the site: refuse a set more than 10% smaller than the last one.
    if prev and len(items) < len(prev['items']) * 0.9 and '--force' not in args:
        raise SystemExit(f'학원 수가 {len(prev["items"]):,} → {len(items):,}로 10% 넘게 줄어 중단합니다 (--force로 무시)')
    geo_path = OUT / 'geo.json'
    cache = json.loads(geo_path.read_text(encoding='utf-8')) if geo_path.exists() else {}
    if kakao_key and '--no-geocode' not in args:
        geocode(items, kakao_key, cache, deadline)
    for a in items:
        v = cache.get(a['address'] or '')
        a['lat'], a['lon'] = (v if isinstance(v, list) else (None, None))
        if a['lat'] is None:
            a['rank'] -= 30  # 지도·거리에 못 나오는 곳은 뒤로
    now = datetime.now(KST)
    prev_ids = {a['id']: a for a in prev['items']} if prev else {}
    first_seen = {a['id']: a.get('first_seen') for a in prev['items']} if prev else {}
    for a in items:
        a['first_seen'] = first_seen.get(a['id']) or (now.date().isoformat() if prev else None)
    fee_items = [f for a in items for f in a['fees'] if 1000 <= f['won'] <= 5_000_000]
    status = {
        'updated_at': now.isoformat(timespec='seconds'), 'source': 'NEIS 교육정보 개방 포털 학원교습소정보(acaInsTiInfo)',
        'count': len(items), 'with_coords': sum(1 for a in items if a['lat'] is not None),
        'with_fees': sum(1 for a in items if a['fees']), 'new': sum(1 for a in items if prev and a['id'] not in prev_ids),
        'removed': sum(1 for i in prev_ids if i not in {a['id'] for a in items}) if prev else 0,
    }
    save_json(prev_path, {'status': status, 'items': items})
    summary = make_summary(items, status)
    (ROOT / 'apps/academy/data').mkdir(parents=True, exist_ok=True)
    (ROOT / 'apps/academy/data/summary.json').write_text(json.dumps(summary, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    log(f"요약 파일: 지역 {len(summary['regions']):,}곳")
    log(f"학원·교습소 {status['count']:,}곳 · 좌표 {status['with_coords']:,}곳 · 수강료 공개 {status['with_fees']:,}곳 · 새로 {status['new']:,} · 빠짐 {status['removed']:,}")
    log('종류', Counter(a['type'] for a in items).most_common())
    log('과목', Counter(s for a in items for s in a['subjects']).most_common())
    log('학년', Counter(g for a in items for g in a['grades']).most_common())
    log('과목 없음', f"{sum(1 for a in items if not a['subjects']):,}곳", [a['name'] for a in items if not a['subjects']][:30])
    won = sorted(f['won'] for f in fee_items)
    if won:
        log(f'수강료 {len(won):,}개 중앙값 {won[len(won) // 2]:,}원')


if __name__ == '__main__':
    main()
