// 내근처 안드로이드 앱(apps/app, com.guidejung.near)이 17개 사이트를 주소창 없이 열도록 각 사이트에 앱 확인 파일을 넣는다:
//   apps/{앱}/public/.well-known/assetlinks.json
// 지문(SHA-256)은 두 곳에서 읽는다(파일이 없으면 건너뜀, 둘 다 없으면 아무것도 쓰지 않음):
//   apps/app/upload-key.sha256   — 업로드 키(app-build.yml이 처음 실행 때 만듦). 직접 깐 APK가 이 키로 서명됨.
//   apps/app/play-signing.sha256 — 구글 플레이 앱 서명 키(Play Console → 앱 무결성 → 앱 서명 키 인증서 SHA-256). 플레이에서 받은 앱이 이 키로 서명됨.
// 사이트 목록은 packages/ui/src/network.tsx SITES. 실행: node scripts/make-assetlinks.mjs
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';

const fps=['apps/app/upload-key.sha256','apps/app/play-signing.sha256'].filter(existsSync)
  .map(f=>readFileSync(f,'utf8').trim().toUpperCase()).filter(f=>/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));
if(!fps.length){console.log('지문이 아직 없습니다(app-build.yml 첫 실행 뒤 다시 실행).');process.exit(0);}
const pkg=JSON.parse(readFileSync('apps/app/twa-manifest.json','utf8')).packageId;
const body=JSON.stringify([{relation:['delegate_permission/common.handle_all_urls'],
  target:{namespace:'android_app',package_name:pkg,sha256_cert_fingerprints:[...new Set(fps)]}}],null,2)+'\n';
const net=readFileSync('packages/ui/src/network.tsx','utf8');
const keys=[...net.matchAll(/^\s+(\w+):\{url:'https:\/\/\w+\.guidejung\.com'/gm)].map(m=>m[1]);
for(const k of keys){const dir=`apps/${k}/public/.well-known`;mkdirSync(dir,{recursive:true});writeFileSync(`${dir}/assetlinks.json`,body);}
console.log(`${keys.length}개 사이트, 지문 ${fps.length}개`);
