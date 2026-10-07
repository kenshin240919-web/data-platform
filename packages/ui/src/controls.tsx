'use client';
import {useState} from 'react';
export function Nearby({base}:{base:string}){
  const [state,setState]=useState('');
  function find(){
    if(!navigator.geolocation){setState('위치 기능을 지원하지 않습니다. 지역을 선택하세요.');return;}
    setState('위치를 확인하고 있습니다.');
    navigator.geolocation.getCurrentPosition(p=>{location.href=`${base}/search?lat=${p.coords.latitude}&lon=${p.coords.longitude}&radius_km=20`;},()=>setState('위치 권한을 확인하거나 지역을 직접 선택하세요.'),{timeout:10000,maximumAge:60000});
  }
  return <div><button type="button" className="nearby" onClick={find}>◎ 내 주변 20km</button>{state&&<p role="status" className="muted small">{state}</p>}</div>;
}
