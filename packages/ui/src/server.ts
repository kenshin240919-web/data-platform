import 'server-only';
import type { Service } from './types';
export function origin(service:Service){
  const value=process.env[service==='home'?'HOME_PUBLIC_URL':'TRIP_PUBLIC_URL'] || `http://localhost:${service==='home'?3100:3101}`;
  const url=new URL(value);
  if(!['localhost','127.0.0.1',`${service}.guidejung.com`].includes(url.hostname))throw new Error('기존 도메인은 신규 앱 대상이 아닙니다.');
  return url.origin;
}
export async function api<T>(path:string):Promise<T>{
  const res=await fetch(`${process.env.INTERNAL_API_URL || 'http://127.0.0.1:8100'}${path}`,{cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!res.ok)throw new Error(`데이터 조회 실패 (${res.status})`);
  return res.json() as Promise<T>;
}
export const enabled=()=>process.env.SEO_ENABLED==='true' && process.env.DATA_MODE==='live';
