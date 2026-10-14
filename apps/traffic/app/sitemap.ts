import type {MetadataRoute} from 'next';
import {SITE,rests,routes} from '../lib/data';
export const dynamic='force-static';
export default function sitemap():MetadataRoute.Sitemap{
  return [{url:SITE+'/',changeFrequency:'always',priority:1},{url:SITE+'/road',changeFrequency:'hourly'},{url:SITE+'/rest',changeFrequency:'weekly'},{url:SITE+'/gas',changeFrequency:'daily',priority:.8},{url:SITE+'/incidents',changeFrequency:'always'},
    ...routes.map(r=>({url:`${SITE}/road/${r.no}`,changeFrequency:'always' as const,priority:.8})),
    ...rests.map(r=>({url:`${SITE}/rest/${r.code}`,changeFrequency:'weekly' as const,priority:.6}))];
}
