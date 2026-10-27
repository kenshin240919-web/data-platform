"""Collect 온누리상품권 가맹점 for market.guidejung.com (내근처 시장): every store that takes 온누리상품권, grouped by the 전통시장·
상점가 it belongs to, with each market's location — one list that ships with the site (apps/market/data/market.json).

Sources (reports/market-설계안-2026-10-27.md 2장):
- 소상공인시장진흥공단 「전국 온누리상품권 가맹점 현황」 (공공데이터포털 3060079, CSV, 연 1회, 이용 제한 없음, 신청 없이 내려받기)
  2026-07-31 기준 225,803곳 · 시장·상점가 3,952곳. 칸: 가맹점명·소속 시장명(또는 상점가)·소재지(시도만!)·취급품목·지류형·디지털형·
  가맹 등록년도. 가게 주소가 없어 위치는 소속 시장·상점가 단위(가게 위치는 상세에서 방문 때마다 카카오로 찾고 저장하지 않음).
  파일 이름의 날짜(기준일)가 해마다 바뀌어 받을 주소(atchFileId)는 데이터 페이지에서 찾음.
- 전국전통시장표준데이터 (15012894, api.data.go.kr/openapi/tn_pubr_public_trdit_mrkt_api, DATA_GO_KR_KEY — 활용신청이 안 돼 있으면
  건너뜀): 시장 좌표·주소·시장 유형(상설/5일장)·개설 주기·점포 수·주차장·화장실·전화. 이름으로 맞춘 시장에 붙임.
- 위치가 없는 시장·상점가: 카카오 로컬 키워드 검색(KAKAO_REST_KEY) '시도 + 이름' → 이름이 맞고 같은 시도인 곳만. 결과는
  runtime/market/geo.json(Actions cache)에 두고 30일마다 다시 확인(카카오 운영정책: 캐시는 최신으로 유지). 못 찾으면
  이름 속 시군구('익산 다e로움 상권활성화구역')로 그 시군구 중심(geo 'area' — 내 주변 검색에는 넣지 않음).
Region codes are the weather site's 시군구 codes (same rules as collect-parking.py).
Usage: [DATA_GO_KR_KEY=...] [KAKAO_REST_KEY=...] python scripts/collect-market.py [--csv file] [--force]
"""
import csv, hashlib, importlib.util, io, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request
from collections import Counter, defaultdict
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
OUT = ROOT / 'apps/market/data/market.json'
CACHE = ROOT / 'runtime/market/geo.json'
PAGE = 'https://www.data.go.kr/data/3060079/fileData.do'
STD_API = 'https://api.data.go.kr/openapi/tn_pubr_public_trdit_mrkt_api'
KAKAO_KW = 'https://dapi.kakao.com/v2/local/search/keyword.json'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
MISS_RETRY_DAYS = 14
FIND_V = 2  # 찾는 규칙 버전 — 올리면 예전 규칙으로 못 찾은 곳을 바로 다시 찾음
KAKAO_ADDR = 'https://dapi.kakao.com/v2/local/search/address.json'
SUFFIX = re.compile(r'\s*(골목형\s*상점가|상점가|상가번영회|번영회|상인회|상권활성화구역|상권|지하상가|지하쇼핑센터|상가|시장)$')
GEO_LIMIT = 6000  # 한 번에 카카오에 물어볼 시장 수(첫 실행 약 3,000곳 × 최대 3번)

