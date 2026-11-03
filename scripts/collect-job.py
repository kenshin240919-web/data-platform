"""Collect '일자리 찾을 때 가는 곳' for job.guidejung.com (내근처 일자리, A안 — 채용 공고는 싣지 않음):
고용복지플러스센터(관할구역), 유료·무료 직업소개소(인력사무소·간병·가사 등), 여성새로일하기센터, 노인일자리 수행기관, 대학일자리플러스센터
— one list that ships with the site (apps/job/data/places.json).

Sources (reports/job-설계안-2026-11-02.md A장 — 모두 공공데이터포털 이용허락범위 '제한 없음'):
- 고용노동부 고용복지플러스센터 현황(파일 15066368)        133곳 · 청(지청)·센터명·관할구역·소재지·대표전화 · 좌표 없음
- 행정안전부 유료직업소개소(1741000/paid_job_centers)      인허가 이력 약 6만 줄 → 영업 중(SALS_STTS_CD 01)만 · 좌표(CRD_INFO_X/Y)
- 행정안전부 무료직업소개소(1741000/free_job_centers)      약 2,900줄 → 영업 중만
- 성평등가족부 여성새로일하기센터 현황(파일 3034802)       159곳 · 좌표 없음
- 한국노인인력개발원 자립형일자리 수행기관(B552474)        약 1,500곳 · 전화는 원본에서 가려져 있음(******) → 이름·주소만
- 고용노동부 대학일자리플러스센터 운영 현황(파일 15118836)   약 120곳
- 한국산업인력공단 국가자격시험 시험장소(15068172) 지사 00~24 약 2,500줄 — scripts/collect-qnet.py가 받아 둔 qnet-areas.json을 읽음
  → 주소가 같은 곳은 한 곳으로(시험실 목록) · 교도소·가상 시험장은 뺌 · 아직 못 받은 지사는 지난 목록(11/3)
좌표 없는 곳은 카카오 주소 검색(collect-civil.py geocode — 30일마다 다시 확인, 캐시 runtime/job/geo.json).
지역 코드는 날씨 사이트 시군구 코드(일반구는 시 코드 — collect-parking.py place()).
Usage: DATA_GO_KR_KEY=... [KAKAO_REST_KEY=...] python scripts/collect-job.py [--force]
"""
import csv, hashlib, importlib.util, io, json, os, re, statistics, sys, urllib.parse, urllib.request
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


C = _load('civil', 'collect-civil.py')   # pages()·geocode()와 공용 함수(S·K·A)
R = _load('rest', 'collect-rest.py')      # tm5174(): LOCALDATA 좌표(EPSG:5174) → WGS84
S, K, A = C.S, C.K, C.A
log, txt, compact, KST = C.log, C.txt, C.compact, C.KST
OUT = ROOT / 'apps/job/data/places.json'
C.GEO = ROOT / 'runtime/job/geo.json'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
FILES = {'center': ('15066368', 'uddi:28ed10bf-daa5-4f7b-bcc8-c94b0dda4ced'),
         'women': ('3034802', 'uddi:77985499-f34e-462b-8fcd-ae6c0aef67cd'),
         'campus': ('15118836', 'uddi:7c3ec47f-3c54-41d0-8133-dc68cb3d80d6')}
# 애드센스·직업안정법(성매매 업소 구인 금지) 위험이 있는 이름은 싣지 않음.
BLOCK = re.compile(r'유흥|노래|가라오케|룸살롱|주점|보도|텐프로|퍼블릭|다방|티켓|클럽|나이트|호스트|bar\b', re.I)
SUB = [('care', re.compile(r'간병|요양|간호|케어')), ('home', re.compile(r'가사|파출|산후|베이비|도우미|가정|육아|돌봄|청소|홈')),
       ('labor', re.compile(r'인력|용역|건설|노무|일용|잡부')), ('search', re.compile(r'서치|써치|헤드헌|리크루|커리어|HR|에이치알', re.I)),
       ('foreign', re.compile(r'외국인|해외|선원|글로벌'))]
