// Remove Next.js RSC payload files (*.txt, __next.*) from a static export to keep the asset count low
// (Cloudflare Workers static assets have a file limit; academy had 10,443 .txt next to 2,089 pages).
// Pages still work: the HTML carries its own payload, and a client navigation whose payload is missing
// falls back to a normal page load. Root text files that are real content (robots.txt, ads.txt, llms.txt) stay.
// Usage: node scripts/prune-rsc.mjs <out dir>
import {readdirSync,rmSync,rmdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
const root=process.argv[2];if(!root)throw new Error('usage: prune-rsc.mjs <out dir>');
const KEEP=new Set(['robots.txt','ads.txt','llms.txt']);
let removed=0;
function walk(dir,top){
  for(const name of readdirSync(dir)){
    const p=join(dir,name);
    if(statSync(p).isDirectory()){if(name!=='_next')walk(p,false);try{rmdirSync(p);}catch{}continue;}  // rmdir only succeeds when empty
    if(name.endsWith('.txt')&&!(top&&KEEP.has(name))){rmSync(p);removed++;}
  }
}
walk(root,true);
console.log(`prune-rsc: removed ${removed.toLocaleString()} RSC files from ${root}`);
