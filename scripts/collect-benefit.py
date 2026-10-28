"""내근처 혜택(benefit.guidejung.com) 수집: 행정안전부 「대한민국 공공서비스(혜택) 정보」(15113968, api.odcloud.kr gov24 v3).

목록·상세·지원조건 전체(각 약 11쪽, 모두 33회 호출 — 개발계정 하루 10,000회)를 받아 합치고,
지역 코드(weather 지역표와 같은 규칙: 일반구가 있는 시는 시 코드)·마감일·금액·필요 서류·비슷한 혜택 묶음을 붙여
apps/benefit/data/benefits.json에 쓴다. 이 파일은 크기(수십 MB)가 커서 저장소에 올리지 않고(.gitignore),
배포 작업(benefit-deploy.yml)이 매번 새로 받아 빌드한다.
Usage: DATA_GO_KR_KEY=... python scripts/collect-benefit.py [--raw runtime/benefit/raw.json]
"""
import json, os, re, sys, time, urllib.parse, urllib.request
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'apps/benefit/data/benefits.json'
RAW = ROOT / 'runtime/benefit/raw.json'
API = 'https://api.odcloud.kr/api/gov24/v3'
KST = timezone(timedelta(hours=9))

# 서비스분야 → 주소용 slug(앱 lib/fmt.ts FIELDS와 같게)
FIELDS = {'생활안정': 'living', '주거·자립': 'house', '임신·출산': 'birth', '보육·교육': 'edu', '고용·창업': 'job',
          '보건·의료': 'health', '보호·돌봄': 'care', '문화·환경': 'culture', '농림축산어업': 'farm', '행정·안전': 'safety'}
# 지원조건 코드(Y면 그 사람이 받을 수 있음). 화면 맞춤 찾기에서 쓰는 것만 순서를 정해 비트로 담는다(앱 lib/fmt.ts CODES와 같은 순서).
CODES = ['JA0201', 'JA0202', 'JA0203', 'JA0204', 'JA0205',  # 중위소득 0~50·51~75·76~100·101~200·200 초과
         'JA0301', 'JA0302', 'JA0303', 'JA0313', 'JA0314', 'JA0315', 'JA0316', 'JA0317', 'JA0318', 'JA0319', 'JA0320',
         'JA0322', 'JA0326', 'JA0327', 'JA0328', 'JA0329', 'JA0330',  # 생애·직업·건강(해당사항없음 0322)
         'JA0401', 'JA0402', 'JA0403', 'JA0404', 'JA0410', 'JA0411', 'JA0412', 'JA0413', 'JA0414',  # 가구(해당사항없음 0410)
         'JA1101', 'JA1102', 'JA1103']  # 소상공인: 예비창업·영업 중·생계곤란/폐업예정
# 구비서류 낱말 → 내근처 서류(minwon.guidejung.com/doc/{slug})
DOCS = [('주민등록', 'resident'), ('가족관계', 'family'), ('기본증명', 'basic'), ('혼인관계', 'marriage'), ('소득금액증명', 'income'),
        ('건강보험료', 'health-premium'), ('건강보험 자격', 'health'), ('사업자등록', 'business'), ('납세증명', 'national-tax'),
        ('지방세', 'tax'), ('건축물대장', 'building'), ('등기', 'registry'), ('재학증명', 'school'), ('졸업증명', 'school'),
        ('장애인증명', 'welfare'), ('한부모', 'welfare'), ('수급자', 'welfare'), ('국가유공자', 'veteran'), ('보훈', 'veteran'),
        ('고용보험', 'employment'), ('국민연금', 'pension'), ('자동차등록', 'car'), ('운전경력', 'driving')]
SIDO_FULL = {'서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구', '인천광역시': '인천', '광주광역시': '전남광주', '대전광역시': '대전',
             '울산광역시': '울산', '세종특별자치시': '세종', '경기도': '경기', '강원특별자치도': '강원', '강원도': '강원', '충청북도': '충북',
             '충청남도': '충남', '전북특별자치도': '전북', '전라북도': '전북', '전라남도': '전남광주', '전남광주통합특별시': '전남광주',
             '경상북도': '경북', '경상남도': '경남', '제주특별자치도': '제주'}
calls = 0


