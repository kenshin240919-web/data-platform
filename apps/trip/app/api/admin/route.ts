import {NextRequest,NextResponse} from 'next/server';
export async function GET(request:NextRequest){
 const token=request.headers.get('x-admin-token');if(!token)return NextResponse.json({detail:'관리자 토큰을 입력하세요.'},{status:401});
 const endpoint=request.nextUrl.searchParams.get('view')==='queue'?'queue':'overview';
 try{const res=await fetch(`${process.env.INTERNAL_API_URL||'http://127.0.0.1:8100'}/v1/admin/${endpoint}`,{headers:{'x-admin-token':token},cache:'no-store',signal:AbortSignal.timeout(8000)});return NextResponse.json(await res.json(),{status:res.status,headers:{'Cache-Control':'no-store'}});}
 catch{return NextResponse.json({detail:'데이터 서버에 연결하지 못했습니다.'},{status:503});}
}
export async function POST(request:NextRequest){
 const token=request.headers.get('x-admin-token');if(!token)return NextResponse.json({detail:'관리자 인증이 필요합니다.'},{status:401});
 const origin=request.headers.get('origin');if(origin&&origin!==request.nextUrl.origin)return NextResponse.json({detail:'요청 출처가 일치하지 않습니다.'},{status:403});
 try{const body=await request.json();const endpoint=body.action==='sync'?'sync':'review';const res=await fetch(`${process.env.INTERNAL_API_URL||'http://127.0.0.1:8100'}/v1/admin/${endpoint}`,{method:'POST',headers:{'x-admin-token':token,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(30000)});return NextResponse.json(await res.json(),{status:res.status,headers:{'Cache-Control':'no-store'}});}
 catch{return NextResponse.json({detail:'저장에 실패했습니다. 현황을 다시 확인하세요.'},{status:503});}
}
