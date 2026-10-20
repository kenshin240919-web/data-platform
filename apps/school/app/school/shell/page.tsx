import {AdSlot} from '@guidejung/ui/ads';
// Template for the Worker: it renders /school/{code} by filling this page's <main> (same header, footer, scripts).
// Not linked and not in the sitemap; the Worker answers 404 for /school/shell itself.
export default function SchoolShell(){return <div className="page"><div id="school-detail">SCHOOL_DETAIL</div><AdSlot/></div>;}
