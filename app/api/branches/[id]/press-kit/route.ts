import {NextRequest,NextResponse} from "next/server";
import {strToU8,zipSync} from "fflate";
import {uuid,jsonError} from "../../../../../lib/server/http";
import {pressKitForBranch,pressKitText} from "../../../../../lib/server/press-kit";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const id=uuid((await params).id,"branch id");
  const archive=await pressKitForBranch(id);
  const format=request.nextUrl.searchParams.get("format")||"json";
  if(format==="json")return NextResponse.json(archive,{headers:{"Cache-Control":"public,max-age=60"}});
  if(format!=="zip")return NextResponse.json({error:"Format must be json or zip."},{status:400});
  const origin=process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || request.nextUrl.origin;
  const zipped=zipSync({
   "manifest.json":strToU8(JSON.stringify(archive,null,2)+"\n"),
   "PUBLIC-RECORD-AND-POLICY.txt":strToU8(pressKitText(archive,origin))
  },{level:6});
  const bytes=new ArrayBuffer(zipped.byteLength);
  new Uint8Array(bytes).set(zipped);
  return new NextResponse(bytes,{headers:{
   "content-type":"application/zip",
   "content-disposition":'attachment; filename="public-debate-press-kit.zip"',
   "cache-control":"no-store",
   "x-content-type-options":"nosniff"
  }});
 }catch(error){return jsonError(error);}
}