# 취급품목(가맹점이 직접 적은 자유 문장) → 품목 묶음. 앞에서부터 처음 맞는 것, 안 맞으면 가게 이름으로 한 번 더.
# 화면 이름·아이콘은 apps/market/lib/fmt.ts CATS(같은 slug).
CATS = [
    ('health', r'약국|의원|병원|한의|치과|안경|한약|보청기|의료기'),
    ('edu', r'서적|학원|교습|태권|교육|서점|도서|문구|피아노|미술|체육관|헬스|필라테스|요가|공부방'),
    ('beauty', r'미용|헤어|네일|피부|화장품|이용원|이발|속눈썹|왁싱|뷰티|메이크업|에스테틱'),
    ('cafe', r'과자|꽈배기|한과|뻥튀기|커피|카페|음료|제과|빵|베이커리|디저트|케이크|케익|아이스크림|차류|찻집|전통차|도넛|와플|마카롱|쥬스|주스'),
    ('meat', r'^닭$|통닭|생닭|닭\b|계란|달걀|식육|정육|축산|육류|한우|돼지고기|닭고기|소고기|고기\b|계육|오리'),
    ('fish', r'^회$|생선회|활어회|선어|장어|어패|참치|쭈꾸미|주꾸미|홍어|낙지|문어|수산|생선|건어|젓갈|해산|어물|활어|횟감|건해|조개|굴|멸치|김\b|미역|오징어|새우|꽃게|고등어|갈치'),
    ('fruit', r'수삼|약초|고추|마늘|과일|야채|채소|농산|청과|곡물|곡류|쌀|잡곡|버섯|나물|인삼|홍삼|견과'),
    ('side', r'반찬|떡|김치|두부|방앗간|참기름|들기름|국수|면류|만두|족발|순대|어묵|전\b|부침'),
    ('food', r'^죽$|죽집|부대찌개|샐러드|양꼬치|닭발|막창|파스타|한식|중식|일식|양식|분식|치킨|음식|식당|국밥|고기집|횟집|보쌈|피자|햄버거|갈비|냉면|칼국수|김밥|주점|호프|요리|뷔페|곱창|백반|돈가스|돈까스|초밥|아구|해장|감자탕|삼겹|짜장|중국집|탕|찜|구이|레스토랑|술집|포차|도시락|샌드위치|토스트|떡볶이|닭강정'),
    ('cloth', r'의복|내의|외의|여성복|숙녀복|남성복|정장|포목|직물|의류|옷|신발|한복|속옷|양말|가방|잡화|패션|아동복|모자|구두|스포츠|등산|수선|세탁|침구|이불|원단|섬유|액세서리|악세사리|귀금속|금은방|시계|주얼리'),
    ('home', r'커튼|커텐|도자기|공예|공방|벽지|악기|생활|철물|그릇|주방|가정용품|공구|전기|전자|가구|인테리어|조명|페인트|건축|자재|완구|장난감|휴대폰|핸드폰|통신|컴퓨터|가전|열쇠|도장|사진|인쇄|애견|반려|동물|자전거|오토바이|자동차|타이어|카센터|주유|정비|세차'),
    ('mart', r'마트|슈퍼|식료품|식품|가공|편의점|건강|양곡|주류|담배'),
    ('leisure', r'당구|노래|스크린|골프|볼링|숙박|모텔|펜션|게스트하우스|찜질|사우나|목욕|PC방|피시방|오락|키즈카페|여행'),
    ('flower', r'생화|꽃|화원|플라워|화훼|원예|농약|종묘|비료'),
]
CAT_RX = [(s, re.compile(p)) for s, p in CATS]


def cat_of(item, name):
    for text in (item, name):
        t = (text or '').strip()
        for s, rx in CAT_RX:
            if t and rx.search(t):
                return s
    return 'etc'


# 주소 첫 마디 → weather 지역표 시도 짧은 이름(2026 전남·광주 통합은 '전남광주')
SIDO_PREFIX = [('서울', '서울'), ('부산', '부산'), ('대구', '대구'), ('인천', '인천'), ('광주', '전남광주'), ('전남', '전남광주'), ('전라남', '전남광주'),
               ('대전', '대전'), ('울산', '울산'), ('세종', '세종'), ('경기', '경기'), ('강원', '강원'), ('충청북', '충북'), ('충북', '충북'),
               ('충청남', '충남'), ('충남', '충남'), ('전북', '전북'), ('전라북', '전북'), ('경상북', '경북'), ('경북', '경북'), ('경상남', '경남'),
               ('경남', '경남'), ('제주', '제주')]


def sido_of(addr):
    first = (addr or '').strip().split(' ')[0]
    return next((v for k, v in SIDO_PREFIX if first.startswith(k)), None)


def norm(s):
    return re.sub(r'[\s·.,\-_()（）\[\]㈜]|주식회사|\(주\)|\(유\)', '', s or '').lower()


def base_name(s):
    return re.sub(r'\s*[(（][^)）]*[)）]', '', s or '').strip()


