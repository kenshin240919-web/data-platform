"""Collect 민원·서류 places for minwon.guidejung.com (내근처 서류): 무인민원발급기(운영 시간·뗄 수 있는 서류), 주민센터·행정복지센터,
실시간 대기 현황을 주는 시·구청 민원실, 우체국, 여권 발급 기관 — one list that ships with the site (apps/civil/data/places.json).

Sources (reports/civil-설계안-2026-10-27.md 1장; DATA_GO_KR_KEY, 10/27 활용신청 4건 — 모두 이용허락범위 제한 없음):
- 행정안전부 무인민원발급기 정보 kiosk_info/installation_info  5,814대 · 평일/공휴일 운영 시각 · 장애인 편의 9종 · 좌표 없음
                                kiosk_info/certificate_info   약 53만 줄(발급기 × 서류) — 처음 한 번 전체, 이후 DAT_UPDT_PNT로 바뀐 줄만(I·U·D)
- 행정안전부·한국지역정보개발원 민원실 cso_v2/cso_info_v2      실시간 대기를 주는 시·구청 민원실 44곳(좌표·야간·주말 운영) — 대기 인원은 Worker가 방문 때
- 우정사업본부 우체국 정보 TbPoInfoListApi/getEpsotData       3,264곳 · 우편/금융 업무 시간 · 좌표 없음
- 외교부 여권사무대행기관 PassportAgencyInfoService            252곳 · 좌표 · 업무 시간 · 야간 연장
- 행정안전부 읍면동 하부행정기관 현황(파일 15059715)           주민센터 3,556곳 · 주소만
Rows without coordinates keep the previous run's or get them from Kakao (KAKAO_REST_KEY, 30-day refresh — collect-parking.py
geocode()). Region codes are the weather site's 시군구 codes (collect-parking.py place()).
Usage: DATA_GO_KR_KEY=... [KAKAO_REST_KEY=...] python scripts/collect-civil.py [--force] [--full-docs] [--no-docs: 시험용, 서류를 받지 않음(하루 한도 아끼기)]
"""
import csv, hashlib, importlib.util, io, json, os, re, sys, urllib.parse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('service', ROOT / 'scripts/collect-service.py')
S = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(S)
K, A = S.K, S.A
KST, log, txt, compact = S.KST, S.log, S.txt, S.compact
OUT = ROOT / 'apps/civil/data/places.json'
RAW = ROOT / 'runtime/civil/docs.json'  # 발급기별 서류 원본(약 7MB) — 사이트에 싣지 않고 Actions cache에 둔다
API = 'https://apis.data.go.kr'
EMD_FILE = 'https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000003620457&fileDetailSn=1&insertDataPrcus=N'
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
      'Referer': 'https://www.data.go.kr/data/15059715/fileData.do'}
A11Y = {'FRBLND_KPD': '시각장애인 키패드', 'FRBLND_VOICE_GD': '음성 안내', 'FRDEAF_SCRN_GD': '청각장애인 화면 안내', 'BRL_LBL_ATCMNT': '점자 라벨',
        'EPHN_SCKT': '이어폰 소켓', 'TCTL_ELCTNC_MONITOR': '촉각 모니터', 'SCRN_EXPSN_FWK': '화면 확대', 'WHCHR_USER_MNPLT': '휠체어 사용자 조작'}
YES = {'제공', '부착', '가능', '발급', 'Y'}


def tm(v):
    """'08:00'·'0800'·'090000' → '08:00' (24:00까지)."""
    d = re.sub(r'\D', '', str(v or ''))
    if len(d) in (3, 4, 6):
        d = d.zfill(4) if len(d) < 6 else d[:4]
        h, m = int(d[:2]), int(d[2:4])
        if 0 <= h <= 24 and 0 <= m < 60:
            return f'{h:02d}:{m:02d}'
    return None


def span(b, e):
    b, e = tm(b), tm(e)
    return [b, e] if b and e and b != e else None


import time
START = time.monotonic()
BUDGET_MIN = float(os.environ.get('CIVIL_BUDGET_MIN') or 80)  # 이 시간이 지나면 받던 것을 멈추고 지금까지 것을 저장(다음 실행이 이어서)
left = lambda: BUDGET_MIN * 60 - (time.monotonic() - START)


def get(url, timeout=60):
    st, d = A.http_json(url, timeout=timeout)
    return d if st == 200 else None


