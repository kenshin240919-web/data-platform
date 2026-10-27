// 웹 푸시(내근처 알림): 구독 저장(KV)·VAPID 서명·본문 암호화(RFC 8291 aes128gcm)·발송. 외부 서비스 없이 Workers WebCrypto만 쓴다.
// VAPID 키는 처음 쓸 때 Worker가 만들어 KV `push:vapid`에 둔다(공개 키는 /api/push/key로 브라우저에 줌) — 저장소·Secrets에 키를 두지 않음.
// 구독 `push:sub:{id}` = {sub, w(날씨 지역 코드), c(약국 등 지역 코드), n(지역 이름), lat, lon(시군구 중심), t(주제), at} — 위치는 이용자가 고른 시군구뿐.
export interface PushEnv{CACHE:KVNamespace}
export type Sub={endpoint:string;keys:{p256dh:string;auth:string}};
export type Rec={sub:Sub;w:string;c:string;n:string;lat:number;lon:number;t:string[];at:number;sent?:number};

const b64u=(b:ArrayBuffer|Uint8Array)=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64u=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((s.length+3)%4)),c=>c.charCodeAt(0));
const cat=(...a:Uint8Array[])=>{const o=new Uint8Array(a.reduce((n,x)=>n+x.length,0));let i=0;for(const x of a){o.set(x,i);i+=x.length;}return o;};
const enc=new TextEncoder();

type Vapid={pub:string;jwk:JsonWebKey};
let vapid:Vapid|null=null;
export async function vapidKeys(env:PushEnv):Promise<Vapid>{
  if(vapid)return vapid;
  const got=await env.CACHE.get('push:vapid','json') as Vapid|null;
  if(got)return vapid=got;
  const kp=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']) as CryptoKeyPair;
  const raw=await crypto.subtle.exportKey('raw',kp.publicKey) as ArrayBuffer;
  const v={pub:b64u(raw),jwk:await crypto.subtle.exportKey('jwk',kp.privateKey) as JsonWebKey};
  await env.CACHE.put('push:vapid',JSON.stringify(v));
  return vapid=v;
}
async function vapidAuth(env:PushEnv,endpoint:string){
  const v=await vapidKeys(env);const aud=new URL(endpoint).origin;
  const head=b64u(enc.encode(JSON.stringify({typ:'JWT',alg:'ES256'})));
  const body=b64u(enc.encode(JSON.stringify({aud,exp:Math.floor(Date.now()/1000)+12*3600,sub:'mailto:kenshin240919@gmail.com'})));
  const key=await crypto.subtle.importKey('jwk',v.jwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,enc.encode(`${head}.${body}`));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${v.pub}`;
}
async function hkdf(salt:Uint8Array,ikm:Uint8Array,info:Uint8Array,len:number){
  const k=await crypto.subtle.importKey('raw',ikm,'HKDF',false,['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},k,len*8));
}
/** RFC 8291: 받는 쪽 공개 키(p256dh)·auth로 본문을 aes128gcm 암호화. */
async function encrypt(sub:Sub,text:string){
  const ua=unb64u(sub.keys.p256dh),auth=unb64u(sub.keys.auth);
  const eph=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']) as CryptoKeyPair;
  const as=new Uint8Array(await crypto.subtle.exportKey('raw',eph.publicKey) as ArrayBuffer);
  const uaKey=await crypto.subtle.importKey('raw',ua,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const ecdh=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:uaKey,$public:uaKey} as unknown as SubtleCryptoDeriveKeyAlgorithm,eph.privateKey,256));
  const ikm=await hkdf(auth,ecdh,cat(enc.encode('WebPush: info\0'),ua,as),32);
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const cek=await hkdf(salt,ikm,enc.encode('Content-Encoding: aes128gcm\0'),16);
  const nonce=await hkdf(salt,ikm,enc.encode('Content-Encoding: nonce\0'),12);
  const key=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['encrypt']);
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},key,cat(enc.encode(text),new Uint8Array([2]))));
  const rs=new Uint8Array([0,0,16,0]);  // 4096
  return cat(salt,rs,new Uint8Array([as.length]),as,ct);
}
// urgency high = FCM 높은 우선순위: 삼성 인터넷처럼 절전(잠자는 앱) 대상이 되기 쉬운 브라우저도 바로 깨워서 받게 함(normal이면 늦거나 안 옴).
export type Msg={title:string;body:string;url:string;tag:string};
/** 한 구독에 보내기. 404·410(구독 끝남)이면 'gone'. */
export async function send(env:PushEnv,sub:Sub,msg:Msg):Promise<'ok'|'gone'|'fail'>{
  try{
    const r=await fetch(sub.endpoint,{method:'POST',headers:{authorization:await vapidAuth(env,sub.endpoint),'content-encoding':'aes128gcm','content-type':'application/octet-stream',ttl:String(4*3600),urgency:'high'},body:await encrypt(sub,JSON.stringify(msg))});
    return r.status===404||r.status===410?'gone':r.ok?'ok':'fail';
  }catch{return 'fail';}
}
export const subId=async(endpoint:string)=>b64u(await crypto.subtle.digest('SHA-256',enc.encode(endpoint))).slice(0,24);
/** 저장된 구독 모두(KV list, 1,000개씩). */
export async function allSubs(env:PushEnv){
  const out:{key:string;rec:Rec}[]=[];let cursor:string|undefined;
  do{const l=await env.CACHE.list({prefix:'push:sub:',cursor});
    for(const k of l.keys){const rec=await env.CACHE.get(k.name,'json') as Rec|null;if(rec)out.push({key:k.name,rec});}
    cursor=l.list_complete?undefined:l.cursor;}while(cursor);
  return out;
}
