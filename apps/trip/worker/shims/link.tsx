// Worker-rendered pages have no Next.js router: next/link becomes a plain link (full page load).
import type {AnchorHTMLAttributes} from 'react';
export default function Link({href,prefetch:_p,replace:_r,scroll:_s,...rest}:AnchorHTMLAttributes<HTMLAnchorElement>&{href:string;prefetch?:unknown;replace?:unknown;scroll?:unknown}){return <a href={href} {...rest}/>;}