def fetch(url, referer=None, timeout=120, tries=4):
    err = None
    for n in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, **({'Referer': referer} if referer else {})})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:  # data.go.kr 파일 내려받기는 가끔 연결이 끊김 → 잠시 뒤 다시
            err = e
            time.sleep(5 * (n + 1))
    raise SystemExit(f'내려받기 실패 {url}: {err}')


def onnuri_rows(path=None):
    """가맹점 파일(CSV). 기준일은 파일 이름(…현황_20260731)에서."""
    base = None
    if path:
        raw = Path(path).read_bytes()
    else:
        html = fetch(PAGE).decode('utf-8', 'replace')
        m = re.search(r'fileDownload\.do\?atchFileId=(FILE_\d+)&(?:amp;)?fileDetailSn=(\d+)', html)
        if not m:
            raise SystemExit('가맹점 파일 주소를 데이터 페이지에서 찾지 못함')
        d = re.search(r'가맹점 현황_(\d{8})', html)
        base = f'{d[1][:4]}-{d[1][4:6]}-{d[1][6:]}' if d else None
        raw = fetch(f'https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId={m[1]}&fileDetailSn={m[2]}&insertDataPrcus=N', PAGE, 300)
    for enc in ('utf-8-sig', 'cp949'):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    rows = list(csv.DictReader(io.StringIO(text)))
    if not rows or not any('가맹점명' in k for k in rows[0]):
        raise SystemExit(f'가맹점 파일 형식이 다름: {list(rows[0].keys()) if rows else "빈 파일"}')
    col = lambda word: next(k for k in rows[0] if word in k)
    C = {'name': col('가맹점명'), 'market': col('소속'), 'sido': col('소재지'), 'item': col('품목'), 'paper': col('지류'), 'digital': col('디지털'), 'year': col('등록')}
    return [{k: (r.get(v) or '').strip() for k, v in C.items()} for r in rows], base


def std_markets(key):
    """전국전통시장표준데이터 전체(활용신청이 없거나 실패하면 None)."""
    if not key:
        return None
    rows, page, total = [], 1, None
    while total is None or (page - 1) * 1000 < total:
        q = urllib.parse.urlencode({'serviceKey': key, 'pageNo': page, 'numOfRows': 1000, 'type': 'json'})
        st, d = http_json(f'{STD_API}?{q}', timeout=120)
        resp = d.get('response', d) if isinstance(d, dict) else {}
        body = resp.get('body') or {}
        if st != 200 or 'items' not in body:
            log(f'전통시장 표준데이터 {page}쪽 받지 못함: {st} {str(d)[:300]} — 건너뜀(시장 위치는 카카오로)')
            return None
        total = int(body.get('totalCount') or 0)
        items = body['items'] or []
        items = items.get('item', []) if isinstance(items, dict) else items
        rows += [items] if isinstance(items, dict) else items
        if page == 1 and rows:
            log(f'  표준데이터 칸: {sorted(rows[0].keys())}')
        page += 1
    log(f'전통시장 표준데이터 {len(rows):,}곳')
    return rows


def pick(r, *keys):
    for k in keys:
        v = r.get(k)
        if v not in (None, ''):
            return str(v).strip()
    return None


def std_index(rows):
    """(시도, 이름) → 표준데이터 시장. 이름은 띄어쓰기·괄호를 뺀 것으로 맞춤."""
    idx = {}
    for r in rows or []:
        name = pick(r, 'mrktNm', 'marketNm', '시장명')
        addr = pick(r, 'rdnmadr', 'lnmadr', '소재지도로명주소', '소재지지번주소')
        lat, lon = pick(r, 'latitude', '위도'), pick(r, 'longitude', '경도')
        if not name:
            continue
        try:
            lat, lon = round(float(lat), 6), round(float(lon), 6)
            if not (33 < lat < 39 and 124 < lon < 132):
                lat = lon = None
        except (TypeError, ValueError):
            lat = lon = None
        yn = lambda v: None if v is None else v.upper().startswith('Y')
        m = {'name': name, 'addr': pick(r, 'rdnmadr', '소재지도로명주소'), 'jibun': pick(r, 'lnmadr', '소재지지번주소'), 'lat': lat, 'lon': lon,
             'mtype': pick(r, 'mrktType', '시장유형'), 'cycle': pick(r, 'mrktEstblCycle', '시장개설주기'), 'stores': pick(r, 'storNumber', '점포수'),
             'goods': pick(r, 'trtmntPrdlst', '취급품목'), 'toilet': yn(pick(r, 'pblicToiletYn', '공중화장실보유여부')),
             'parking': yn(pick(r, 'prkplceYn', '주차장보유여부')), 'year': pick(r, 'estblYear', '개설년도'), 'tel': pick(r, 'phoneNumber', '전화번호')}
        for k in {norm(name), norm(base_name(name))}:
            idx.setdefault((sido_of(addr), k), m)
    return idx


