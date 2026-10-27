// 각 사이트 public/og.png(공유 미리보기 1200×630)를 다시 그림: node scripts/make-og.mjs [사이트,…] — Noto Sans KR(~/.fonts)·Noto Color Emoji·playwright 필요.
// 그림을 바꾸면 og:image 주소의 ?v= 숫자를 올려야 카카오톡·네이버가 새 그림을 가져감(grep "og.png?v=").
// 공유 미리보기(og.png) 1200×630: 사이트 이름을 크게, 부제는 아래. 카카오톡은 가운데를 정사각형 가까이 잘라 보여 줘서 글자는 가운데 600px 안에.
import {createRequire} from 'module';const require=createRequire(import.meta.url);const {chromium}=require('playwright');
const S={
 trip:['🚗','내근처 여행','오늘 어디가?','#1765e8','#3b82f6'],
 weather:['🌤️','내근처 날씨','오늘 날씨 어때?','#1f7fd6','#38bdf8'],
 traffic:['🛣️','내근처 고속도로','지금 길 막혀?','#1f3b73','#2f5aa8'],
 charge:['⚡','내근처 충전소','지금 바로 충전 가능한 곳','#0f9d58','#22c55e'],
 academy:['🎓','내근처 학원','우리 동네 학원비 얼마야?','#5b3cc4','#7c5cf0'],
 school:['🏫','내 학교','오늘 급식 뭐야?','#0f7a55','#16a36f'],
 pharmacy:['💊','내근처 약국','지금 문 연 약국 어디?','#d6336c','#ec5f8f'],
 hospital:['🏥','내근처 병원','지금 진료하는 병원 어디?','#1c7ed6','#3d9cf0'],
 oil:['⛽','내근처 주유소','기름값 제일 싼 곳 어디?','#e8590c','#f97c2f'],
 parking:['🅿️','내근처 주차장','여기 주차 어디 해?','#1c64d6','#3b82f6'],
 service:['🔧','내근처 서비스센터','고장 났다, 어디로 가지?','#d9480f','#f0661f'],
 near:['📍','내근처','내 근처에 뭐가 있지?','#1765e8','#4f8df5'],
 rest:['♨️','내근처 휴식','오늘 어디서 쉬지?','#0b7285','#1495aa'],
 pet:['🐾','내근처 동물병원','우리 아이 아플 때 어디로?','#c2410c','#ea6a2a'],
 civil:['🖨️','내근처 서류','떼고, 뽑고, 부치는 곳','#364fc7','#5468e0'],
 market:['🏪','내근처 시장','온누리 어디서 써?','#be123c','#e11d48'],
};
const html=([icon,brand,tag,c1,c2])=>{const [a,...b]=brand.split(' ');const fs=Math.min(118,Math.floor(620/(brand.length*0.95)));
return `<html><body style="margin:0;width:1200px;height:630px;background:radial-gradient(circle at 50% 38%,${c2},${c1} 70%);font-family:'Noto Sans KR';color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;word-break:keep-all;overflow:hidden">
<div style="width:150px;height:150px;border-radius:44px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:96px;font-family:'Noto Color Emoji';box-shadow:0 10px 30px rgba(0,0,0,.18)">${icon}</div>
<div style="font-size:${fs}px;font-weight:900;letter-spacing:-2px;line-height:1.15;margin-top:34px;white-space:nowrap;text-shadow:0 3px 12px rgba(0,0,0,.15)">${b.length?`${a} ${b.join(' ')}`:a}</div>
<div style="margin-top:26px;background:rgba(255,255,255,.95);color:${c1};font-size:38px;font-weight:700;border-radius:60px;padding:12px 36px;white-space:nowrap">${tag}</div></body></html>`;};
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1200,height:630}});
const only=process.argv[2]?process.argv[2].split(','):Object.keys(S);
for(const k of only){await p.setContent(html(S[k]));await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(200);
  await p.screenshot({path:process.argv[3]?`${process.argv[3]}/${k}.png`:new URL(`../apps/${k}/public/og.png`,import.meta.url).pathname});}
await b.close();
