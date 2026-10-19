"""One-off survey of the NEIS 학원교습소정보 API for the academy design (prints statistics only).

Needs NEIS_API_KEY. Without a key the API answers only the first 5 rows.
"""
import collections, json, os, re, sys, time, urllib.parse, urllib.request

KEY = os.environ.get('NEIS_API_KEY', '').strip()
OFFICES = 'B10 C10 D10 E10 F10 G10 H10 I10 J10 K10 M10 N10 P10 Q10 R10 S10 T10'.split()
URL = 'https://open.neis.go.kr/hub/acaInsTiInfo'


def page(code, i, size=1000):
    q = urllib.parse.urlencode({'KEY': KEY, 'Type': 'json', 'pIndex': i, 'pSize': size, 'ATPT_OFCDC_SC_CODE': code})
    for n in range(4):
        try:
            with urllib.request.urlopen(f'{URL}?{q}', timeout=60) as r:
                d = json.load(r)
            break
        except Exception as e:  # retry network errors
            print('retry', code, i, e, file=sys.stderr); time.sleep(5 * (n + 1))
    else:
        raise SystemExit(f'failed {code} {i}')
    if 'acaInsTiInfo' not in d:
        return 0, [], d.get('RESULT', d)
    head, body = d['acaInsTiInfo']
    return head['head'][0]['list_total_count'], body['row'], head['head'][1]['RESULT']


def main():
    if not KEY:
        raise SystemExit('NEIS_API_KEY missing')
    rows, calls = [], 0
    for code in OFFICES:
        total, got, res = page(code, 1); calls += 1
        print(code, total, res.get('CODE'), flush=True)
        for i in range(2, (total + 999) // 1000 + 1):
            _, more, _ = page(code, i); calls += 1; got += more
        if len(got) != total:
            print('  count mismatch', len(got), total)
        rows += got
    C = collections.Counter
    out = []
    p = lambda *a: out.append(' '.join(str(x) for x in a))
    p('calls', calls, 'rows', len(rows), 'unique ACA_ASNUM', len({r['ACA_ASNUM'] for r in rows}))
    for f in ('ACA_INSTI_SC_NM', 'REG_STTUS_NM', 'REALM_SC_NM', 'LE_ORD_NM', 'THCC_OTHBC_YN', 'BRHS_ACA_YN'):
        p(f, C(r.get(f) for r in rows).most_common(15))
    p('LE_CRSE_NM top', C(r.get('LE_CRSE_NM') for r in rows).most_common(30))
    live = [r for r in rows if r.get('REG_STTUS_NM') == '개원']
    fee = [r for r in live if (r.get('PSNBY_THCC_CNTNT') or '').strip()]
    p('개원', len(live), 'fee filled', len(fee), f'{len(fee) / max(1, len(live)):.1%}')
    pair = re.compile(r'([^:,]+):\s*([0-9]+)')
    bad = [r['PSNBY_THCC_CNTNT'] for r in fee if not pair.search(r['PSNBY_THCC_CNTNT'])]
    p('fee unparsed', len(bad), bad[:15])
    amounts = sorted(int(a) for r in fee for _, a in pair.findall(r['PSNBY_THCC_CNTNT']))
    if amounts:
        q = lambda x: amounts[int(x * (len(amounts) - 1))]
        p('amount n', len(amounts), 'p1', q(.01), 'p10', q(.1), 'p50', q(.5), 'p90', q(.9), 'p99', q(.99), 'max', amounts[-1])
    p('fee samples', [r['PSNBY_THCC_CNTNT'][:150] for r in fee[::max(1, len(fee) // 25)][:25]])
    p('crse list samples', [r.get('LE_CRSE_LIST_NM') for r in live[::max(1, len(live) // 25)][:25]])
    p('no address', sum(1 for r in live if not (r.get('FA_RDNMA') or '').strip()))
    p('placeholder tel', sum(1 for r in live if re.fullmatch(r'0\d{1,2}-0000-0000', (r.get('FA_TELNO') or '').strip())), 'no tel', sum(1 for r in live if not (r.get('FA_TELNO') or '').strip()))
    p('zones', len({(r['ATPT_OFCDC_SC_CODE'], r.get('ADMST_ZONE_NM')) for r in rows}))
    p('LOAD_DTM range', min(r.get('LOAD_DTM') or '9' for r in rows), max(r.get('LOAD_DTM') or '0' for r in rows))
    p('ESTBL recent (>=20250901)', sum(1 for r in live if (r.get('ESTBL_YMD') or '') >= '20250901'))
    p('CAA_BEGIN set', sum(1 for r in rows if (r.get('CAA_BEGIN_YMD') or '').strip()), 'CAA_END values', C((r.get('CAA_END_YMD') or '').strip() for r in rows).most_common(5))
    p('keys', sorted(rows[0].keys()) if rows else [])
    text = '\n'.join(out)
    print(text)
    s = os.environ.get('GITHUB_STEP_SUMMARY')
    if s:
        open(s, 'a', encoding='utf-8').write('```\n' + text + '\n```\n')


if __name__ == '__main__':
    main()
