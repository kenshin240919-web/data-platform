import {Page,pageMetadata} from '@guidejung/ui';
export const dynamic='force-dynamic';
type Props={params:Promise<{segments?:string[]}>;searchParams:Promise<Record<string,string|string[]|undefined>>};
export async function generateMetadata(props:Props){const p=await props.params;return pageMetadata('trip',p.segments||[],await props.searchParams);}
export default async function Route(props:Props){const p=await props.params;return Page({service:'trip',segments:p.segments||[],params:await props.searchParams});}
