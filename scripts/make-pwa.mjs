// Home-screen app files for every 내근처 site: PNG icons (from public/icon.svg) and public/manifest.webmanifest.
// Names come from SITES in packages/ui/src/network.tsx. Run again after changing an icon or a site name:
//   node scripts/make-pwa.mjs
import {readFileSync,writeFileSync} from 'node:fs';
import sharp from 'sharp';

const net=readFileSync('packages/ui/src/network.tsx','utf8');
const sites=[...net.matchAll(/^\s+(\w+):\{url:'https:\/\/(\w+)\.guidejung\.com',icon:'[^']*',name:'([^']*)',brand:'([^']*)',tagline:'([^']*)'/gm)];
for(const [,key,,name,brand,tagline] of sites){
  const dir=`apps/${key}/public`,svg=readFileSync(`${dir}/icon.svg`);
  const color=String(svg).match(/<rect[^>]*fill="(#[0-9a-fA-F]{3,6})"/)?.[1]??'#1765e8';
  for(const [file,size] of [['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180]])
    await sharp(svg,{density:Math.ceil(72*size/64)}).resize(size,size).png().toFile(`${dir}/${file}`);
  const manifest={name:brand,short_name:brand.replace(/^내근처 /,'')===brand?brand:`내근처 ${name}`,description:`${brand} — ${tagline}`,lang:'ko',
    start_url:'/?source=pwa',scope:'/',display:'standalone',background_color:'#ffffff',theme_color:color,
    icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icon-512.png',sizes:'512x512',type:'image/png'},{src:'/icon.svg',sizes:'any',type:'image/svg+xml'}]};
  writeFileSync(`${dir}/manifest.webmanifest`,JSON.stringify(manifest,null,1)+'\n');
  console.log(key,brand,color);
}
