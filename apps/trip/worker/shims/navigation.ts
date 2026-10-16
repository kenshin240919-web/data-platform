// next/navigation for Worker-rendered pages (server render only; the page is not hydrated).
export const usePathname=()=>'';
export const useSearchParams=()=>new URLSearchParams();
export function notFound():never{throw new Error('NEXT_NOT_FOUND');}
