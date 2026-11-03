"""One-off: 국가자격 시험일정(15074408)·시험장소(15068172) 표본 → reports/job/qnet-sample.md.
건수·항목·분포만 남김(키·원문은 남기지 않음). 11/3 사용자 활용신청.
Usage: DATA_GO_KR_KEY=... python scripts/qnet-sample.py"""
import json, os, urllib.parse, urllib.request, xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

key = urllib.parse.unquote(os.environ.get('DATA_GO_KR_KEY', '').strip())
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
KST = timezone(timedelta(hours=9))
out = [f'# 국가자격 시험일정·시험장 표본 {datetime.now(KST):%Y-%m-%d %H:%M} KST', '']


def get(url, params, key_name='serviceKey'):
    q = urllib.parse.urlencode({key_name: key, **params})
    req = urllib.request.Request(f'{url}?{q}', headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode('utf-8', 'replace')


def rows_of(text):
    """json이면 body.items.item, xml이면 <item> 목록 → (전체 수, [dict])"""
    t = text.strip()
    if t.startswith('{'):
        d = json.loads(t)
        body = d.get('response', d).get('body', {}) if isinstance(d, dict) else {}
        it = (body.get('items') or {})
        it = it.get('item', it) if isinstance(it, dict) else it
        if isinstance(it, dict):
            it = [it]
        return body.get('totalCount'), it or []
    root = ET.fromstring(t)
    total = root.findtext('.//totalCount')
    return total, [{c.tag: (c.text or '').strip() for c in item} for item in root.iter('item')]


def head(text):
    return ' '.join(text.split())[:300]


# 1) 시험일정: 2026·2027년, 자격구분 T·S·C·W
out += ['## 국가자격 시험일정 조회(15074408)', '', '`apis.data.go.kr/B490007/qualExamSchd/getQualExamSchdList`', '']
for yy in ('2026', '2027'):
    for gb in ('T', 'S', 'C', 'W'):
        try:
            text = get('http://apis.data.go.kr/B490007/qualExamSchd/getQualExamSchdList',
                       {'numOfRows': 500, 'pageNo': 1, 'dataFormat': 'json', 'implYy': yy, 'qualgbCd': gb})
            total, rows = rows_of(text)
            out.append(f'- {yy} {gb}: 전체 {total} · 받은 줄 {len(rows)}' + ('' if rows else f' — {head(text)}'))
            if rows and yy == '2026' and gb == 'T':
                out.append(f'  - 항목: {", ".join(rows[0].keys())}')
                for r in rows[:4]:
                    out.append('  - 예: ' + ' | '.join(f'{k}={v}' for k, v in r.items() if k in ('implSeq', 'description', 'docRegStartDt', 'docRegEndDt', 'docExamStartDt', 'docPassDt', 'pracRegStartDt', 'pracExamStartDt', 'pracPassDt')))
        except Exception as e:  # noqa: BLE001
            out.append(f'- {yy} {gb}: 실패 {e}')
out.append('')

# 2) 시험장소: 지사 00~24
out += ['## 국가자격시험 시험장소(15068172)', '', '`openapi.q-net.or.kr/api/service/rest/InquiryExamAreaSVC/getList`', '']
all_rows = []
for b in range(25):
    code = f'{b:02d}'
    try:
        text = get('http://openapi.q-net.or.kr/api/service/rest/InquiryExamAreaSVC/getList', {'brchCd': code, 'numOfRows': 500, 'pageNo': 1}, 'ServiceKey')
        total, rows = rows_of(text)
        all_rows += rows
        out.append(f'- 지사 {code}: 전체 {total} · 받은 줄 {len(rows)}' + ('' if rows else f' — {head(text)}'))
    except Exception as e:  # noqa: BLE001
        out.append(f'- 지사 {code}: 실패 {e}')
if all_rows:
    out += ['', f'- 합계 {len(all_rows):,}줄 · 항목: {", ".join(all_rows[0].keys())}',
            f'- 주소 있음 {sum(1 for r in all_rows if r.get("address")):,} · 구분 {Counter(r.get("examAreaGbNm") for r in all_rows).most_common(8)}',
            '- 예: ' + ' / '.join(f'{r.get("brchNm")} {r.get("examAreaNm")} ({r.get("address", "")[:30]})' for r in all_rows[:5])]
Path('reports/job').mkdir(parents=True, exist_ok=True)
Path('reports/job/qnet-sample.md').write_text('\n'.join(out) + '\n', encoding='utf-8')
print('\n'.join(out))
