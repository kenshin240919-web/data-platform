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
const load=():Saved|null=>{try{return JSON.parse(localStorage.getItem(KEY)??'null');}catch{return null;}};

export function AlertSetup({areas}:{areas:Area[]}){
  const {pos}=useMyPosition();
  const [st,setSt]=useState<State>('checking');const [w,setW]=useState('');const [t,setT]=useState<string[]>(['weather','pharmacy']);const [msg,setMsg]=useState('');
  const sidos=[...new Set(areas.map(a=>a.n.split(' ')[0]))];
  useEffect(()=>{
    const s=load();if(s){setW(s.w);setT(s.t);}
    if(inapp()){setSt('inapp');return;}
    if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){
      setSt(isIos()&&!(navigator as {standalone?:boolean}).standalone?'ios-home':'unsupported');return;}
    if(Notification.permission==='denied'){setSt('denied');return;}
    navigator.serviceWorker.getRegistration('/').then(r=>r?.pushManager.getSubscription()).then(sub=>setSt(sub&&s?'on':'off')).catch(()=>setSt('off'));
  },[]);
  useEffect(()=>{if(!w&&pos){const p=here(pos);setW(nearestArea(areas,p.lat,p.lon).w);}},[pos,w,areas]);
  const area=areas.find(a=>a.w===w);
  const post=(path:string,body:unknown)=>fetch(`/api/push/${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json() as Promise<{ok?:boolean;error?:string;result?:string}>);
  async function on(){
    if(!area||!t.length){setMsg('지역과 받을 알림을 골라 주세요.');return;}
    setSt('busy');setMsg('');
    try{
      const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/'});await navigator.serviceWorker.ready;
      const perm=await Notification.requestPermission();if(perm!=='granted'){setSt(perm==='denied'?'denied':'off');ga('push_subscribe',{result:perm});return;}
      const {key}=await fetch('/api/push/key').then(r=>r.json() as Promise<{key:string}>);
      const sub=await reg.pushManager.getSubscription()??await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(key)});
      const r=await post('subscribe',{sub:sub.toJSON(),w:area.w,c:area.c,n:area.n,lat:area.lat,lon:area.lon,t});
      if(!r.ok)throw new Error(r.error??'subscribe');
      try{localStorage.setItem(KEY,JSON.stringify({w:area.w,t}));}catch{}
      setSt('on');setMsg('등록됐어요. 아래 ‘시험 알림 보내기’로 바로 확인해 보세요.');ga('push_subscribe',{result:'granted',area:area.w,topics:t.join(',')});
    }catch{setSt('off');setMsg('등록하지 못했어요. 잠시 뒤 다시 눌러 주세요.');}
  }
  async function test(){
    const sub=await (await navigator.serviceWorker.getRegistration('/'))?.pushManager.getSubscription();if(!sub)return setSt('off');
    const r=await post('test',{endpoint:sub.endpoint}).catch(()=>({ok:false,error:'network'}));ga('push_test',{ok:!!r.ok});
    setMsg(r.ok?'시험 알림을 보냈어요. 몇 초 안에 휴대폰 알림이 떠요.':r.error??'보내지 못했어요.');
  }
  async function off(){
    const sub=await (await navigator.serviceWorker.getRegistration('/'))?.pushManager.getSubscription();
    if(sub){await post('unsubscribe',{endpoint:sub.endpoint}).catch(()=>null);await sub.unsubscribe().catch(()=>null);}
    try{localStorage.removeItem(KEY);}catch{}setSt('off');setMsg('알림을 껐어요.');ga('push_unsub');
  }
  const ext=externalUrl(inapp());
  return <section className="nr-alerts">
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
      {st==='on'?<div className="nr-alert-on"><p>✅ <b>{area?.n??'우리 동네'}</b> 알림을 받고 있어요.</p><button type="button" onClick={test}>시험 알림 보내기</button><button type="button" className="sub" onClick={off}>알림 끄기</button></div>
        :<button type="button" className="nr-alert-go" onClick={on} disabled={st==='busy'||st==='checking'}>{st==='busy'?'등록 중…':'🔔 알림 받기'}</button>}
    </>}
    {msg&&<p className="nr-alert-msg">{msg}</p>}
    <p className="muted small">밤(오후 9시~오전 8시)에는 보내지 않아요. 광고 알림은 보내지 않아요. 언제든 ‘알림 끄기’로 그만 받을 수 있어요.</p>
  </section>;
}
