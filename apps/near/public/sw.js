// 내근처 알림 서비스 워커: 푸시를 받아 알림을 띄우고, 누르면 그 페이지를 연다. (페이지 캐시는 하지 않음)
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>{
  let m={title:'내근처',body:'우리 동네 소식이 왔어요',url:'https://near.guidejung.com/',tag:'gj'};
  try{if(e.data)m=Object.assign(m,e.data.json())}catch(x){}
  e.waitUntil(self.registration.showNotification(m.title,{body:m.body,tag:m.tag,icon:'/icon-192.png',badge:'/icon-192.png',lang:'ko',data:{url:m.url}}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'https://near.guidejung.com/';
  e.waitUntil(self.clients.openWindow(url));
});
