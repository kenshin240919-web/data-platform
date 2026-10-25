// 해 뜨는 시각 계산(NOAA 근사식, apps/weather/lib/format.ts sunTimes와 같은 식). KST "HH:MM". 계산값이라 실제와 1~2분 다를 수 있다.
export function sunrise(lat:number,lon:number,ymd:string){
  const y=+ymd.slice(0,4),m=+ymd.slice(5,7),d=+ymd.slice(8,10),rad=Math.PI/180;
  const day=Math.floor((Date.UTC(y,m-1,d)-Date.UTC(y,0,0))/864e5),g=2*Math.PI/365*(day-1);
  const eq=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
  const dec=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
  const ha=Math.acos(Math.cos(90.833*rad)/(Math.cos(lat*rad)*Math.cos(dec))-Math.tan(lat*rad)*Math.tan(dec))/rad;
  const t=(Math.round(720-4*(lon+ha)-eq+540)%1440+1440)%1440;
  return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
}