def stem_of(name):
    """'가락몰골목형상점가' → '가락몰', '용봉지구 골목형상점가' → '용봉지구', '부전상가시장' → '부전'(뒤 꼬리를 거듭 뗌, 두 글자 넘게 남을 때만)."""
    s = re.sub(r'\s*제?\d+(지구|구역|층|단지).*$', '', base_name(name)).strip() or base_name(name)
    while True:
        t = SUFFIX.sub('', s).strip()
        if t == s or len(norm(t)) < 2:
            return s
        s = t


def dong_of(name):
    """이름 속 동·읍·면('일곡동 골목형상점가', '보람동 …', '금호1동상가번영회') → '일곡동'."""
    m = re.search(r'([가-힣]{1,4}\d?(?:동|읍|면))(?=[\s상골번]|$)', base_name(name))
    if m and not re.search(r'(지하|자동|이동|운동)$', m[1]):
        return m[1]
    m = re.search(r'([가-힣]{2,3})지구', name)  # '용봉지구' → 용봉동
    return f'{m[1]}동' if m else None


def kakao(url, q, key):
    return http_json(f'{url}?{urllib.parse.urlencode({"query": q, "size": 10})}', {'Authorization': f'KakaoAK {key}'}, timeout=20, tries=2)


def kakao_find(name, sido, key):
    """카카오 키워드 검색으로 시장·상점가 위치. 이름이 맞고(포함 관계) 같은 시도인 첫 곳.
    못 찾으면 이름 속 동·읍·면 중심(geo 'dong', 대략). (결과, 상태) — 상태 'stop'이면 그만."""
    stem = stem_of(name)
    want = [w for w in dict.fromkeys([norm(base_name(name)), norm(name)]) if len(w) >= 2]
    st_n = norm(stem)
    kind = re.compile(r'시장|상가|상점|몰|거리|센터|프라자|플라자|타운|골목')
    inner = re.search(r'[(（]([^)）]+)[)）]', name)
    queries = [f'{sido} {base_name(name)}', base_name(name), f'{sido} {stem}', f'{sido} {stem}시장'] + ([inner[1]] if inner else [])
    for q in dict.fromkeys(x for x in queries if x.strip()):
        st, d = kakao(KAKAO_KW, q, key)
        if st != 200:
            return None, 'stop' if st in (0, 401, 403, 429) else 'err'
        for doc in d.get('documents') or []:
            addr = doc.get('road_address_name') or doc.get('address_name') or ''
            pn = norm(doc.get('place_name'))
            if sido_of(addr) != sido or not pn:
                continue
            # 줄인 이름('부전')은 짧으면 엉뚱한 곳('부전역')이 걸려서, 장소 이름이 시장·상가 같은 이름일 때만
            if any(w in pn or (len(pn) >= 3 and pn in w) for w in want) or \
                    (len(st_n) >= 2 and st_n in pn and (len(st_n) >= 4 or kind.search(pn))):
                return {'lat': round(float(doc['y']), 6), 'lon': round(float(doc['x']), 6), 'addr': doc.get('road_address_name') or None,
                        'jibun': doc.get('address_name') or None, 'kname': doc.get('place_name')}, 'ok'
    dong = dong_of(name)
    if dong:
        st, d = kakao(KAKAO_ADDR, dong if sido == '전남광주' else f'{sido} {dong}', key)
        if st != 200:
            return None, 'stop' if st in (0, 401, 403, 429) else 'err'
        docs = [x for x in d.get('documents') or [] if x.get('address_type') in ('REGION', 'REGION_ADDR') and sido_of(x.get('address_name')) == sido]
        if len(docs) == 1:  # 같은 이름 동이 시도 안에 여럿이면 어느 곳인지 몰라 쓰지 않음
            x = docs[0]
            return {'lat': round(float(x['y']), 6), 'lon': round(float(x['x']), 6), 'addr': None, 'jibun': x.get('address_name'), 'dong': dong}, 'ok'
    return None, 'miss'