SIDO_ALIAS = {'서울특별시': '11', '서울': '11', '부산광역시': '26', '부산': '26', '대구광역시': '27', '대구': '27', '인천광역시': '28', '인천': '28',
              '광주광역시': '12', '광주': '12', '전라남도': '12', '전남': '12', '전남광주통합특별시': '12', '전남광주': '12',
              '대전광역시': '30', '대전': '30', '울산광역시': '31', '울산': '31', '세종특별자치시': '36', '세종': '36',
              '경기도': '41', '경기': '41', '충청북도': '43', '충북': '43', '충청남도': '44', '충남': '44', '경상북도': '47', '경북': '47',
              '경상남도': '48', '경남': '48', '제주특별자치도': '50', '제주도': '50', '제주': '50', '강원특별자치도': '51', '강원도': '51', '강원': '51',
              '전북특별자치도': '52', '전라북도': '52', '전북': '52'}


def http(url, data=None, headers=None, timeout=120):
    req = urllib.request.Request(url, data=data, headers={'User-Agent': UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def filedata(kind):
    """공공데이터포털 파일데이터(CSV) — 내려받기 버튼과 같은 두 단계. 실패하면 None(지난 목록을 씀)."""
    pk, uddi = FILES[kind]
    ref = {'Referer': f'https://www.data.go.kr/data/{pk}/fileData.do'}
    for n in range(4):
        try:
            j = json.loads(http('https://www.data.go.kr/tcs/dss/selectFileDataDownload.do',
                                urllib.parse.urlencode({'publicDataDetailPk': uddi, 'publicDataPk': pk, 'atchFileId': '', 'fileDetailSn': 1,
                                                        'publicDataTyCode': 'PR0051'}).encode(), {**ref, 'Content-Type': 'application/x-www-form-urlencoded'}))
            raw = http(f'https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId={j["atchFileId"]}&fileDetailSn={j["fileDetailSn"]}', headers=ref)
            for enc in ('utf-8-sig', 'cp949'):
                try:
                    return list(csv.DictReader(io.StringIO(raw.decode(enc))))
                except UnicodeDecodeError:
                    continue
        except Exception as e:  # noqa: BLE001 — 연결 끊김이 잦음
            log(f'  {kind} 파일 시도 {n + 1} 실패: {e}')
    return None


def hid(prefix, *parts):
    return prefix + hashlib.sha1('|'.join(str(p) for p in parts).encode()).hexdigest()[:10]


def col(row, *names):
    for n in names:
        for k, v in row.items():
            if k and k.strip() == n:
                return txt(v)
    return None


def centers():
    rows = filedata('center')
    if rows is None:
        return None
    out = []
    for r in rows:
        name, addr = col(r, '센터명'), col(r, '소재지')
        if not (name and addr):
            continue
        out.append({'id': hid('e', name), 'kind': 'center', 'name': name, 'addr': addr, 'jibun': None, 'lat': None, 'lon': None,
                    'org': col(r, '청(지청)'), 'tel': col(r, '대표전화'), 'juris_text': col(r, '관할구역')})
    log(f'고용복지플러스센터 {len(out):,}곳')
    return out


def women():
    rows = filedata('women')
    if rows is None:
        return None
    out = []
    for r in rows:
        name, addr = col(r, '센터명'), col(r, '주소')
        if not (name and addr):
            continue
        out.append({'id': hid('w', name, addr), 'kind': 'women', 'name': name, 'addr': addr, 'jibun': None, 'lat': None, 'lon': None,
                    'org': f"{col(r, '시도') or ''} {col(r, '기초') or ''}".strip(), 'tel': col(r, '리플릿 번호', '전화번호', '연락처')})
    log(f'여성새로일하기센터 {len(out):,}곳')
    return out


def campus():
    rows = filedata('campus')
    if rows is None:
        return None
    out = []
    for r in rows:
        univ = col(r, '대학', '대학교', '대학명', '학교명')
        addr = col(r, '학교주소', '학교 주소', '주소', '소재지')
        if not (univ and addr):
            continue
        cname = col(r, '센터명') or ''
        out.append({'id': hid('u', univ, addr), 'kind': 'campus', 'name': cname if '센터' in cname else f'{univ} 대학일자리플러스센터', 'addr': addr, 'jibun': None,
                    'lat': None, 'lon': None, 'org': univ, 'tel': col(r, '연락처', '전화번호')})
    log(f'대학일자리플러스센터 {len(out):,}곳 (칸: {", ".join(rows[0].keys()) if rows else "-"})')
    return out


QNET_RAW = ROOT / 'apps/job/data/qnet-areas.json'
EXAM_SKIP = re.compile(r'교도소|구치소|소년원|가상')


def exams(prev_items):
    """국가자격 시험장 — scripts/collect-qnet.py가 지사별로 받아 둔 apps/job/data/qnet-areas.json을 읽음(큐넷이 해외에서 자주 끊겨
    매시간 못 받은 지사만 다시 시도). 주소가 같은 줄(같은 학교의 여러 시험실)은 한 곳으로 묶고 rooms에 시험실 이름. 없는 지사는 지난 목록."""
    raw = json.loads(QNET_RAW.read_text(encoding='utf-8')) if QNET_RAW.exists() else {}
    rows, failed = [], []
    for b in range(25):
        code = f'{b:02d}'
        got = (raw.get(code) or {}).get('rows')
        if got is None:
            failed.append(code)
        else:
            rows += [dict(r, _b=code) for r in got]
    if not rows:
        return None
    if rows:
        log(f'  시험장 칸: {", ".join(k for k in rows[0] if k != "_b")} · 안내 칸 예: {[r.get("plceLoctGid") for r in rows if r.get("plceLoctGid")][:3]}')
    groups, skipped = {}, 0
    for r in rows:
        name, addr = txt(r.get('examAreaNm')), txt(r.get('address'))
        if not (name and addr) or EXAM_SKIP.search(name) or EXAM_SKIP.search(r.get('examAreaGbNm') or ''):
            skipped += 1
            continue
        addr = re.sub(r'\s+', ' ', addr)
        k = re.sub(r'\s*\([^()]*\)\s*$', '', addr).replace(' ', '')
        groups.setdefault(k, []).append((name, addr, r))
    out = []
    for k, g in groups.items():
        base = sorted({re.sub(r'\s*[\[(][^\])]*[\])]\s*$', '', n).strip() or n for n, _, _ in g}, key=len)[0]
        r0 = g[0][2]
        rooms = sorted({n for n, _, _ in g if n != base})
        gb = Counter(txt(x.get('examAreaGbNm')) for _, _, x in g if txt(x.get('examAreaGbNm'))).most_common(1)
        guide = next((txt(x.get('plceLoctGid')) for _, _, x in g if txt(x.get('plceLoctGid'))), None)
        out.append({'id': hid('q', k), 'kind': 'exam', 'name': base, 'addr': g[0][1], 'jibun': None, 'lat': None, 'lon': None,
                    'org': f"한국산업인력공단 {txt(r0.get('brchNm')) or ''}".strip(), 'tel': txt(r0.get('telNo')), 'brch': r0['_b'],
                    'gb': gb[0][0] if gb else None, 'rooms': rooms[:20] or None, 'guide': guide[:300] if guide else None})
    if failed:
        keep = [dict(p) for p in prev_items if p['kind'] == 'exam' and p.get('brch') in failed]
        have = {p['id'] for p in out}
        out += [p for p in keep if p['id'] not in have]
        log(f'  시험장 못 받은 지사 {", ".join(failed)} → 지난 목록 {len(keep):,}곳')
    log(f'국가자격 시험장 {len(out):,}곳 (원본 {len(rows):,}줄, 교도소·가상·빈 주소 {skipped:,}줄 뺌) · 구분 {Counter(p.get("gb") for p in out).most_common(6)}')
    return out


def lonlat(x, y):
    """CRD_INFO_X/Y: 경위도면 그대로, 아니면 LOCALDATA와 같은 EPSG:5174로 보고 바꿈."""
    try:
        x, y = float(x), float(y)
    except (TypeError, ValueError):
        return None, None
    if 124 < x < 132 and 33 < y < 39:
        return round(y, 6), round(x, 6)
    if x and y:
        la, lo = R.tm5174(x, y)
        return S.coord(la, lo)
    return None, None


def agencies(key, kind):
    path = '1741000/paid_job_centers/info' if kind == 'agency' else '1741000/free_job_centers/info'
    rows = C.pages(path, key, rows=100)  # 이 API는 한 쪽에 100줄까지만 줌(1,000을 달라 해도 100 — 11/2 첫 수집에서 확인)
    if rows is None:
        return None
    log(f'  {kind} 영업상태: {Counter((r.get("SALS_STTS_CD"), r.get("SALS_STTS_NM")) for r in rows).most_common(8)}')
    out, blocked, seen = [], 0, set()
    for r in rows:
        if txt(r.get('SALS_STTS_CD')) != '01':
            continue
        name = txt(r.get('BPLC_NM'))
        addr, jibun = txt(r.get('ROAD_NM_ADDR')), txt(r.get('LOTNO_ADDR'))
        if not name or not (addr or jibun):
            continue
        if BLOCK.search(name):
            blocked += 1
            continue
        pid = hid('a' if kind == 'agency' else 'f', txt(r.get('MNG_NO')) or f'{name}|{addr or jibun}')
        if pid in seen:
            continue
        seen.add(pid)
        lat, lon = lonlat(r.get('CRD_INFO_X'), r.get('CRD_INFO_Y'))
        since = (txt(r.get('LCPMT_YMD')) or '')[:4]
        out.append({'id': pid, 'kind': kind, 'name': name, 'addr': addr, 'jibun': jibun, 'lat': lat, 'lon': lon, 'org': None,
                    'tel': txt(r.get('TELNO')), 'sub': next((s for s, rx in SUB if rx.search(name)), None) if kind == 'agency' else None,
                    'corp': txt(r.get('CORP_SE_NM')), 'since': since if since.isdigit() else None})
    log(f'{"유료" if kind == "agency" else "무료"}직업소개소 영업 중 {len(out):,}곳 (이름으로 뺀 곳 {blocked:,}) · 좌표 {sum(1 for p in out if p["lat"] is not None):,}')
    return out


def seniors(key):
    rows = C.pages('B552474/JobBsnInfoService/getJobOperInsttList', key, rows=100, extra={'_type': 'json'})
    if rows is None:
        return None
    out = []
    for r in rows:
        name = txt(r.get('orgName'))
        addr = ' '.join(x for x in (txt(r.get('zipAddr')), txt(r.get('dtlAddr'))) if x)
        if not (name and addr):
            continue
        tel = txt(r.get('telNum'))
        out.append({'id': 's' + (txt(r.get('orgCd')) or hid('', name, addr)), 'kind': 'senior', 'name': name, 'addr': re.sub(r'\s+', ' ', addr), 'jibun': None,
                    'lat': None, 'lon': None, 'org': txt(r.get('orgTypeNm')), 'tel': tel if tel and '*' not in tel else None})
    log(f'노인일자리 수행기관 {len(out):,}곳')
    return out


def jurisdictions(items):
    """고용센터 관할구역 글('서울특별시 중구ㆍ종로구ㆍ동대문구', '경기도 수원시 장안구ㆍ권선구')을 우리 지역 코드 목록으로."""
    names = defaultdict(set)  # (시도 코드, 낱말) → 지역 코드
    for p in items:
        sido = p['region'][:2]
        rest = p['region_name'].split(' ')
        for w in rest:
            names[(sido, w)].add(p['region'])
    for p in items:
        if p['kind'] != 'center':
            continue
        text = p.get('juris_text') or ''
        # 괄호: '창원시(의창구성산구진해구)'·'칠곡군(석적읍 … 제외)'는 앞 낱말 전체를 관할로, '칠곡군(석적읍 중리 국가 산업단지)'처럼
        # 일부 지역만 맡는 경우는 앞 낱말을 뺌(그 군은 따로 있는 센터가 맡음).
        text = re.sub(r'([^\sㆍ·,/?]+)\(([^)]*)\)', lambda m: m.group(1) if ('제외' in m.group(2) or re.fullmatch(r'(\S+구)+', m.group(2).replace(' ', ''))) else '', text)
        sido = p['region'][:2]
        codes = []
        for part in re.split(r'[ㆍ·,/?]|\s및\s', text):
            ws = [w.strip('() ') for w in part.split() if w.strip('() ')]
            hit_any = False
            for w in ws:
                if w in SIDO_ALIAS:
                    sido = SIDO_ALIAS[w]
                    continue
                hit = names.get((sido, w))
                if not hit and len(w) > 1 and not w.endswith(('시', '군', '구')):
                    hit = names.get((sido, w + '시')) or names.get((sido, w + '군'))
                for c in sorted(hit or ()):
                    hit_any = True
                    if c not in codes:
                        codes.append(c)
            # '대전광역시'·'제주도'처럼 시도 이름만 있으면 그 시도 전체
            if ws and all(w in SIDO_ALIAS for w in ws) and not hit_any:
                for c in sorted({q['region'] for q in items if q['region'][:2] == sido}):
                    if c not in codes:
                        codes.append(c)
        p['juris'] = codes or [p['region']]
    centers = [p for p in items if p['kind'] == 'center']
    covered = {c for p in centers for c in p['juris']}
    all_regions = {p['region'] for p in items}
    log(f'관할 지역을 찾은 고용센터 {sum(1 for p in centers if p.get("juris_text") and len(p["juris"]) >= 1):,}/{len(centers):,} · 관할 센터가 정해진 시군구 {len(covered & all_regions):,}/{len(all_regions):,}')
    miss = sorted({p['region_name'] for p in items if p['region'] not in covered})
    if miss:
        log(f'  관할 센터를 못 찾은 시군구(가장 가까운 센터로 안내): {miss[:40]}')


W24 = 'https://www.work24.go.kr/cm/c/d/0190/retrieveInstSrchLst.do'


def homepages(items, prev_by_id):
    """고용센터 홈페이지: 고용24 '기관찾기'(고용노동부 공식) 목록에 적힌 센터별 주소. 이름(…고용센터/…고용복지플러스센터)이나
    대표전화로 맞춤. 못 받으면 지난 주소를 그대로."""
    norm = lambda s: re.sub(r'(고용복지플러스센터|고용복지센터|고용센터|출장센터|출장소|센터)$', '', (s or '').replace(' ', ''))
    digits = lambda s: re.sub(r'\D', '', s or '')
    rows = []
    try:
        for page in range(1, 6):
            q = urllib.parse.urlencode({'currentPageNo': page, 'recordCountPerPage': 100, 'tabNo': 1, 'bbsUrl': '/c/d/0190/retrieveInstSrchLstViewPost.do'})
            html = http(f'{W24}?{q}', timeout=60).decode('utf-8', 'replace')
            got = re.findall(r"fn_showMap\('([^']*)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'([^']*)',\s*'([^']*)'\)", html)
            rows += got
            if len(got) < 100:
                break
    except Exception as e:  # noqa: BLE001
        log(f'고용24 기관찾기 실패: {e}')
        rows = []
    by_name = {norm(n): h for n, _, h in rows if h}
    by_tel = {digits(t): h for _, t, h in rows if h and digits(t)}
    hit = 0
    for p in items:
        if p['kind'] != 'center':
            continue
        h = by_name.get(norm(p['name'])) or by_tel.get(digits(p.get('tel')))
        if h:
            p['hp'] = h if h.startswith('http') else 'https://' + h.lstrip('/')
            hit += 1
        elif not rows and (prev_by_id.get(p['id']) or {}).get('hp'):
            p['hp'] = prev_by_id[p['id']]['hp']
    log(f'고용센터 홈페이지(고용24 기관찾기 {len(rows)}곳) 연결 {hit}/{sum(1 for p in items if p["kind"] == "center")}')


def check_coords(items, key):
    """원본 좌표(직업소개소)가 맞는지: 표본 20곳을 카카오 주소 좌표와 비교해 중앙값 거리를 남김."""
    sample = [p for p in items if p['kind'] in ('agency', 'free') and p['lat'] is not None and p.get('addr')][:20]
    ds = []
    for p in sample:
        st, d = K.http_json(f'{K.KAKAO}?{urllib.parse.urlencode({"query": p["addr"]})}', {'Authorization': f'KakaoAK {key}'}, timeout=15, tries=2)
        docs = (d or {}).get('documents') or [] if st == 200 else []
        if docs:
            ds.append(S.dist(p['lat'], p['lon'], float(docs[0]['y']), float(docs[0]['x'])) if hasattr(S, 'dist') else
                      ((p['lat'] - float(docs[0]['y'])) ** 2 + ((p['lon'] - float(docs[0]['x'])) * 0.8) ** 2) ** .5 * 111)
    if ds:
        log(f'좌표 점검(직업소개소 원본 vs 카카오 주소) 표본 {len(ds)}곳 · 거리 중앙값 {statistics.median(ds) * 1000:.0f}m · 최대 {max(ds) * 1000:.0f}m')


def main():
    args = sys.argv[1:]
    key = os.environ.get('DATA_GO_KR_KEY', '').strip()
    if not key:
        raise SystemExit('DATA_GO_KR_KEY missing')
    now = datetime.now(KST)
    regions = A.weather_regions()
    prev = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    prev_items = prev.get('items') or []
    prev_by_id = {p['id']: p for p in prev_items}
    prev_kind = defaultdict(list)
    for p in prev_items:
        prev_kind[p['kind']].append(p)
    got = {'center': centers(), 'agency': agencies(key, 'agency'), 'free': agencies(key, 'free'), 'women': women(), 'senior': seniors(key), 'campus': campus(),
           'exam': exams(prev_items)}
    items = []
    for kind, rows in got.items():
        if rows is None:
            log(f'{kind}: 받지 못해 지난 목록 {len(prev_kind[kind]):,}곳을 씁니다')
            rows = [dict(p, jibun=p.get('jibun'), addr=p.get('addr'), org=p.get('org')) for p in prev_kind[kind]]
        items += rows
    for p in items:  # 원본에 좌표가 없어 카카오로 받았던 곳은 지난 좌표를 그대로(30일마다 다시 확인)
        q = prev_by_id.get(p['id'])
        if p['lat'] is None and q and q.get('lat') is not None and q.get('addr') == p.get('addr'):
            p['lat'], p['lon'], p['geo_at'] = q['lat'], q['lon'], q.get('geo_at') or ''
    kakao = os.environ.get('KAKAO_REST_KEY', '').strip()
    if kakao:
        check_coords(items, kakao)
        C.geocode(items, kakao)
    items = K.place(items, regions)
    jurisdictions(items)
    homepages(items, prev_by_id)
    items = [compact(p) for p in items]
    items.sort(key=lambda p: (p['region'], p['kind'], p['name'], p['id']))
    if prev_items and len(items) < len(prev_items) * 0.8 and '--force' not in args:
        raise SystemExit(f'장소 수가 {len(prev_items):,} → {len(items):,}로 20% 넘게 줄어 중단합니다 (--force로 무시)')
    kinds = Counter(p['kind'] for p in items)
    status = {'updated_at': now.isoformat(timespec='seconds'), 'count': len(items), 'kinds': dict(kinds),
              'with_coords': sum(1 for p in items if p.get('lat') is not None)}
    if prev and prev.get('items') == items:
        log('변경 없음')
        return
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'status': status, 'items': items}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    log(f"일자리 기관 {len(items):,}곳 {dict(kinds)} · 좌표 {status['with_coords']:,} · 지역 {len({p['region'] for p in items})} · 파일 {OUT.stat().st_size / 1e6:.1f}MB")
    log('유료직업소개소 종류', Counter(p.get('sub') or 'etc' for p in items if p['kind'] == 'agency').most_common())


if __name__ == '__main__':
    main()
