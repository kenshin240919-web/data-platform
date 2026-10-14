// Microsoft Clarity (heatmaps · session recordings). One Clarity project per site; pass that site's project ID.
export function ClarityScript({id}:{id:string}){
  if(!/^[a-z0-9]+$/i.test(id))return null;
  const code=`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${id}");`;
  return <script dangerouslySetInnerHTML={{__html:code}}/>;
}
