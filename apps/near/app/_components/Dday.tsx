'use client';
// D-day 표시(한국 날짜 기준). 정적 HTML에는 날짜만 있고, 브라우저에서 남은 날을 채운다.
import {useEffect,useState} from 'react';
export function Dday({iso,label}:{iso:string;label:string}){
  const [left,setLeft]=useState<number|null>(null);
  useEffect(()=>{const today=new Date(Date.now()+9*3600e3).toISOString().slice(0,10);setLeft(Math.round((Date.parse(iso)-Date.parse(today))/864e5));},[iso]);
  return <p className="nr-dday"><b>{left===null?label:left>0?`D-${left}`:left===0?'오늘이에요':`${-left}일 지났어요`}</b><span>{label}</span></p>;
}