def log(*a):
    print(*a, flush=True)


def page(key, name, p, per=1000):
    global calls
    url = f'{API}/{name}?' + urllib.parse.urlencode({'page': p, 'perPage': per, 'returnType': 'JSON', 'serviceKey': key})
    for i in range(4):
        calls += 1
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=120) as r:
                return json.loads(r.read().decode('utf-8', 'replace'))
        except Exception as e:  # 통신 오류는 잠시 뒤 다시
            log(f'  {name} {p}쪽 오류 {e} — 다시 {i + 1}')
            time.sleep(10 * (i + 1))
    raise SystemExit(f'{name} {p}쪽을 받지 못함')


def all_rows(key, name):
    rows, p, total = [], 1, None
    while total is None or len(rows) < total:
        d = page(key, name, p)
        total = d.get('totalCount') or 0
        got = d.get('data') or []
        if not got:
            break
        rows += got
        p += 1
    log(f'{name} {len(rows):,}/{total:,}')
    return rows


def clean(v):
    v = re.sub(r'\r\n?', '\n', str(v or '')).strip()
    return v if v and v not in ('-', '해당없음', '없음') else None


def ymd(v):
    s = re.sub(r'\D', '', str(v or ''))[:8]
    return f'{s[:4]}-{s[4:6]}-{s[6:8]}' if len(s) == 8 else None


def due_of(text, today):
    """신청기한 글 → (마감일 YYYY-MM-DD, 정확한 날인지). '2026. 7. 23.(목) ~ 2026. 9. 6.(일)' → 9/6, '2026.10월중' → 10/31(대략).
    해마다 되풀이되는 것('5.1.~5.31.')은 연도가 없어 넣지 않는다(상시와 구분은 화면에서 원문으로)."""
    s = text or ''
    if not s or '상시' in s[:20]:
        return None, False
    full = [(int(y), int(m), int(d)) for y, m, d in re.findall(r'(20\d\d)\s*[.\-년]\s*(\d{1,2})\s*[.\-월]\s*(\d{1,2})', s)]
    last = None
    if full:
        y = full[-1][0]
        # '~ 9. 6.'처럼 뒤쪽 날짜에 연도가 없으면 앞의 연도를 씀
        tail = s[s.rfind(str(full[-1][2])):]
        m2 = re.search(r'~\s*(\d{1,2})\s*\.\s*(\d{1,2})\s*\.', tail)
        last = (y, int(m2[1]), int(m2[2])) if m2 else full[-1]
        try:
            return date(*last).isoformat(), True
        except ValueError:
            return None, False
    m = re.findall(r'(20\d\d)\s*[.\-년]\s*(\d{1,2})\s*월', s)
    if m:
        y, mo = int(m[-1][0]), int(m[-1][1])
        if 1 <= mo <= 12:
            end = (date(y + (mo == 12), mo % 12 + 1, 1) - timedelta(days=1))
            return end.isoformat(), False
    return None, False


def amount_of(text):
    """지원내용 속 가장 큰 금액(원). '월 30만원', '1,000,000원', '최대 2천만 원' 등. 1억 원 넘는 것(융자·사업비)은 뺀다."""
    best = 0
    for num, unit in re.findall(r'(\d[\d,]*(?:\.\d+)?)\s*(억|천만|백만|만|천)?\s*원', text or ''):
        try:
            v = float(num.replace(',', ''))
        except ValueError:
            continue
        v *= {'억': 1e8, '천만': 1e7, '백만': 1e6, '만': 1e4, '천': 1e3}.get(unit, 1)
        if 1000 <= v <= 1e8:
            best = max(best, int(v))
    return best or None


def docs_of(*texts):
    t = ' '.join(x or '' for x in texts)
    out = []
    for w, slug in DOCS:
        if w in t and slug not in out:
            out.append(slug)
    return out