def region_of(m, regions):
    """시장 좌표·주소 → weather 시군구 코드(collect-parking.py place와 같은 규칙)."""
    where = m.get('addr') or m.get('jibun') or ''
    office, t = P.office_of(where), where.split(' ')
    hit = A.region_code(office, t[1] if len(t) > 1 else '', regions) if office else None
    if not hit and m.get('lat') is not None:
        office = office or P.office_of(m['sido']) or 'B10'
        hit = A.nearest_region({'office': office, 'lat': m['lat'], 'lon': m['lon']}, regions)
    return hit


def area_of(name, sido, regions):
    """이름 속 시군구('익산 다e로움 상권활성화구역', '동작구 LINK …', '해남읍 원도심 …') → 그 시군구(중심 좌표)."""
    cand = [r for r in regions if r['sidoShort'] == sido]
    for r in sorted(cand, key=lambda r: -len(r['name'])):
        full = r['name'].split(' ')[-1]
        stem = re.sub(r'(특별자치시|특별자치도|시|군|구)$', '', full)
        if full in name or (len(stem) >= 2 and re.search(rf'(^|\s){re.escape(stem)}(시|군|구|읍|\s|$)', name)):
            return r
    return None


def region_name(code, name, regions):
    sido = next((x['sidoShort'] for x in regions if x['code'][:2] == code[:2]), '')
    full = name if name.split(' ')[0] == sido else f'{sido} {name}'.strip()
    s, _, rest = full.partition(' ')
    return rest if s == '세종' and rest else full


def hid(*parts, n=8):
    return hashlib.sha1('|'.join(parts).encode()).hexdigest()[:n]


def load_cache():
    try:
        return json.loads(CACHE.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}