def pages(path, key, rows=100, extra=None, threads=8):
    """data.go.kr 표준 응답(response.body.items.item) 전체 쪽을 병렬로. 첫 쪽에서 totalCount를 보고 나머지를 받는다."""
    def one(page):
        q = urllib.parse.urlencode({'serviceKey': key, 'pageNo': page, 'numOfRows': rows, 'returnType': 'json', 'type': 'json', **(extra or {})})
        for _ in range(3):
            if left() < 0:
                return None
            d = get(f'{API}/{path}?{q}', 40)
            try:
                body = d['response']['body'] if 'response' in d else d['body']
                it = (body.get('items') or {}).get('item') or []
                return int(body.get('totalCount') or 0), it if isinstance(it, list) else [it]
            except (TypeError, KeyError, AttributeError):
                continue
        return None
    first = one(1)
    if first is None:
        log(f'  {path}: 첫 쪽 실패')
        return None
    total, out = first
    n = -(-total // rows)
    log(f'  {path} {extra or ""}: 전체 {total:,}줄 · {n:,}쪽')
    if n > 1:
        with ThreadPoolExecutor(threads) as ex:
            res = list(ex.map(one, range(2, n + 1)))
        bad = sum(1 for r in res if r is None)
        if bad:
            log(f'  {path}: 실패한 쪽 {bad:,}')
            if bad > n * 0.02:
                return None
        for r in res:
            if r:
                out += r[1]
    return out


def kiosks(key):
    rows = pages('1741000/kiosk_info/installation_info', key)
    if rows is None:
        return None
    out, skip = [], Counter()
    for r in rows:
        if txt(r.get('USE_YN_NM')) not in (None, '사용', 'Y'):
            skip['사용 안 함'] += 1
            continue
        org, no = txt(r.get('OPN_ATMY_GRP_CD')), txt(r.get('MNG_NO'))
        name, addr = txt(r.get('ISSUMCHN_NM')), txt(r.get('INSTL_PLC_ADDR'))
        if not (org and no and name and addr):
            skip['이름·주소 없음'] += 1
            continue
        out.append({'id': f'k{org}-{no}', 'kind': 'kiosk', 'name': name, 'addr': addr, 'jibun': None, 'lat': None, 'lon': None,
                    'spot': txt(r.get('INSTL_PLC_DTL_PSTN')), 'at': txt(r.get('INSTL_PLC_PSTN')), 'org': txt(r.get('MNG_INST_NM')),
                    'wk': span(r.get('WKDY_OPER_BGNG_TM'), r.get('WKDY_OPER_END_TM')), 'hol': span(r.get('LHLDY_OPER_BGNG_TM'), r.get('LHLDY_OPER_END_TM')),
                    'note': txt(r.get('OPER_HR_REF_CN')), 'url': txt(r.get('INSTL_OPER_URL')),
                    'a11y': [v for k, v in A11Y.items() if txt(r.get(k)) in YES],
                    'reg': txt(r.get('RG_MTTR_PRDOC_ISSU_SE')) in YES, 'fam': txt(r.get('FAM_REL_DEL_ISSU_SE')) in YES,
                    '_key': f'{org}-{no}'})
    log(f'무인민원발급기 {len(out):,}대', dict(skip))
    return out


def docs(key, prev, full):
    """발급기별 서류: {발급기 key: {서류번호,…}}, 서류표 {번호: [이름, 분류]}. 처음엔 전체, 이후 지난 실행 시각부터 바뀐 줄만."""
    table = {k: v for k, v in (prev.get('doc_table') or {}).items()}
    by = {k: set(v) for k, v in (prev.get('doc_by') or {}).items()}
    since = prev.get('docs_at')
    extra = None
    if since and not full and by:
        extra = {'cond[DAT_UPDT_PNT::GTE]': (datetime.fromisoformat(since) - timedelta(days=2)).strftime('%Y%m%d%H%M%S')}
    else:
        by = {}
    rows = pages('1741000/kiosk_info/certificate_info', key, extra=extra, threads=16)
    if rows is None:
        log('서류 목록을 받지 못해 지난 목록을 씁니다')
        return table, by, since
    ch = Counter()
    for r in rows:
        k = f"{txt(r.get('OPN_ATMY_GRP_CD'))}-{txt(r.get('ISSUMCHN_NO'))}"
        no, nm = txt(r.get('CVLCPT_OFCWORK_CLSF_NO')), txt(r.get('CVLCPT_OFCWORK_CLSF_NM'))
        if not no:
            continue
        se = txt(r.get('DAT_UPDT_SE')) or 'I'
        ch[se] += 1
        if se == 'D':
            by.get(k, set()).discard(no)
            continue
        if nm:
            table[no] = [nm, txt(r.get('INITA_MENU_NM')) or '']
        by.setdefault(k, set()).add(no)
    log(f"서류 줄 {len(rows):,} {dict(ch)} · 서류 종류 {len(table):,} · 발급기 {len(by):,}대")
    return table, by, datetime.now(KST).isoformat(timespec='seconds')


def offices():
    """주민센터·행정복지센터 3,556곳(행정안전부 파일). 받지 못하면 None(지난 목록)."""
    try:
        import requests
        r = requests.get(EMD_FILE, headers=UA, timeout=120)
        r.raise_for_status()
        text = r.content.decode('utf-8-sig', errors='replace')
    except Exception as e:  # noqa: BLE001
        log(f'주민센터 파일 실패: {e}')
        return None
    out = []
    for row in csv.DictReader(io.StringIO(text)):
        name, addr = txt(row.get('읍면동')), txt(row.get('주소'))
        if not (name and addr):
            continue
        sido, sgg = txt(row.get('시도')) or '', txt(row.get('시군구')) or ''
        pid = 'o' + hashlib.sha1(f'{sido}|{sgg}|{name}'.encode()).hexdigest()[:10]
        out.append({'id': pid, 'kind': 'office', 'name': name, 'addr': addr, 'jibun': None, 'lat': None, 'lon': None, 'org': f'{sido} {sgg}'.strip(),
                    'zip': (txt(row.get('우편번호')) or '').zfill(5) or None})
    log(f'주민센터 {len(out):,}곳')
    return out


def csos(key):
    d = get(f"{API}/B551982/cso_v2/cso_info_v2?{urllib.parse.urlencode({'serviceKey': key, 'pageNo': 1, 'numOfRows': 500, 'type': 'json'})}")
    try:
        rows = d['body']['items']['item']
    except (TypeError, KeyError):
        log('민원실 기본 정보 실패')
        return None
    rows = rows if isinstance(rows, list) else [rows]
    out = []
    for r in rows:
        lat, lon = S.coord(r.get('lat'), r.get('lot'))
        out.append({'id': f"c{txt(r.get('csoSn'))}", 'kind': 'cso', 'name': txt(r.get('csoNm')), 'addr': txt(r.get('roadNmAddr')), 'jibun': txt(r.get('lotnoAddr')),
                    'lat': lat, 'lon': lon, 'org': None, 'stdg': txt(r.get('stdgCd')), 'cso': txt(r.get('csoSn')), 'wk': span(r.get('wkdyOperBgngTm'), r.get('wkdyOperEndTm')),
                    'night': txt(r.get('nghtDowExpln')) if txt(r.get('nghtOperYn')) == 'Y' else None,
                    'weekend': txt(r.get('wkndDowExpln')) or '주말 운영' if txt(r.get('wkndOperYn')) == 'Y' else None})
    log(f'실시간 대기 민원실 {len(out):,}곳')
    return out


def posts(key):
    rows = pages('1721301/TbPoInfoListApi/getEpsotData', key, rows=1000)
    if rows is None:
        return None
    out, seen = [], set()
    for r in rows:
        name, addr = txt(r.get('wtjrPstofcNm')) or txt(r.get('ovrpoNm')), txt(r.get('pstofcAddr'))
        if not (name and addr):
            continue
        pid = 'p' + (txt(r.get('pstofcSeCd')) or hashlib.sha1(f'{name}|{addr}'.encode()).hexdigest()[:10])
        if pid in seen:
            continue
        seen.add(pid)
        out.append({'id': pid, 'kind': 'post', 'name': name, 'addr': addr, 'jibun': None, 'lat': None, 'lon': None, 'org': txt(r.get('ovrpoNm')),
                    'tel': txt(r.get('pstofcTelNo')), 'zip': txt(r.get('pstofcZip')), 'mail': txt(r.get('postBizHr')), 'bank': txt(r.get('finBizHr'))})
    log(f'우체국 {len(out):,}곳')
    return out


def passports(key):
    import xml.etree.ElementTree as ET
    q = urllib.parse.urlencode({'serviceKey': key, 'pageNo': 1, 'numOfRows': 1000})
    try:
        import requests
        root = ET.fromstring(requests.get(f'{API}/1262000/PassportAgencyInfoService/getPassportAgencyInfo?{q}', timeout=90).content)
    except Exception as e:  # noqa: BLE001
        log(f'여권 기관 실패: {e}')
        return None
    out = []
    for it in root.iter('item'):
        g = lambda k: txt(it.findtext(k))
        addr = re.sub(r'^\(\d{5}\)\s*', '', g('address') or '')
        lat, lon = S.coord(g('latitude'), g('longitude'))
        gu = (g('gu') or '').replace('-', ' ')
        name = f"{g('city') or ''} {gu} {g('org') or '여권민원실'}".strip()
        pid = 'v' + hashlib.sha1(f'{name}|{addr}'.encode()).hexdigest()[:10]
        ext = g('timeExt')
        out.append({'id': pid, 'kind': 'passport', 'name': name, 'addr': addr or None, 'jibun': None, 'lat': lat, 'lon': lon, 'org': None, 'tel': g('tel'),
                    'hours': g('operationTime'), 'ext': ext if ext and ext != '-' else None, 'url': g('hpUrl'), 'note': g('comment')})
    log(f'여권 발급 기관 {len(out):,}곳')
    return out


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
    got = {'kiosk': kiosks(key), 'office': offices(), 'cso': csos(key), 'post': posts(key), 'passport': passports(key)}
    items = []
    for kind, rows in got.items():
        if rows is None:
            log(f'{kind}: 받지 못해 지난 목록 {len(prev_kind[kind]):,}곳을 씁니다')
            rows = [dict(p, jibun=p.get('jibun'), addr=p.get('addr')) for p in prev_kind[kind]]
        items += rows
    # 서류: 발급기마다 서류 번호를 작은 숫자 목록으로(서류표는 한 번만)
    raw = json.loads(RAW.read_text(encoding='utf-8')) if RAW.exists() else {}
    table, by, docs_at = (raw.get('doc_table') or {}, {k: set(v) for k, v in (raw.get('doc_by') or {}).items()}, raw.get('docs_at')) if '--no-docs' in args else docs(key, raw, '--full-docs' in args)
    order = sorted(table, key=lambda n: (table[n][1], table[n][0]))
    idx = {n: i for i, n in enumerate(order)}
    matched = 0
    for p in items:
        if p['kind'] == 'kiosk':
            ks = by.get(p.pop('_key', ''), set())
            if ks:
                matched += 1
            p['docs'] = sorted(idx[n] for n in ks if n in idx)
    log(f"서류 목록이 붙은 발급기 {matched:,}/{sum(1 for p in items if p['kind'] == 'kiosk'):,}")
    for p in items:  # 원본에 좌표가 없어 카카오로 받았던 곳은 지난 좌표를 그대로(30일마다 다시 확인)
        q = prev_by_id.get(p['id'])
        if p['lat'] is None and q and q.get('lat') is not None and q.get('addr') == p.get('addr'):
            p['lat'], p['lon'], p['geo_at'] = q['lat'], q['lon'], q.get('geo_at') or ''
    kakao = os.environ.get('KAKAO_REST_KEY', '').strip()
    if kakao:
        # 첫 실행 약 12,600곳(발급기·주민센터·우체국)은 한 번에 다 못 해서 남은 시간만큼(약 0.25초/곳) — 나머지는 다음 실행이 이어서
        K.GEO_LIMIT = max(0, min(15000, int(left() / 0.3) - 200))
        log(f'좌표 변환 이번 한도 {K.GEO_LIMIT:,}곳 (남은 시간 {left() / 60:.0f}분)')
        K.geocode(items, kakao)
    placed = K.place(items, regions)
    items = [compact(p) for p in placed]
    for p in items:
        p.pop('_key', None)
    items.sort(key=lambda p: (p['region'], p['kind'], p['name'], p['id']))
    if prev_items and len(items) < len(prev_items) * 0.9 and '--force' not in args:
        raise SystemExit(f'민원 장소 수가 {len(prev_items):,} → {len(items):,}로 10% 넘게 줄어 중단합니다 (--force로 무시)')
    doc_list = [table[n] for n in order]
    kinds = Counter(p['kind'] for p in items)
    status = {'updated_at': now.isoformat(timespec='seconds'), 'count': len(items), 'kinds': dict(kinds), 'docs': len(doc_list),
              'with_coords': sum(1 for p in items if p.get('lat') is not None)}
    RAW.parent.mkdir(parents=True, exist_ok=True)
    RAW.write_text(json.dumps({'doc_table': table, 'doc_by': {k: sorted(v) for k, v in by.items()}, 'docs_at': docs_at}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    data = {'status': status, 'docs': doc_list, 'items': items}
    if prev and prev.get('items') == items and prev.get('docs') == doc_list:
        log('변경 없음')
        return
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    log(f"민원·서류 {len(items):,}곳 {dict(kinds)} · 좌표 {status['with_coords']:,} · 서류 {len(doc_list):,}종 · 파일 {OUT.stat().st_size / 1e6:.1f}MB")
    log('서류 많이 뗄 수 있는 분류', Counter(m for _, m in doc_list).most_common(20))


if __name__ == '__main__':
    main()