def region_table():
    """weather 지역표 → (시도 짧은 이름, 이름) → (코드, 표시 이름). 일반구는 시 코드로 묶음."""
    regions = json.loads((ROOT / 'apps/weather/data/regions.json').read_text(encoding='utf-8'))
    table, cities = {}, defaultdict(list)
    for r in regions:
        nm = r['name']
        if ' ' in nm:  # '수원시 장안구' → 수원시(41110)
            city = nm.split(' ')[0]
            cities[(r['sidoShort'], city)].append(r)
            table[(r['sidoShort'], nm.replace(' ', ''))] = (r['code'][:4] + '0', city, r['sido'])
        else:
            table[(r['sidoShort'], nm)] = (r['code'], nm, r['sido'])
    for (sd, city), rs in cities.items():
        table[(sd, city)] = (rs[0]['code'][:4] + '0', city, rs[0]['sido'])
    sido_code = {r['sidoShort']: r['sido'] for r in regions}
    return table, sido_code


def place_of(org, otype, table, sido_code):
    """소관기관명 → (범위, 시도 짧은 이름, 시군구 코드, 표시 이름). 범위: local(시군구)·sido(광역)·nation(그 밖)."""
    parts = (org or '').split()
    if not parts:
        return 'nation', None, None, None
    sd = SIDO_FULL.get(parts[0])
    if not sd:
        return 'nation', None, None, None
    rest = ''.join(parts[1:])
    if not rest or otype == '광역시도':
        return 'sido', sd, sido_code.get(sd), None
    rest = re.sub(r'^(.+?[시군구])(.+[구])$', lambda m: m[1] + m[2], rest)
    hit = table.get((sd, rest)) or table.get((sd, re.sub(r'^(.+?시).+구$', r'\1', rest)))
    if not hit:
        return 'sido', sd, sido_code.get(sd), None  # 못 찾은 하위 기관(교육지원청 등)은 시도 범위로
    code, nm, _ = hit
    return 'local', sd, code, f'{sd} {nm}' if sd != '세종' else '세종시'


GENERIC = re.compile(r'(\(.*?\)|\[.*?\]|20\d\d년?도?|지원\s*사업|지원금|지원|사업|운영|서비스|제도|안내|추진)')


def topic_key(name, org_words):
    """비슷한 혜택 묶음 열쇠: 이름에서 지역·연도·'지원사업' 같은 말을 뺀 것('강남구 출산양육지원금 지원' → '출산양육금')."""
    s = name or ''
    for w in org_words:
        if len(w) >= 2:
            s = s.replace(w, '')
            s = s.replace(re.sub(r'(특별시|광역시|특별자치시|특별자치도|통합특별시|도|시|군|구)$', '', w), '') if len(w) > 2 else s
    s = GENERIC.sub('', s)
    s = re.sub(r'[\s·ㆍ,.\-]', '', s)
    return s if len(s) >= 3 else None