def main():
    force = '--force' in sys.argv
    path = sys.argv[sys.argv.index('--csv') + 1] if '--csv' in sys.argv else None
    rows, base = onnuri_rows(path)
    log(f'온누리상품권 가맹점 {len(rows):,}곳 (기준일 {base or "모름"})')
    regions = A.weather_regions()
    std = std_index(std_markets(os.environ.get('DATA_GO_KR_KEY')))

    groups = defaultdict(list)
    for r in rows:
        if r['name'] and r['market']:
            groups[(r['sido'], r['market'])].append(r)
    log(f'시장·상점가 {len(groups):,}곳')

    cache, today = load_cache(), datetime.now(KST).date()
    key = os.environ.get('KAKAO_REST_KEY')
    asked = stop = 0
    markets = []
    for (sido, name), rs in sorted(groups.items(), key=lambda x: -len(x[1])):
        m = {'id': hid(sido, name), 'name': name, 'sido': sido, 'addr': None, 'jibun': None, 'lat': None, 'lon': None, 'geo': None}
        s = std.get((sido, norm(name))) or std.get((sido, norm(base_name(name))))
        if s and s['lat'] is not None:
            m.update({k: s[k] for k in ('addr', 'jibun', 'lat', 'lon')}, geo='std')
        if s:
            m['std'] = {k: v for k, v in s.items() if k not in ('name', 'addr', 'jibun', 'lat', 'lon') and v not in (None, '')}
        if m['geo'] is None:
            ck = f'{sido}|{name}'
            c = cache.get(ck)
            due = c is None or ('miss' in c and (c.get('v', 1) < FIND_V or (today - datetime.fromisoformat(c['miss']).date()).days >= MISS_RETRY_DAYS)) \
                or ('at' in c and A.refresh_due(ck, c['at'], today))
            if due and key and not stop and asked < GEO_LIMIT:
                asked += 1
                got, state = kakao_find(name, sido, key)
                if state == 'stop':
                    stop = 1
                    log('카카오 검색 중단(한도·키 확인)')
                elif state == 'ok':
                    cache[ck] = {**got, 'at': today.isoformat()}
                elif state == 'miss':
                    cache[ck] = {'miss': today.isoformat(), 'v': FIND_V, **({k: c[k] for k in ('lat', 'lon', 'addr', 'jibun', 'kname')} if c and 'lat' in c else {})}
                c = cache.get(ck)
            if c and c.get('lat') is not None:  # 다시 확인에서 못 찾으면 이전 좌표를 그대로(확인한 날만 바뀜)
                m.update({k: c.get(k) for k in ('addr', 'jibun', 'lat', 'lon')}, geo='dong' if c.get('dong') else 'kakao')
        hit = region_of(m, regions) if m['geo'] else None
        if not hit:
            r = area_of(name, sido, regions)
            if r:
                hit = (r['code'], r['name'])
                if m['geo'] is None:
                    m.update(lat=r['lat'], lon=r['lon'], geo='area')
        if hit:
            code, nm = hit
            if ' ' in nm:  # 일반구('수원시 장안구')는 시 코드(충전소·약국·주차장 사이트 지역 페이지와 같은 규칙)
                code, nm = code[:4] + '0', nm.split(' ')[0]
            m['region'], m['region_name'] = code, region_name(code, nm, regions)
        m['rows'] = rs
        markets.append(m)
    log(f'카카오 검색 {asked:,}곳')
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding='utf-8')

    stores, seen, cats = [], set(), Counter()
    latest = max((r['year'] for r in rows if r['year'].isdigit()), default='')
    out_markets = []
    for i, m in enumerate(markets):
        rs = m.pop('rows')
        mc = Counter()
        for r in rs:
            c = cat_of(r['item'], r['name'])
            mc[c] += 1
            cats[c] += 1
            sid = hid(m['id'], r['name'], r['item'], n=10)
            while sid in seen:
                sid = hid(sid, 'x', n=10)
            seen.add(sid)
            # [id, 이름, 시장 번호, 품목 묶음, 취급품목 원문, 디지털 가맹(1/0), 등록년도]
            stores.append([sid, r['name'], i, c, r['item'] or None, 1 if r['digital'].upper() == 'Y' else 0, int(r['year']) if r['year'].isdigit() else None])
        m['n'] = len(rs)
        m['d'] = sum(1 for r in rs if r['digital'].upper() == 'Y')
        m['new'] = sum(1 for r in rs if r['year'] == latest)
        m['cats'] = dict(mc.most_common())
        out_markets.append({k: v for k, v in m.items() if v is not None})
    geo = Counter(m.get('geo') or 'none' for m in out_markets)
    log(f'위치: 표준데이터 {geo["std"]:,} · 카카오 {geo["kakao"]:,} · 시군구 중심 {geo["area"]:,} · 없음 {geo["none"]:,} '
        f'(가맹점 기준 위치 있음 {sum(m["n"] for m in out_markets if m.get("geo") in ("std", "kakao")):,}/{len(stores):,})')
    log(f'품목: {dict(cats.most_common())}')

    prev = None
    try:
        prev = json.loads(OUT.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        pass
    if prev and not force and len(stores) < prev['status']['count'] * 0.8:
        raise SystemExit(f'가맹점 수가 20% 넘게 줄어 멈춤({prev["status"]["count"]:,} → {len(stores):,}) — 확인 후 --force')
    status = {'updated_at': datetime.now(KST).isoformat(timespec='seconds'), 'base': base or (prev or {}).get('status', {}).get('base'),
              'count': len(stores), 'markets': len(out_markets), 'latest_year': int(latest) if latest else None,
              'digital': sum(s[5] for s in stores), 'located': geo['std'] + geo['kakao'] + geo['dong'], 'std': bool(std), 'cats': dict(cats)}
    data = {'status': status, 'markets': out_markets, 'stores': stores}
    if prev and {k: v for k, v in prev.items() if k != 'status'} == {k: v for k, v in data.items() if k != 'status'}:
        log('바뀐 것 없음')
        return
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    log(f'저장 {OUT.relative_to(ROOT)} {OUT.stat().st_size / 1e6:.1f}MB')


if __name__ == '__main__':
    main()
