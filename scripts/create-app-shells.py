"""Generate identical Next wrappers around the shared product, without duplicating logic."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
for service in ('trip',):
    app=root/'apps'/service
    files={
    'tsconfig.json':json.dumps({'compilerOptions':{'target':'ES2017','lib':['dom','dom.iterable','esnext'],'allowJs':True,'skipLibCheck':True,'strict':True,'noEmit':True,'esModuleInterop':True,'module':'esnext','moduleResolution':'bundler','resolveJsonModule':True,'isolatedModules':True,'jsx':'react-jsx','incremental':True,'plugins':[{'name':'next'}]},'include':['next-env.d.ts','**/*.ts','**/*.tsx','.next/types/**/*.ts','.next/dev/types/**/*.ts'],'exclude':['node_modules']},indent=2),
    'next-env.d.ts':'/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n',
    'app/layout.tsx':f'''import type {{ Metadata }} from 'next';
import {{ Shell }} from '@guidejung/ui';
import '@guidejung/ui/styles';
export const metadata:Metadata={{icons:{{icon:'/icon.svg'}}}};
export default function Layout({{children}}:{{children:React.ReactNode}}){{return <html lang="ko"><body><Shell service="{service}">{{children}}</Shell></body></html>;}}
''',
    'app/[[...segments]]/page.tsx':f'''import {{Page,pageMetadata}} from '@guidejung/ui';
export const dynamic='force-dynamic';
type Props={{params:Promise<{{segments?:string[]}}>;searchParams:Promise<Record<string,string|string[]|undefined>>}};
export async function generateMetadata(props:Props){{const p=await props.params;return pageMetadata('{service}',p.segments||[],await props.searchParams);}}
export default async function Route(props:Props){{const p=await props.params;return Page({{service:'{service}',segments:p.segments||[],params:await props.searchParams}});}}
''',
    'app/sitemap.ts':f"import {{siteMap}} from '@guidejung/ui';\nexport const dynamic='force-dynamic';\nexport default function sitemap(){{return siteMap('{service}');}}\n",
    'app/robots.ts':f"import {{robots}} from '@guidejung/ui';\nexport default function rules(){{return robots('{service}');}}\n",
    'app/not-found.tsx':'''import Link from 'next/link';
export default function NotFound(){return <section className="section empty"><h1>찾으시는 정보가 없습니다</h1><p>주소를 확인하거나 다른 지역을 탐색해 보세요.</p><Link href="/">처음으로</Link></section>;}
''',
    'app/loading.tsx':'export default function Loading(){return <div className="loading" role="status">정보를 불러오고 있습니다.</div>;}\n',
    'app/error.tsx':'''"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <section className="section empty"><h1>정보를 불러오지 못했습니다</h1><p>데이터 연결을 확인하고 다시 시도하세요.</p><button onClick={reset}>다시 시도</button></section>;}
''',
    'app/api/admin/route.ts':'''import {NextRequest,NextResponse} from 'next/server';
export async function GET(request:NextRequest){
 const token=request.headers.get('x-admin-token');if(!token)return NextResponse.json({detail:'관리자 토큰을 입력하세요.'},{status:401});
 try{const res=await fetch(`${process.env.INTERNAL_API_URL||'http://127.0.0.1:8100'}/v1/admin/overview`,{headers:{'x-admin-token':token},cache:'no-store',signal:AbortSignal.timeout(8000)});return NextResponse.json(await res.json(),{status:res.status,headers:{'Cache-Control':'no-store'}});}
 catch{return NextResponse.json({detail:'데이터 서버에 연결하지 못했습니다.'},{status:503});}
}
''',
    'public/icon.svg':'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#1765e8"/><text x="12" y="47" font-family="Arial" font-weight="bold" font-size="43" fill="white">G</text><circle cx="52" cy="47" r="5" fill="#d4f563"/></svg>'
    }
    for name,content in files.items():
        target=app/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(content,encoding='utf-8')
print('trip Next shell created')
