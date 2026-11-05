"""guidejung.com(워드프레스)에 '내근처 서비스 모음' 페이지 1개를 만들거나(slug near-sites) 내용만 바꾼다 — 11/5 사용자 요청.
다른 글·페이지·테마·메뉴·플러그인은 건드리지 않음. 워드프레스 REST API + 응용 프로그램 비밀번호(GitHub Secrets WP_USER·WP_APP_PASSWORD).
Usage: WP_USER=... WP_APP_PASSWORD=... python scripts/wp/near-page.py check|publish"""
import base64, json, os, sys, urllib.error, urllib.request
from pathlib import Path

SITE = os.environ.get('WP_SITE', 'https://guidejung.com').rstrip('/')
SLUG, TITLE = 'near-sites', '내근처 — 우리 동네 생활 정보'
HTML = (Path(__file__).parent / 'near-sites.html').read_text(encoding='utf-8')
user, pw = os.environ.get('WP_USER', '').strip(), os.environ.get('WP_APP_PASSWORD', '').strip()
if not (user and pw):
    raise SystemExit('WP_USER / WP_APP_PASSWORD 없음 — GitHub Secrets에 넣어 주세요')
AUTH = 'Basic ' + base64.b64encode(f'{user}:{pw}'.encode()).decode()


def api(path, data=None, method=None):
    p, _, q = path.partition('?')  # 11/5: guidejung.com은 /wp-json/이 404, ?rest_route= 형태는 200
    req = urllib.request.Request(f'{SITE}/?rest_route=/wp/v2/{p}' + (f'&{q}' if q else ''), data=json.dumps(data).encode() if data is not None else None,
                                 method=method or ('POST' if data is not None else 'GET'),
                                 headers={'Authorization': AUTH, 'Content-Type': 'application/json', 'User-Agent': 'guidejung-near-page/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, json.loads(r.read() or b'null')
    except urllib.error.HTTPError as e:
        return e.code, (e.read()[:300].decode('utf-8', 'replace'))


mode = (sys.argv[1:] or ['check'])[0]
st, me = api('users/me?context=edit')
if st != 200:
    raise SystemExit(f'로그인 실패 {st}: {me}')
caps = me.get('capabilities') or {}
print(f"로그인 OK · 사용자 {me.get('name')} · 역할 {me.get('roles')} · HTML 그대로 저장(unfiltered_html) {'가능' if caps.get('unfiltered_html') else '불가 — <style>이 지워질 수 있음'}")
st, pages = api(f'pages?slug={SLUG}&status=publish,draft,private&context=edit')
page = pages[0] if st == 200 and pages else None
print(f"기존 페이지: {page['link'] + ' (id ' + str(page['id']) + ', ' + page['status'] + ')' if page else '없음 — 새로 만듦'}")
if mode != 'publish':
    print('check만 했습니다(바뀐 것 없음).')
    sys.exit(0)
body = {'title': TITLE, 'slug': SLUG, 'status': 'publish', 'content': f'<!-- wp:html -->\n{HTML}\n<!-- /wp:html -->'}
st, res = api(f"pages/{page['id']}", body) if page else api('pages', body)
if st not in (200, 201):
    raise SystemExit(f'게시 실패 {st}: {res}')
print(f"게시 완료: {res['link']} (id {res['id']})")
