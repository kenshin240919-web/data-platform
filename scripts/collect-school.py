"""Collect every school for school.guidejung.com (내 학교) from the NEIS open API (schoolInfo) and geocode the addresses.

Schools change rarely, so the whole list is small enough (about 12,600) to ship with the site: the result
apps/school/data/schools.json is committed and both the static pages and the Worker import it (no database).
Meals, the school calendar and timetables are not collected: the Worker fetches them per school when someone visits.

Coordinates of an unchanged address are kept from the previous schools.json; only new addresses go to Kakao Local.
Region codes are the weather site's 시군구 codes (same rules as scripts/collect-academy.py).
Runs daily in GitHub Actions (.github/workflows/school-collect.yml).
Usage: NEIS_API_KEY=... KAKAO_REST_KEY=... python scripts/collect-school.py [--force]
"""
import importlib.util, json, os, sys, urllib.parse
from collections import Counter
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('academy', ROOT / 'scripts/collect-academy.py')
A = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(A)
OFFICES, KST, log, http_json, clean = A.OFFICES, A.KST, A.log, A.http_json, A.clean
OUT = ROOT / 'apps/school/data/schools.json'
NEIS = 'https://open.neis.go.kr/hub/schoolInfo'
# 학교 종류 → 사이트 분류(시간표 API도 이걸로 고름). 공동실습소는 학생이 다니는 학교가 아니라 뺌.
KINDS = {'초등학교': 'elem', '중학교': 'middle', '고등학교': 'high', '특수학교': 'special', '각종학교(초)': 'elem', '각종학교(중)': 'middle',
         '각종학교(고)': 'high', '방송통신중학교': 'middle', '방송통신고등학교': 'high', '고등기술학교': 'high', '외국인학교': 'other', '대안학교': 'other'}


def neis_rows(key):
    rows = []
    for code in OFFICES:
        page, total = 1, None
        while total is None or (page - 1) * 1000 < total:
            q = urllib.parse.urlencode({'KEY': key, 'Type': 'json', 'pIndex': page, 'pSize': 1000, 'ATPT_OFCDC_SC_CODE': code})
            st, d = http_json(f'{NEIS}?{q}')
            if st != 200 or 'schoolInfo' not in d:
                raise SystemExit(f'NEIS {code} page {page}: {st} {str(d)[:200]}')
            head, body = d['schoolInfo']
            total = head['head'][0]['list_total_count']
            rows += body['row']
            page += 1
        log(f'NEIS {code} {OFFICES[code]} {total:,}곳')
    return rows


def build(rows, today):
    out, skipped = [], Counter()
    for r in rows:
        code, name, kind = clean(r.get('SD_SCHUL_CODE')), clean(r.get('SCHUL_NM')), clean(r.get('SCHUL_KND_SC_NM'))
        if not code or not name:
            skipped['학교코드·이름 없음'] += 1
            continue
        if (r.get('FOND_YMD') or '') > today or name.startswith('(가칭)'):
            skipped['개교 전'] += 1
            continue
        k = KINDS.get(kind or '')
        if not k:
            skipped[kind or '종류 없음'] += 1
            continue
        hp = clean(r.get('HMPG_ADRES'))
        if hp and not hp.startswith('http'):
            hp = 'http://' + hp
        tel = clean(r.get('ORG_TELNO'))
        out.append({
            'code': code, 'office': r['ATPT_OFCDC_SC_CODE'], 'name': name, 'eng': clean(r.get('ENG_SCHUL_NM')), 'kind': kind, 'k': k,
            'found': clean(r.get('FOND_SC_NM')), 'coedu': clean(r.get('COEDU_SC_NM')), 'hs': clean(r.get('HS_SC_NM')),
            'address': clean(r.get('ORG_RDNMA')), 'detail': clean(r.get('ORG_RDNDA')), 'zip': clean(r.get('ORG_RDNZC')),
            'tel': None if tel and A.PLACEHOLDER_TEL.match(tel) else tel, 'homepage': hp, 'night': clean(r.get('DGHT_SC_NM')) == '야간',
            'founded': clean(r.get('FOND_YMD')), 'org': clean(r.get('JU_ORG_NM')),
        })
    log('뺀 학교', dict(skipped))
    return out


def zone_of(address):
    """'경기도 수원시 장안구 …' → '수원시' (일반구가 있는 시는 시 코드), '서울특별시 강남구 …' → '강남구'."""
    t = (address or '').split()
    return t[1] if len(t) > 1 else ''


def main():
    args = sys.argv[1:]
    key, kakao = os.environ.get('NEIS_API_KEY', '').strip(), os.environ.get('KAKAO_REST_KEY', '').strip()
    if not key:
        raise SystemExit('NEIS_API_KEY missing')
    now = datetime.now(KST)
    items = build(neis_rows(key), now.strftime('%Y%m%d'))
    prev = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else None
    # A broken response must not wipe the site: refuse a list more than 10% smaller than the last one.
    if prev and len(items) < len(prev['items']) * 0.9 and '--force' not in args:
        raise SystemExit(f"학교 수가 {len(prev['items']):,} → {len(items):,}로 10% 넘게 줄어 중단합니다 (--force로 무시)")
    cache = {}
    if prev:
        for s in prev['items']:
            if s.get('address') and s.get('lat') is not None:
                cache[s['address']] = [s['lat'], s['lon']]
    if kakao:
        A.OUT = ROOT / 'runtime/school'  # geocode() saves its progress here
        A.OUT.mkdir(parents=True, exist_ok=True)
        A.geocode(items, kakao, cache, deadline=now.timestamp() + 60 * 60)
    regions = A.weather_regions()
    for s in items:
        v = cache.get(s['address'] or '')
        s['lat'], s['lon'] = v if isinstance(v, list) else (None, None)
        hit = A.region_code(s['office'], zone_of(s['address']), regions) or A.nearest_region(s, regions)
        if hit:
            sido = next((r['sidoShort'] for r in regions if r['code'][:2] == hit[0][:2]), OFFICES[s['office']])
            s['region'], s['region_name'] = hit[0], hit[1] if hit[1].split(' ')[0] == sido or sido == '세종' else f'{sido} {hit[1]}'
        else:
            s['region'], s['region_name'] = f"{s['office']}-기타", f"{OFFICES[s['office']]} 기타"
    items.sort(key=lambda s: (s['region'], s['k'], s['name']))
    prev_codes = {s['code'] for s in prev['items']} if prev else set()
    status = {'updated_at': now.isoformat(timespec='seconds'), 'source': 'NEIS 교육정보 개방 포털 학교기본정보(schoolInfo)', 'count': len(items),
              'with_coords': sum(1 for s in items if s['lat'] is not None), 'new': sum(1 for s in items if prev and s['code'] not in prev_codes),
              'removed': len(prev_codes - {s['code'] for s in items}) if prev else 0}
    # Keep the file stable when nothing changed (the daily job only commits real changes).
    if prev and prev['items'] == items:
        log('변경 없음')
        return
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'status': status, 'items': items}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    log(f"학교 {status['count']:,}곳 · 좌표 {status['with_coords']:,}곳 · 새로 {status['new']:,} · 빠짐 {status['removed']:,}")
    log('종류', Counter(s['kind'] for s in items).most_common())
    log('지역', len({s['region'] for s in items}), Counter(s['region_name'] for s in items if s['region'].endswith('기타')).most_common(10))


if __name__ == '__main__':
    main()
