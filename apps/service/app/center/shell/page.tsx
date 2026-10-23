import {AdSlot} from '@guidejung/ui/ads';
// Template for the Worker: it renders /center/{id} by filling this page's <main> (same header, footer, scripts).
// Not linked and not in the sitemap; the Worker answers 404 for /center/shell itself.
export default function CenterShell(){return <div className="page"><div id="center-detail">CENTER_DETAIL</div><AdSlot/></div>;}
