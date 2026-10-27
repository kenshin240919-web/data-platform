// 앱 안 브라우저(카카오톡·네이버 앱 등) 알아보기와 바깥 브라우저로 여는 주소 — install.tsx(홈 화면 추가)·geo.tsx(위치 못 쓸 때)가 함께 쓴다.
/** 앱 안 브라우저 이름(아니면 null). 이 안에서는 홈 화면 추가가 안 되고, 위치도 막혀 있는 경우가 많다. */
export function inapp():string|null{
  if(typeof navigator==='undefined')return null;const u=navigator.userAgent;
  return /KAKAOTALK/i.test(u)?'카카오톡':/NAVER\(inapp|NAVER\//i.test(u)?'네이버 앱':/Instagram/i.test(u)?'인스타그램':/FBAN|FBAV/i.test(u)?'페이스북':/\bLine\//i.test(u)?'라인':/DaumApps/i.test(u)?'다음 앱':/BAND\//i.test(u)?'밴드':/everytimeApp/i.test(u)?'에브리타임':null;
}
export const isIos=()=>typeof navigator!=='undefined'&&/iphone|ipad|ipod/i.test(navigator.userAgent);
export const isAndroid=()=>typeof navigator!=='undefined'&&/android/i.test(navigator.userAgent);
export const isSamsung=()=>typeof navigator!=='undefined'&&/SamsungBrowser/i.test(navigator.userAgent);
/** 바깥 브라우저로 여는 주소: 카카오톡은 공식 스킴, 안드로이드 다른 앱은 크롬 intent, 아이폰 다른 앱은 없음(⋯ → Safari로 열기 안내). */
export function externalUrl(app:string|null,href=typeof location!=='undefined'?location.href:''){
  if(!app)return null;
  if(app==='카카오톡')return 'kakaotalk://web/openExternal?url='+encodeURIComponent(href);
  if(isAndroid())return `intent://${href.replace(/^https?:\/\//,'')}#Intent;scheme=https;package=com.android.chrome;end`;
  return null;
}
