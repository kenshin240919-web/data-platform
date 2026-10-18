// Google Analytics 4 (gtag.js). One measurement ID (G-…) per site; goes in <head> right after it opens.
export const gaInline=(id:string)=>`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`;
export function GaScript({id}:{id:string}){
  if(!/^G-[A-Z0-9]+$/.test(id))return null;
  return <><script async src={`https://www.googletagmanager.com/gtag/js?id=${id}`}/><script dangerouslySetInnerHTML={{__html:gaInline(id)}}/></>;
}
