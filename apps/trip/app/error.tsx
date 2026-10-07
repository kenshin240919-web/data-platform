"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <section className="section empty"><h1>정보를 불러오지 못했습니다</h1><p>데이터 연결을 확인하고 다시 시도하세요.</p><button onClick={reset}>다시 시도</button></section>;}
