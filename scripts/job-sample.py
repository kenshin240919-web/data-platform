"""One-off: 내근처 일자리(A안: 공고 없이 '일자리 도움 받는 곳') 데이터 표본 → reports/job/sample.md.
API 4종(직업소개소 유료·무료, 새일센터 직업교육훈련, 노인 자립형일자리 수행기관) + 파일 2종(고용복지플러스센터, 새일센터).
건수·항목·분포만 남김(키·원문은 남기지 않음).
Usage: DATA_GO_KR_KEY=... python scripts/job-sample.py"""
import csv, io, json, os, re, urllib.parse, urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

key = urllib.parse.unquote(os.environ.get('DATA_GO_KR_KEY', '').strip())
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
out = [f'# 내근처 일자리 데이터 표본 {datetime.now(timezone(timedelta(hours=9))):%Y-%m-%d %H:%M} KST', '']
calls = 0


def http(url, data=None, headers=None, timeout=90):
    global calls
    calls += 1
    req = urllib.request.Request(url, data=data, headers={'User-Agent': UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def api(url, params):
    q = urllib.parse.urlencode({'serviceKey': key, **params})
    raw = http(f'{url}?{q}')
    text = raw.decode('utf-8', 'replace')
    try:
        return json.loads(text)
    except ValueError:
        return text


def items(d):
    """data.go.kr 응답에서 (전체 수, 줄 목록)."""
    if not isinstance(d, dict):
        return None, []
    body = d.get('response', {}).get('body') if 'response' in d else d.get('body', d)
    if not isinstance(body, dict):
        return None, []
    it = body.get('items')
    if isinstance(it, dict):
        it = it.get('item')
    it = it or []
    return int(body.get('totalCount') or 0), it if isinstance(it, list) else [it]


def probe(title, url, tries):
    """여러 매개변수 조합 중 처음 되는 것으로 전체를 받는다."""
    out.extend([f'## {title}', '', f'`{url.replace("https://", "")}`', ''])
    for params in tries:
        try:
            d = api(url, {'pageNo': 1, 'numOfRows': 100, **params})
        except Exception as e:
            out.append(f'- {params}: 실패 {e}')
            continue
        total, rows = items(d)
        if not rows:
            out.append(f'- {params}: 줄 없음 — {str(d)[:300]!r}')
            continue
        allrows, page = list(rows), 1
        while len(allrows) < min(total, 60000):
            page += 1
            try:
                _, more = items(api(url, {'pageNo': page, 'numOfRows': 1000 if page > 1 else 100, **params}))
            except Exception as e:
                out.append(f'- {page}쪽 실패 {e}')
                break
            if not more:
                break
            allrows += more
            if page > 80:
                break
        out.append(f'- 매개변수 {params} → 전체 {total:,}줄, 받은 줄 {len(allrows):,}')
        out.append(f'- 항목: {", ".join(list(rows[0].keys()))}')
        return allrows
    return []


def dist(rows, col, n=12):
    c = Counter((r.get(col) or '(빈칸)') if isinstance(r, dict) else '?' for r in rows)
    return ', '.join(f'{k} {v:,}' for k, v in c.most_common(n))


def coords(rows, xs, ys):
    ok = sum(1 for r in rows if any(str(r.get(x) or '').strip() for x in xs) and any(str(r.get(y) or '').strip() for y in ys))
    return f'{ok:,}/{len(rows):,}'


if key:
    for kind, title in (('paid_job_centers', '유료직업소개소(15155093)'), ('free_job_centers', '무료직업소개소(15155099)')):
        rows = probe(title, f'https://apis.data.go.kr/1741000/{kind}/info',
                     [{'returnType': 'json'}, {'type': 'json'}, {}])
        if rows:
            cols = list(rows[0].keys())
            st = next((c for c in cols if 'SALS_STTS' in c.upper() and 'DTL' not in c.upper()), None) or next((c for c in cols if 'STTS' in c.upper()), None)
            if st:
                out.append(f'- 영업상태({st}): {dist(rows, st)}')
            live = [r for r in rows if st and re.search(r'영업|정상', str(r.get(st) or ''))] or rows
            xs = [c for c in cols if c.upper().endswith('_X') or 'CRD_INFO_X' in c.upper()]
            ys = [c for c in cols if c.upper().endswith('_Y') or 'CRD_INFO_Y' in c.upper()]
            out.append(f'- 영업 중으로 본 줄 {len(live):,} · 좌표 있음 {coords(live, xs, ys)} ({xs}/{ys})')
            nm = next((c for c in cols if 'BPLC_NM' in c.upper()), None)
            addr = next((c for c in cols if 'ROAD' in c.upper() and 'ADDR' in c.upper()), None) or next((c for c in cols if 'ADDR' in c.upper()), None)
            if addr:
                out.append(f'- 시도(영업 중): {dist([{"s": (str(r.get(addr) or "").split() or ["(빈칸)"])[0]} for r in live], "s", 18)}')
            if nm:
                words = Counter()
                for r in live:
                    for w in ('인력', '용역', '건설', '간병', '가사', '파출', '산후', '베이비', '도우미', '요양', '유흥', '노래', '모델', '선원', '해외', '외국인', '경비', '청소', '식당', '헤드헌', '서치'):
                        if w in str(r.get(nm) or ''):
                            words[w] += 1
                out.append(f'- 이름에 든 낱말(영업 중): {", ".join(f"{k} {v:,}" for k, v in words.most_common())}')
            for c in cols:
                if re.search(r'BZSTAT|UPTAE|SE_NM|CLSF|TYPE', c.upper()):
                    out.append(f'- {c}: {dist(live, c, 10)}')
        out.append('')

    rows = probe('새일센터 직업교육훈련(15078161)', 'https://apis.data.go.kr/1383000/nwis/newWorkEducationService/getNewWorkEducationList',
                 [{'type': 'json'}, {'returnType': 'json'}, {'resultType': 'json'}, {}])
    if rows:
        cols = list(rows[0].keys())
        for c in cols:
            v = [str(r.get(c) or '') for r in rows[:3]]
            out.append(f'- {c}: 예 {v}')
        dates = [c for c in cols if re.search(r'(?i)(bgng|strt|start).*(de|dt|date)|edu.*st', c)]
        if dates:
            out.append(f'- 시작일 칸 {dates[0]} 연월 분포: {dist([{"m": str(r.get(dates[0]) or "")[:7]} for r in rows], "m", 14)}')
    out.append('')

    rows = probe('노인 자립형일자리 수행기관(15056961)', 'https://apis.data.go.kr/B552474/JobBsnInfoService/getJobOperInsttList',
                 [{'type': 'json'}, {'returnType': 'json'}, {'_type': 'json'}, {}])
    if rows:
        cols = list(rows[0].keys())
        out.append(f'- 첫 줄 예(주소 등): {json.dumps({k: rows[0][k] for k in cols[:10]}, ensure_ascii=False)[:400]}')
        for c in cols:
            if re.search(r'(?i)type|ty|se$|gbn', c):
                out.append(f'- {c}: {dist(rows, c, 10)}')
    out.append('')
else:
    out.append('DATA_GO_KR_KEY 없음 — API 건너뜀')


def filedata(pk, uddi):
    r = http('https://www.data.go.kr/tcs/dss/selectFileDataDownload.do',
             urllib.parse.urlencode({'publicDataDetailPk': uddi, 'publicDataPk': pk, 'atchFileId': '', 'fileDetailSn': 1,
                                     'publicDataTyCode': 'PR0051'}).encode(),
             {'Referer': f'https://www.data.go.kr/data/{pk}/fileData.do', 'Content-Type': 'application/x-www-form-urlencoded'})
    j = json.loads(r)
    raw = http(f'https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId={j["atchFileId"]}&fileDetailSn={j["fileDetailSn"]}',
               headers={'Referer': f'https://www.data.go.kr/data/{pk}/fileData.do'}, timeout=120)
    for enc in ('utf-8-sig', 'cp949'):
        try:
            return list(csv.DictReader(io.StringIO(raw.decode(enc))))
        except UnicodeDecodeError:
            continue
    return []


for pk, uddi, title in (('15066368', 'uddi:28ed10bf-daa5-4f7b-bcc8-c94b0dda4ced', '고용복지플러스센터 현황(파일)'),
                        ('3034802', 'uddi:77985499-f34e-462b-8fcd-ae6c0aef67cd', '여성새로일하기센터 현황(파일)')):
    out.extend([f'## {title} {pk}', ''])
    try:
        rows = filedata(pk, uddi)
        out.append(f'- {len(rows):,}줄 · 항목: {", ".join(rows[0].keys()) if rows else "-"}')
        for c in ('청(지청)', '시도'):
            if rows and c in rows[0]:
                out.append(f'- {c}: {dist(rows, c, 20)}')
        if rows and '관할구역' in rows[0]:
            many = sum(1 for r in rows if re.search(r'[ㆍ·,]', r['관할구역']))
            out.append(f'- 관할구역이 여러 곳인 센터 {many:,} · 예: {[r["관할구역"] for r in rows[:4]]}')
    except Exception as e:
        out.append(f'- 실패: {e}')
    out.append('')

out.append(f'API·파일 호출 {calls:,}회')
p = Path('reports/job/sample.md')
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text('\n'.join(out) + '\n', encoding='utf-8')
print('\n'.join(out))
