'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';

type Item={code:string;label:string};
const KEY='weather.recent';
function read():Item[]{try{return JSON.parse(localStorage.getItem(KEY)??'[]');}catch{return [];}}
/** Remember a viewed region (newest first, max 6). */
export function remember(item:Item){try{localStorage.setItem(KEY,JSON.stringify([item,...read().filter(i=>i.code!==item.code)].slice(0,6)));}catch{}}
export function lastViewed(){return read()[0]??null;}

/** "최근 본 지역" chips so returning visitors jump straight back in. */
export function Recent({exclude}:{exclude?:string}){
  const [items,setItems]=useState<Item[]>([]);
  useEffect(()=>{setItems(read().filter(i=>i.code!==exclude));},[exclude]);
  if(!items.length)return null;
  return <div className="chips" aria-label="최근 본 지역"><span className="chips-label">최근 본 지역</span>{items.map(i=><Link key={i.code} href={`/region/${i.code}`}>{i.label}</Link>)}</div>;
}
