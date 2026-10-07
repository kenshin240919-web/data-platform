import {Page,pageMetadata,staticSegments} from '@guidejung/ui';
// Static export: every page is listed here and built ahead of time.
export const dynamicParams=false;
export async function generateStaticParams(){return (await staticSegments()).map(segments=>({segments}));}
type Props={params:Promise<{segments?:string[]}>};
export async function generateMetadata(props:Props){const p=await props.params;return pageMetadata('trip',p.segments||[]);}
export default async function Route(props:Props){const p=await props.params;return Page({service:'trip',segments:p.segments||[]});}
