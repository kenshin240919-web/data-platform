"""휴식 설계용 1회성 조회: 검색에 나오는 1인 목욕탕·세신샵이 LOCALDATA(목욕장업·미용업·의료유사업)에 있는지, 어떤 업종으로 신고됐는지 본다."""
import importlib.util
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('service', ROOT / 'scripts/collect-service.py')
S = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(S)
NAMES = ['솔로사우나', '레포', '토바', 'TOVA', '시수', '슬릭', '단지', 'DANJI', '여신', '단오', '담다', '비단', '연남스크럽', '세신샵 결', '결 화곡']
WORDS = ['1인', '세신', '스크럽', '프라이빗', '개인', '독채', '사우나', '목욕']
for kind in ('public_baths', 'beauty_salons', 'medical_related_businesses'):
    rows = [r for r in S.localdata_rows(kind) if r.get('영업상태명') == '영업/정상']
    print(f'[{kind}] 영업 중 {len(rows):,}')
    for w in WORDS:
        hit = [r for r in rows if w in (r.get('사업장명') or '')]
        print(f'  이름에 "{w}": {len(hit):,} · 업태 {Counter(r.get("업태구분명") for r in hit).most_common(4)}')
        if w in ('1인', '세신', '스크럽', '프라이빗'):
            print('    예:', [(r.get('사업장명'), (r.get('도로명주소') or r.get('지번주소') or '')[:22]) for r in hit[:10]])
    for n in NAMES:
        hit = [r for r in rows if n.lower() in (r.get('사업장명') or '').lower() and ('서울' in (r.get('도로명주소') or r.get('지번주소') or '') or '인천' in (r.get('도로명주소') or r.get('지번주소') or '') or '광명' in (r.get('도로명주소') or ''))]
        if hit:
            print(f'  ★ "{n}": {[(r.get("사업장명"), r.get("업태구분명"), (r.get("도로명주소") or r.get("지번주소") or "")[:24]) for r in hit[:4]]}')
