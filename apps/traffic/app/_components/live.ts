'use client';
// Shared live data hooks: one request per page for /api/traffic and /api/incidents, re-asked while the Worker refreshes.
import {useEffect,useState} from 'react';
import type {CctvResponse,IncidentsResponse,TrafficResponse} from '../../lib/types';

function shared<T extends {refreshing?:boolean}>(url:string){
  let p:Promise<T>|null=null;
  const load=(force=false)=>{if(force||!p)p=fetch(url,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json() as Promise<T>;}).catch(e=>{p=null;throw e;});return p;};
  return function useLive(){
    const [data,setData]=useState<T|null>(null);const [failed,setFailed]=useState(false);
    useEffect(()=>{let alive=true,timer:ReturnType<typeof setTimeout>|undefined;
      // An older copy shows at once; ask again a few times until the Worker has the new one.
      const poll=(n:number)=>{timer=setTimeout(()=>load(true).then(d=>{if(!alive)return;if(!d.refreshing)setData(d);else if(n>1)poll(n-1);},()=>{}),6000);};
      load().then(d=>{if(!alive)return;setData(d);if(d.refreshing)poll(5);},()=>alive&&setFailed(true));
      return ()=>{alive=false;clearTimeout(timer);};},[]);
    return {data,failed};
  };
}
export const useTraffic=shared<TrafficResponse>('/api/traffic');
export const useIncidents=shared<IncidentsResponse>('/api/incidents');
export const useCctv=shared<CctvResponse>('/api/cctv');

export const GRADE=[{text:'정보 없음',tone:'none'},{text:'원활',tone:'ok'},{text:'서행',tone:'slow'},{text:'정체',tone:'jam'}] as const;
export const fmtTime=(t:string)=>t?`${+t.slice(4,6)}.${+t.slice(6,8)} ${t.slice(8,10)}:${t.slice(10,12)}`:'';
