import {Ad} from '../../_components/Ad';
// Template for the Worker: it renders /shop/{id} by filling this page's <main> (same header, footer, scripts).
// Not linked and not in the sitemap; the Worker answers 404 for /shop/shell itself.
export default function ShopShell(){return <div className="page"><div id="shop-detail">SHOP_DETAIL</div><Ad/></div>;}
