"""큐넷 국가자격시험 시험장소(공공데이터포털 15068172, 한국산업인력공단) → apps/job/data/qnet-areas.json (지사별 원본 줄).

큐넷 서버(openapi.q-net.or.kr)가 해외(GitHub Actions)에서 자주 'Failed to validate a newly established connection'(resultCode 99)이나
시간 초과를 냄(11/3 표본: 25개 지사 중 4~11곳만 받힘) → 매시간 돌며 아직 없거나 7일 넘은 지사만 다시 시도하고, 받은 지사는 날짜와 함께
저장해 둔다. 일자리 수집(collect-job.py)이 이 파일을 읽어 시험장(kind exam)을 만든다. 칸: examAreaNm·address·brchNm·examAreaGbNm·telNo·plceLoctGid.
Usage: DATA_GO_KR_KEY=... python scripts/collect-qnet.py   (끝에 'NEW n'을 출력 — 새로 받은 지사 수)
"""
import json, os, time, urllib.parse, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'apps/job/data/qnet-areas.json'
URL = 'http://openapi.q-net.or.kr/api/service/rest/InquiryExamAreaSVC/getList'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
KST = timezone(timedelta(hours=9))
FRESH_DAYS = 7
BUDGET_MIN = 12


def log(*a):
    print(*a, flush=True)


def fetch(key, code):
    """한 지사 전체(한 쪽 1,000줄씩). 실패하면 예외."""
    rows, page = [], 1
    while page <= 5:
        q = urllib.parse.urlencode({'ServiceKey': key, 'brchCd': code, 'numOfRows': 1000, 'pageNo': page})
        req = urllib.request.Request(f'{URL}?{q}', headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=25) as r:
            root = ET.fromstring(r.read())
        rc = root.findtext('.//resultCode')
        if rc not in ('00', None):
            raise RuntimeError(f'{rc} {(root.findtext(".//resultMsg") or "")[:80]}')
        got = [{c.tag: (c.text or '').strip() for c in it} for it in root.iter('item')]
        rows += [{k: v for k, v in r.items() if v} for r in got]
        if len(got) < 1000:
            return rows
        page += 1
    return rows


def main():
    key = urllib.parse.unquote(os.environ.get('DATA_GO_KR_KEY', '').strip())
    if not key:
        raise SystemExit('DATA_GO_KR_KEY missing')
    today = datetime.now(KST).date()
    data = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    age = lambda c: (today - datetime.fromisoformat(data[c]['at']).date()).days if c in data else 999  # noqa: E731
    todo = sorted((c for c in (f'{b:02d}' for b in range(25)) if age(c) >= FRESH_DAYS), key=lambda c: -age(c))
    log(f'받아 둔 지사 {len(data)}/25 · 이번에 받을 지사 {len(todo)}: {", ".join(todo) or "-"}')
    until, new = time.time() + BUDGET_MIN * 60, 0
    for code in todo:
        if time.time() > until:
            log('시간 상한 — 다음 실행에서 이어서')
            break
        for tries in range(2):
            try:
                rows = fetch(key, code)
                if not rows:
                    raise RuntimeError('0줄')
                old = len((data.get(code) or {}).get('rows') or [])
                if old and len(rows) < old * 0.5:  # 반 넘게 줄면 의심 — 그대로 두고 날짜만 그대로
                    raise RuntimeError(f'{old} → {len(rows)}줄로 줄어 저장 안 함')
                data[code] = {'at': today.isoformat(), 'rows': rows}
                new += 1
                log(f'  지사 {code}: {len(rows):,}줄 (시도 {tries + 1})')
                break
            except Exception as e:  # noqa: BLE001
                log(f'  지사 {code} 시도 {tries + 1} 실패: {str(e)[:120]}')
                time.sleep(3)
    if new:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(dict(sorted(data.items())), ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    log(f'지사 {len(data)}/25 · 줄 {sum(len(v["rows"]) for v in data.values()):,}')
    log(f'NEW {new}')


if __name__ == '__main__':
    main()
