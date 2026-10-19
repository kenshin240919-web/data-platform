import {AdSlot} from '@guidejung/ui/ads';
// Template for the Worker: it renders /academy/{id} from D1 by filling this page's <main> (same header, footer, scripts).
// Not linked and not in the sitemap; the Worker answers 404 for /academy/shell itself.
export default function AcademyShell(){return <div className="page"><div id="academy-detail">ACADEMY_DETAIL</div><AdSlot/></div>;}
