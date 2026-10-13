import type {MetadataRoute} from 'next';
import {regions,sidos,SITE} from '../lib/regions';
export const dynamic='force-static';
export default function sitemap():MetadataRoute.Sitemap{
  return [{url:SITE+'/',changeFrequency:'hourly',priority:1},{url:SITE+'/region',changeFrequency:'weekly'},{url:SITE+'/weekend',changeFrequency:'hourly',priority:.9},{url:SITE+'/air',changeFrequency:'hourly',priority:.9},{url:SITE+'/wear',changeFrequency:'daily',priority:.8},{url:SITE+'/warnings',changeFrequency:'hourly',priority:.8},
    ...sidos.map(s=>({url:`${SITE}/region/${s.code}`,changeFrequency:'hourly' as const,priority:.8})),
    ...regions.map(r=>({url:`${SITE}/region/${r.code}`,changeFrequency:'hourly' as const,priority:.7}))];
}
