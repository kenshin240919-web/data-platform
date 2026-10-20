'use client';
// '내 학교'(브라우저 localStorage gj.school, 학교 상세의 저장 버튼과 같은 키). 서버로 보내지 않음.
import {useEffect,useState} from 'react';
export type Mine={code:string;name:string;kind:string;k:string;grade?:string|null;cls?:string|null};
const KEY='gj.school',EVT='gj-school';
export function getMine():Mine|null{try{return JSON.parse(localStorage.getItem(KEY)??'null');}catch{return null;}}
export function setMine(v:Mine|null){try{if(v)localStorage.setItem(KEY,JSON.stringify(v));else localStorage.removeItem(KEY);}catch{}window.dispatchEvent(new Event(EVT));}
export function useMine(){
  const [v,setV]=useState<Mine|null|undefined>(undefined);  // undefined = 아직 읽기 전(첫 화면 깜빡임 방지)
  useEffect(()=>{const f=()=>setV(getMine());f();window.addEventListener(EVT,f);window.addEventListener('storage',f);return ()=>{window.removeEventListener(EVT,f);window.removeEventListener('storage',f);};},[]);
  return v;
}
