// 11/19: 옛 버전을 돌려 쓰는 Windows 데스크톱 크롬 UA(103·105·106·107·110·116…)로 목록·상세를 긁는 봇 — 참여 0%, Workers CPU 비용의 큰 몫.
// 꼬리 글자가 순수 크롬일 때만(Edge·웨일·삼성 등은 꼬리가 붙어 제외), Windows 10 + 120 밑 버전만 403. Windows 7·8의 크롬 109는 사람이라 그대로.
const OLD_CHROME=/^Mozilla\/5\.0 \(Windows NT 10\.0; Win64; x64\) AppleWebKit\/537\.36 \(KHTML, like Gecko\) Chrome\/(\d+)\.[\d.]+ Safari\/537\.\d+$/;
export const oldChrome=(ua:string)=>{const m=OLD_CHROME.exec(ua);return !!m&&+m[1]<120;};
/** Worker fetch 맨 앞: `const bot=blockBot(req);if(bot)return bot;` */
export const blockBot=(req:Request)=>oldChrome(req.headers.get('user-agent')??'')?new Response('Forbidden',{status:403,headers:{'cache-control':'no-store'}}):null;
