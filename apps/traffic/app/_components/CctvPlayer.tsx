'use client';
import {useEffect,useRef,useState} from 'react';
import type {Cctv} from '../../lib/types';

// hls.js only for browsers without native HLS (desktop Chrome·Firefox); Safari and most mobile browsers play it directly.
const HLS_JS='https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.17/hls.min.js';
let hlsLoad:Promise<any>|null=null;
function loadHls(){return hlsLoad??=new Promise((ok,fail)=>{const s=document.createElement('script');s.src=HLS_JS;s.onload=()=>ok((window as any).Hls);s.onerror=fail;document.head.appendChild(s);});}
export const cctvName=(c:Cctv)=>c.name.replace(/^\[[^\]]+\]\s*/,'');
export const cctvRoad=(c:Cctv)=>c.name.match(/^\[([^\]]+)\]/)?.[1]??'';

/** 고정 화면 플레이어: 영상 + 이전·다음 CCTV로 넘기기. 광고와 떨어진 오버레이로 띄운다. */
export function CctvPlayer({list,index,onIndex,onClose}:{list:Cctv[];index:number;onIndex:(i:number)=>void;onClose:()=>void}){
  const ref=useRef<HTMLVideoElement>(null);const [err,setErr]=useState(false);const c=list[index];
  useEffect(()=>{
    const v=ref.current;if(!v||!c)return;setErr(false);let hls:any=null,alive=true;
    if(v.canPlayType('application/vnd.apple.mpegurl')){v.src=c.url;v.play().catch(()=>{});}
    else loadHls().then(Hls=>{if(!alive)return;if(!Hls?.isSupported()){setErr(true);return;}hls=new Hls();hls.loadSource(c.url);hls.attachMedia(v);
      hls.on(Hls.Events.ERROR,(_:unknown,d:any)=>{if(d?.fatal)setErr(true);});v.play().catch(()=>{});},()=>setErr(true));
    return ()=>{alive=false;hls?.destroy();v.removeAttribute('src');v.load();};
  },[c]);
  useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();if(e.key==='ArrowRight'&&index<list.length-1)onIndex(index+1);if(e.key==='ArrowLeft'&&index>0)onIndex(index-1);};
    addEventListener('keydown',k);return ()=>removeEventListener('keydown',k);},[index,list.length,onClose,onIndex]);
  if(!c)return null;
  return <div className="tf-player" role="dialog" aria-modal="true" aria-label={`${cctvName(c)} CCTV`}>
    <div className="tf-player-box">
      <div className="tf-player-head"><b>📹 {cctvName(c)}</b><span className="muted small">{cctvRoad(c)} · {index+1}/{list.length}</span><button type="button" className="tf-close" onClick={onClose} aria-label="닫기">✕</button></div>
      <video ref={ref} controls muted playsInline autoPlay className="tf-video"/>
      {err&&<p className="notice">영상을 불러오지 못했습니다. 잠시 후 다시 시도하거나 다음 CCTV를 보세요.</p>}
      <div className="tf-player-nav"><button type="button" disabled={index===0} onClick={()=>onIndex(index-1)}>◀ 이전 CCTV</button><button type="button" disabled={index>=list.length-1} onClick={()=>onIndex(index+1)}>다음 CCTV ▶</button></div>
      <p className="muted small">영상 제공: 국가교통정보센터(ITS) · 실시간 영상은 수 초 늦을 수 있습니다.</p>
    </div>
  </div>;
}
