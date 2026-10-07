import {robotsTxt} from '@guidejung/ui';
// Plain-text robots.txt so webmaster tools can require extra lines (robots.ts cannot emit comments).
export const dynamic='force-static';
// Daum 웹마스터도구 소유 확인 PIN: robots.txt 맨 아래에 있어야 하므로 지우지 마세요.
const DAUM_PIN='#DaumWebMasterTool:8537a40484e44808deb5a73be60c65c136d48b8a1ef94808378c2f5b0e83ed88:opNCLOBne+BRvOIi5xReOg==';
export function GET(){return new Response(`${robotsTxt('trip')}\n${DAUM_PIN}\n`,{headers:{'Content-Type':'text/plain; charset=utf-8'}});}
