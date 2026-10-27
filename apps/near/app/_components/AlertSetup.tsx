'use client';
// 내근처 알림 받기: 지역(시군구)·주제를 고르고 브라우저 알림을 허용 → 서비스 워커(/sw.js) 푸시 구독 → Worker /api/push/subscribe.
// 위치는 GPS 좌표가 아니라 고른 시군구(중심 좌표)만 저장한다. 지역 기본값은 내 위치(브라우저 안 계산)에서 가장 가까운 시군구.
import {useEffect,useState} from 'react';
import {useMyPosition,here} from '@guidejung/ui/geo';
import type {Area} from '@guidejung/ui/network';
import {externalUrl,inapp,isIos} from '../../../../packages/ui/src/inapp';
import {nearestArea} from '../../lib/live';

type State='checking'|'unsupported'|'ios-home'|'inapp'|'denied'|'off'|'on'|'busy';
const KEY='gj.alerts';
const TOPICS:[string,string,string][]=[['weather','🌤️ 매일 아침 7시 우리 동네 날씨','어제보다 몇 도 춥고 더운지, 비·미세먼지'],['pharmacy','💊 일요일·공휴일 아침 문 연 약국','아침 8시 30분, 우리 동네 지금 문 연 약국 수']];
const ga=(n:string,p:Record<string,unknown>={})=>{try{(window as {gtag?:(...a:unknown[])=>void}).gtag?.('event',n,p);}catch{}};
const b64=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((s.length+3)%4)),c=>c.charCodeAt(0));
type Saved={w:string;t:string[]};
let waiting=0,asking=false;
// 누르기 전에 서비스 워커 등록·공개 키를 미리 받아 둠 → 누르는 순간 바로 구독(허용 창)을 띄울 수 있게.
const prep:{reg?:ServiceWorkerRegistration;key?:string}={};
const browser=()=>{const u=navigator.userAgent;return /SamsungBrowser/.test(u)?'samsung':/EdgA?\//.test(u)?'edge':/Firefox|FxiOS/.test(u)?'firefox':/CriOS|Chrome\//.test(u)?'chrome':/Safari/.test(u)?'safari':'other';};
const load=():Saved|null=>{try{return JSON.parse(localStorage.getItem(KEY)??'null');}catch{return null;}};

export function AlertSetup({areas}:{areas:Area[]}){
  const {pos}=useMyPosition();
  const [st,setSt]=useState<State>('checking');const [w,setW]=useState('');const [t,setT]=useState<string[]>(['weather','pharmacy']);const [msg,setMsg]=useState('');const [help,setHelp]=useState(false);const [diag,setDiag]=useState<Record<string,string>>({});
  const note=(k:string,v:string)=>setDiag(d=>({...d,[k]:v}));
  const sidos=[...new Set(areas.map(a=>a.n.split(' ')[0]))];
  useEffect(()=>{
    const s=load();if(s){setW(s.w);setT(s.t);}
    if(inapp()){setSt('inapp');return;}
    if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){
      setSt(isIos()&&!(navigator as {standalone?:boolean}).standalone?'ios-home':'unsupported');return;}
    if(Notification.permission==='denied'){setSt('denied');return;}
    navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(r=>{prep.reg=r;}).catch(()=>{});
    fetch('/api/push/key').then(r=>r.json() as Promise<{key:string}>).then(d=>{prep.key=d.key;}).catch(()=>{});
    navigator.serviceWorker.getRegistration('/').then(r=>r?.pushManager.getSubscription()).then(sub=>{
      // 등록은 남아 있는데 허용이 빠진 경우(삼성 인터넷에서 확인): 그대로면 도착한 알림을 브라우저가 버림 → '받는 중'으로 보이지 않게, 맨 위 버튼으로 다시 허용.
      const ok=!!sub&&!!s&&Notification.permission==='granted';setSt(ok?'on':'off');
      if(sub&&s&&!ok)setMsg('알림 허용이 빠져 있어요. 맨 위 ‘🔔 우리 동네 알림 받기’를 누른 뒤 ‘허용’을 눌러 주세요. (또는 주소창 옆 사이트 아이콘 → 알림 ‘허용’)');
    }).catch(()=>setSt('off'));
    // 서비스 워커가 '받았다·띄웠다'를 알려 줌 → 도착 문제인지 휴대폰 알림 표시 설정 문제인지 구분.
    const onMsg=(e:MessageEvent)=>{const d=e.data as {gj?:string;ok?:boolean;error?:string;got?:boolean;v?:string};
      if(d?.gj==='pong'){note('서비스 워커',`v${d.v} 작동 중`);return;}
      if(d?.gj!=='push')return;
      if(d.got){if(waiting){clearTimeout(waiting);waiting=0;}note('휴대폰 도착',`✅ ${new Date().toLocaleTimeString('ko-KR')}`);setMsg('휴대폰이 알림을 받았어요. 띄우는 중…');return;}
      note('알림 띄우기',d.ok?'✅ 성공':`❌ ${d.error??'실패'}`);
      if(waiting){clearTimeout(waiting);waiting=0;}
      setMsg(d.ok?'✅ 휴대폰이 알림을 받아서 띄웠어요. 화면 위에 안 보였다면 아래 ‘알림이 안 보일 때’를 확인해 주세요.':`휴대폰이 알림을 받았지만 띄우지 못했어요(${d.error??'알 수 없음'}). 아래 ‘알림이 안 보일 때’를 확인해 주세요.`);
      setHelp(true);ga('push_received',{shown:!!d.ok,browser:browser()});};
    navigator.serviceWorker.addEventListener('message',onMsg);
    return ()=>navigator.serviceWorker.removeEventListener('message',onMsg);
  },[]);
  useEffect(()=>{if(!w&&pos){const p=here(pos);setW(nearestArea(areas,p.lat,p.lon).w);}},[pos,w,areas]);
  const area=areas.find(a=>a.w===w);
  const post=(path:string,body:unknown)=>fetch(`/api/push/${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json() as Promise<{ok?:boolean;error?:string;result?:string}>);
  async function on(){
    if(asking)return;
    if(!area||!t.length){setMsg('아래에서 지역과 받을 알림을 고른 뒤 다시 눌러 주세요.');return;}
    asking=true;setSt('busy');setMsg('');
    try{
      let sub:PushSubscription|null=null,perm:NotificationPermission=Notification.permission;
      if(!isIos()&&prep.reg&&prep.key){
        // 크롬·삼성 인터넷: 미리 준비해 둔 서비스 워커로 누르는 즉시 구독 → 허용 창 한 번(구독이 알림 허용까지 묻는다).
        // 따로 requestPermission을 먼저 부르면 삼성 인터넷은 알림·푸시를 따로 물어 창이 두 번 떴음(10/27 사용자 확인).
        sub=await prep.reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(prep.key)}).catch(()=>null);
        perm=Notification.permission;
        if(perm==='default')perm=await Notification.requestPermission();
      }else{
        // 사파리: 누르는 순간 허용부터(다른 일을 먼저 기다리면 '직접 누른 동작'이 아니라며 막음).
        perm=perm==='granted'?perm:await Notification.requestPermission();
      }
      if(perm!=='granted'){setSt(perm==='denied'?'denied':'off');ga('push_subscribe',{result:perm,browser:browser()});
        if(perm==='default'){setHelp(true);setMsg('허용 창이 뜨지 않았어요. 주소창 옆 사이트 아이콘(🔒 또는 내근처 아이콘)을 눌러 → 알림 ‘허용’으로 바꾼 뒤 다시 눌러 주세요.');}
        return;}
      if(!sub){
        const reg=prep.reg??await navigator.serviceWorker.register('/sw.js',{scope:'/'});await navigator.serviceWorker.ready;
        const key=prep.key??(await fetch('/api/push/key').then(r=>r.json() as Promise<{key:string}>)).key;
        sub=await reg.pushManager.getSubscription()??await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(key)});
      }
      const r=await post('subscribe',{sub:sub.toJSON(),w:area.w,c:area.c,n:area.n,lat:area.lat,lon:area.lon,t});
      if(!r.ok)throw new Error(r.error??'subscribe');
      try{localStorage.setItem(KEY,JSON.stringify({w:area.w,t}));}catch{}
      setSt('on');setMsg('등록됐어요. 아래 ‘시험 알림 보내기’로 바로 확인해 보세요.');ga('push_subscribe',{result:'granted',area:area.w,topics:t.join(','),browser:browser()});
    }catch{setSt('off');setMsg('등록하지 못했어요. 잠시 뒤 다시 눌러 주세요.');}
    finally{asking=false;}
  }
  /** 진단: 이 휴대폰의 알림 준비 상태(브라우저·권한·서비스 워커·구독). 알림이 안 올 때 캡처해 받기용 — 개인정보 없음. */
  async function inspect(){
    const u=navigator.userAgent.match(/(SamsungBrowser|Chrome|Firefox|Version)\/[\d.]+/g)?.join(' ')??'';
    const reg=await navigator.serviceWorker.getRegistration('/').catch(()=>undefined);
    const sub=await reg?.pushManager.getSubscription().catch(()=>null);
    const enc=(PushManager as unknown as {supportedContentEncodings?:string[]}).supportedContentEncodings;
    setDiag(d=>({...d,'브라우저':`${browser()} ${u}`,'알림 권한':Notification.permission,
      '서비스 워커':reg?.active?(d['서비스 워커']??'응답 기다림'):reg?.installing||reg?.waiting?'설치 중':'없음',
      '구독':sub?`${new URL(sub.endpoint).host}`:'없음','암호화 지원':enc?.join(', ')??'알 수 없음'}));
    reg?.active?.postMessage({gj:'ping'});
    return sub;
  }
  async function test(){
    setHelp(true);
    const sub=await inspect();if(!sub)return setSt('off');
    if(Notification.permission!=='granted'){setSt('off');setMsg('알림 허용이 빠져 있어요. 맨 위 ‘🔔 우리 동네 알림 받기’를 누른 뒤 ‘허용’을 눌러 주세요. (또는 주소창 옆 사이트 아이콘 → 알림 ‘허용’)');return;}
    note('휴대폰 도착','기다리는 중…');note('알림 띄우기','-');
    const r=await post('test',{endpoint:sub.endpoint}).catch(()=>({ok:false,error:'network'})) as {ok?:boolean;error?:string;result?:string;status?:number};ga('push_test',{ok:!!r.ok,status:r.status??0,browser:browser()});
    note('서버 발송',`${r.ok?'✅':'❌'} ${r.result??r.error??''} (푸시 서버 응답 ${r.status??'-'})`);
    setMsg(r.ok?'시험 알림을 보냈어요. 몇 초 안에 휴대폰 알림이 떠요.':r.error??'보내지 못했어요.');
    if(r.ok){if(waiting)clearTimeout(waiting);waiting=window.setTimeout(()=>{waiting=0;setHelp(true);
      setMsg('20초가 지나도 휴대폰이 알림을 받지 못했어요. 아래 ‘알림이 안 보일 때’를 확인해 주세요.');ga('push_received',{shown:false,timeout:true,browser:browser()});},20000);}
  }
  /** 서버를 거치지 않고 이 휴대폰에서 바로 알림 하나 띄우기 — 이게 안 보이면 휴대폰(앱) 알림 설정 문제. */
  async function local(){
    const reg=await navigator.serviceWorker.getRegistration('/');
    try{await reg?.showNotification('내근처 알림 표시 확인',{body:'이 알림이 보이면 휴대폰 알림 설정은 정상이에요.',tag:'gj-local',icon:'/icon-192.png'});setMsg('휴대폰에서 바로 알림을 띄웠어요. 안 보이면 아래 순서로 알림을 켜 주세요.');}
    catch{setMsg('이 브라우저에서 알림을 띄우지 못했어요. 아래 순서로 알림을 켜 주세요.');}
    setHelp(true);inspect();ga('push_local',{browser:browser()});
  }
  async function off(){
    const sub=await (await navigator.serviceWorker.getRegistration('/'))?.pushManager.getSubscription();
    if(sub){await post('unsubscribe',{endpoint:sub.endpoint}).catch(()=>null);await sub.unsubscribe().catch(()=>null);}
    try{localStorage.removeItem(KEY);}catch{}setSt('off');setMsg('알림을 껐어요.');ga('push_unsub');
  }
  const ext=externalUrl(inapp());
  // 맨 위 큰 '우리 동네 알림 받기' 상자도 버튼: 아직이면 알림 받기, 받고 있으면 시험 알림.
  const ready=st==='off'||st==='on';
  const hero=()=>{if(st==='off')on();else if(st==='on')test();else document.querySelector('.nr-alerts .gj-locate-help')?.scrollIntoView({behavior:'smooth',block:'center'});};
  return <>
  <button type="button" className="nr-hero small nr-alert-hero" onClick={hero} disabled={st==='busy'||st==='checking'}>
    <h1>🔔 우리 동네 알림 받기</h1>
    <p>앱 설치 없이, 아침마다 우리 동네 날씨와 쉬는 날 문 연 약국을 휴대폰 알림으로 보내 드려요.</p>
    <span className="nr-alert-hero-go">{st==='busy'?'등록 중…':st==='on'?'✅ 받는 중 · 눌러서 시험 알림 보내기':ready?'👉 여기를 눌러 알림 받기':'아래 안내를 확인해 주세요'}</span>
  </button>
  <section className="nr-alerts">
    {st==='inapp'&&<div className="gj-locate-help"><b>🔔 {inapp()} 안에서는 알림을 받을 수 없어요</b><p>{ext?'아래 버튼으로 휴대폰 브라우저에서 열면 알림을 받을 수 있어요.':<>오른쪽 아래(또는 위) <b>⋯ 메뉴 → ‘Safari로 열기’</b>를 누른 뒤 다시 와 주세요.</>}</p>{ext&&<a className="gj-locate-ext" href={ext}>🌐 휴대폰 브라우저로 열기</a>}</div>}
    {st==='ios-home'&&<div className="gj-locate-help"><b>🔔 아이폰은 홈 화면에 추가해야 알림을 받을 수 있어요</b><ol><li>아래 <b>공유 버튼(⬆︎)</b> → <b>‘홈 화면에 추가’</b></li><li>홈 화면의 ‘내근처’ 아이콘으로 다시 열기</li><li>이 페이지에서 ‘알림 받기’ 누르기</li></ol><p className="gj-locate-sub">iOS 16.4 이상에서 돼요.</p></div>}
    {st==='unsupported'&&<p className="gj-locate-help">이 브라우저는 알림을 지원하지 않아요. 크롬·삼성 인터넷·사파리(홈 화면 추가) 최신 버전에서 열어 주세요.</p>}
    {st==='denied'&&<div className="gj-locate-help"><b>🔔 알림이 차단돼 있어요</b><p>{isIos()?'설정 앱 → 알림 → 내근처 → 알림 허용':'주소창 왼쪽 아이콘(⚙️ 또는 자물쇠) → 권한 → 알림 → ‘허용’'} 후 이 페이지를 새로고침해 주세요.</p></div>}
    {(st==='off'||st==='on'||st==='busy'||st==='checking')&&<>
      <div className="nr-alert-form">
        <label><b>📍 지역</b>
          <select value={w} onChange={e=>setW(e.target.value)} disabled={st==='on'}>
            <option value="">시군구 고르기</option>
            {sidos.map(sd=><optgroup key={sd} label={sd}>{areas.filter(a=>a.n.split(' ')[0]===sd).map(a=><option key={a.w} value={a.w}>{a.n}</option>)}</optgroup>)}
          </select></label>
        <fieldset disabled={st==='on'}><legend><b>🔔 받을 알림</b></legend>
          {TOPICS.map(([k,label,desc])=><label key={k} className="nr-alert-topic"><input type="checkbox" checked={t.includes(k)} onChange={e=>setT(e.target.checked?[...t,k]:t.filter(x=>x!==k))}/><span><b>{label}</b><small>{desc}</small></span></label>)}
        </fieldset>
      </div>
      {st==='on'?<div className="nr-alert-on"><p>✅ <b>{area?.n??'우리 동네'}</b> 알림을 받고 있어요.</p><button type="button" onClick={test}>시험 알림 보내기</button><button type="button" className="sub" onClick={local}>이 휴대폰 알림 표시 확인</button><button type="button" className="sub" onClick={off}>알림 끄기</button></div>
        :<button type="button" className="nr-alert-go" onClick={on} disabled={st==='busy'||st==='checking'}>{st==='busy'?'등록 중…':'🔔 알림 받기'}</button>}
    </>}
    {msg&&<p className="nr-alert-msg">{msg}</p>}
    {(help||st==='on')&&<details className="nr-alert-help" open={help}><summary>알림이 안 보일 때</summary>
      {browser()==='samsung'?<ol>
        <li>가장 쉬운 방법: 주소창 옆 <b>사이트 아이콘(🔒 또는 내근처 아이콘)</b>을 눌러 → <b>알림 ‘허용’</b></li>
        <li>삼성 인터넷 <b>메뉴(≡) → 설정 → 사이트 및 다운로드 → 알림</b>에서 ‘알림 허용’을 켜고, 목록에서 <b>near.guidejung.com</b>이 켜져 있는지 확인</li>
        <li>휴대폰 <b>설정 → 애플리케이션 → 삼성 인터넷 → 알림</b>에서 ‘알림 허용’ 켜기(‘사이트 알림’ 항목도)</li>
        <li>휴대폰 <b>설정 → 애플리케이션 → 삼성 인터넷 → 배터리</b>를 ‘제한 없음’으로(절전 때문에 늦거나 안 오는 경우)</li>
        <li>‘알림 끄기’ → ‘알림 받기’를 다시 누른 뒤 ‘시험 알림 보내기’</li></ol>
      :isIos()?<ol><li>설정 앱 → 알림 → 내근처 → 알림 허용</li><li>집중 모드(방해 금지)가 켜져 있으면 끄기</li></ol>
      :<ol><li>주소창 왼쪽 아이콘 → 권한 → <b>알림 ‘허용’</b></li><li>휴대폰 <b>설정 → 애플리케이션 → (지금 브라우저) → 알림</b> 켜기</li><li>방해 금지 모드가 켜져 있으면 끄기</li><li>‘알림 끄기’ → ‘알림 받기’를 다시 누른 뒤 ‘시험 알림 보내기’</li></ol>}
      {Object.keys(diag).length>0&&<div className="nr-alert-diag"><b>진단 정보</b> <small>(알림이 안 오면 이 부분을 캡처해 보내 주세요)</small>
        <dl>{Object.entries(diag).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div>}
    </details>}
    <p className="muted small">밤(오후 9시~오전 8시)에는 보내지 않아요. 광고 알림은 보내지 않아요. 언제든 ‘알림 끄기’로 그만 받을 수 있어요.</p>
  </section></>;
}
