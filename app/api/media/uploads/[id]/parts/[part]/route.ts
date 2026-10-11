import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,uuid,jsonError,HttpError} from "../../../../../../../lib/server/http";
import {putMediaPart} from "../../../../../../../lib/server/resumable-uploads";
import {MEDIA_PART_BYTES} from "../../../../../../../packages/domain/upload-parts";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function PUT(request:NextRequest,{params}:{params:Promise<{id:string;part:string}>}){
 try{
  requireSameOrigin(request);const user=await requireIdentity(true);
  const {id,part}=await params;
  if(!/^[1-9][0-9]?$/.test(part))throw new HttpError(400,"Invalid upload part number.");
  if(request.headers.get("content-type")!=="application/octet-stream")
   throw new HttpError(415,"Upload parts must be raw binary.");
  const contentLength=Number(request.headers.get("content-length"));
  if(!Number.isSafeInteger(contentLength)||contentLength<1||contentLength>MEDIA_PART_BYTES)
   throw new HttpError(413,"Upload part exceeds the bounded chunk limit.");
  const bytes=Buffer.from(await request.arrayBuffer());
  if(bytes.length!==contentLength||bytes.length>MEDIA_PART_BYTES)
   throw new HttpError(400,"Upload part length did not match Content-Length.");
  const result=await putMediaPart(uuid(id,"session ID"),user.id,Number(part),bytes);
  return NextResponse.json(result,{headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e)}
}