def main():
    key = urllib.parse.unquote(os.environ.get('DATA_GO_KR_KEY', '').strip())
    raw_path = Path(sys.argv[sys.argv.index('--raw') + 1]) if '--raw' in sys.argv else None
    if raw_path and raw_path.exists():
        raw = json.loads(raw_path.read_text(encoding='utf-8'))
    else:
        if not key:
            raise SystemExit('DATA_GO_KR_KEY가 없습니다')
        raw = {n: all_rows(key, n) for n in ('serviceList', 'serviceDetail', 'supportConditions')}
        RAW.parent.mkdir(parents=True, exist_ok=True)
        RAW.write_text(json.dumps(raw, ensure_ascii=False), encoding='utf-8')
    log(f'호출 {calls}회')
    det = {r['서비스ID']: r for r in raw['serviceDetail']}
    cond = {r['서비스ID']: r for r in raw['supportConditions']}
    table, sido_code = region_table()
    today = datetime.now(KST).date()
    items, scope_n, miss = [], Counter(), Counter()
    for r in raw['serviceList']:
        sid = r.get('서비스ID')
        if not sid or not r.get('서비스명'):
            continue
        d, c = det.get(sid, {}), cond.get(sid, {})
        scope, sd, code, rname = place_of(r.get('소관기관명'), r.get('소관기관유형'), table, sido_code)
        if scope == 'sido' and r.get('소관기관유형') == '시군구':
            miss[r.get('소관기관명')] += 1
        scope_n[scope] += 1
        due, exact = due_of(d.get('신청기한') or r.get('신청기한'), today)
        if due and not (today - timedelta(days=90) <= date.fromisoformat(due) <= today + timedelta(days=400)):
            due, exact = None, False  # 법 시행일·옛 공고일 같은 날짜는 마감으로 보지 않음
        mask = 0
        for i, k in enumerate(CODES):
            if str(c.get(k) or '').upper() != 'Y':
                mask |= 1 << i  # N인 것(그 사람은 못 받음)만 비트로
        age = [c.get('JA0110'), c.get('JA0111')]
        age = [int(a) if str(a).isdigit() else None for a in age]
        content = clean(d.get('지원내용') or r.get('지원내용'))
        it = {'id': sid, 'name': r['서비스명'].strip(), 'sum': clean(r.get('서비스목적요약')), 'purpose': clean(d.get('서비스목적')),
              'org': clean(r.get('소관기관명')), 'otype': r.get('소관기관유형'), 'dept': clean(r.get('부서명')),
              'user': [u for u in (r.get('사용자구분') or '').split('||') if u], 'field': FIELDS.get(r.get('서비스분야') or '', 'living'),
              'kind': [k for k in (r.get('지원유형') or '').split('||') if k],
              'target': clean(d.get('지원대상') or r.get('지원대상')), 'crit': clean(d.get('선정기준') or r.get('선정기준')),
              'content': content, 'how': clean(r.get('신청방법')), 'howd': clean(d.get('신청방법')),
              'deadline': clean(d.get('신청기한') or r.get('신청기한')), 'docs': clean(d.get('구비서류')),
              'docs_off': clean(d.get('공무원확인구비서류')), 'docs_self': clean(d.get('본인확인필요구비서류')),
              'recv': clean(d.get('접수기관명') or r.get('접수기관')), 'tel': clean(d.get('문의처') or r.get('전화문의')),
              'url': clean(r.get('상세조회URL')), 'apply': clean(d.get('온라인신청사이트URL')),
              'law': clean(d.get('법령')), 'ordin': clean(d.get('자치법규')), 'rule': clean(d.get('행정규칙')),
              'views': int(r.get('조회수') or 0), 'reg': ymd(r.get('등록일시')), 'mod': ymd(r.get('수정일시')),
              'scope': scope, 'sido': sd, 'region': code, 'region_name': rname,
              'age': age if any(a is not None for a in age) else None, 'mask': mask,
              'amount': amount_of(content), 'due': due, 'due_exact': exact or None,
              'doclinks': docs_of(d.get('구비서류'), d.get('본인확인필요구비서류'), d.get('공무원확인구비서류'))}
        it['key'] = topic_key(it['name'], (it['org'] or '').split())
        items.append({k: v for k, v in it.items() if v not in (None, '', [], 0) or k in ('mask',)})
    # 비슷한 혜택: 같은 열쇠가 서로 다른 지역 3곳 이상이면 묶음 이름으로 남김
    groups = defaultdict(set)
    for it in items:
        if it.get('key'):
            groups[it['key']].add(it.get('region') or it.get('sido') or 'nation')
    keep = {k for k, v in groups.items() if len(v) >= 3}
    for it in items:
        if it.get('key') not in keep:
            it.pop('key', None)
    log(f'범위 {dict(scope_n)} · 비슷한 혜택 묶음 {len(keep):,}개 · 시군구로 못 맞춘 기관 {sum(miss.values()):,}건 {miss.most_common(8)}')
    log(f"마감일 있음 {sum(1 for i in items if i.get('due')):,} · 금액 있음 {sum(1 for i in items if i.get('amount')):,} · 서류 연결 {sum(1 for i in items if i.get('doclinks')):,}")
    prev = None
    try:
        prev = json.loads(OUT.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        pass
    if prev and '--force' not in sys.argv and len(items) < len(prev['items']) * 0.8:
        raise SystemExit(f'혜택 수가 20% 넘게 줄어 멈춤({len(prev["items"]):,} → {len(items):,}) — 확인 후 --force')
    status = {'updated_at': datetime.now(KST).isoformat(timespec='seconds'), 'count': len(items), 'scope': dict(scope_n), 'calls': calls}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'status': status, 'items': items}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    log(f'저장 {OUT.relative_to(ROOT)} {OUT.stat().st_size / 1e6:.1f}MB · 혜택 {len(items):,}건')


if __name__ == '__main__':
    main()
