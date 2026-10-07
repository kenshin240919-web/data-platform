import {rss} from '@guidejung/ui';
// Latest changed places/events for search engine RSS collection (rebuilt on every export/deploy).
export const dynamic='force-static';
export function GET(){return new Response(rss('trip'),{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});}
