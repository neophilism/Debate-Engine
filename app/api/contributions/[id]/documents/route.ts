import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,uuid,field,jsonError,HttpError} from "../../../../../lib/server/http";
import {uploadSource} from "../../../../../lib/server/documents";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{requireSameOrigin(request);const user=await requireIdentity(true);
  if(Number(request.headers.get("content-length"))>22*1024*1024)throw new HttpError(413,"Document exceeds 20 MiB.");
  const id=uuid((await params).id,"submission ID"),f=await request.formData(),file=f.get("document");
  if(!(file instanceof File)||file.size>20*1024*1024)throw new HttpError(413,"PDF, DOCX or plain-text document up to 20 MiB required.");
  const candidacyId=uuid(f.get("candidacyId"),"candidacyId"),label=field(f.get("label"),"label",240);
  const name=field(file.name.replace(/[\\\/\r\n]/g,"_"),"filename",240);
  const result=await uploadSource({submissionId:id,authSubject:user.id,candidacyId,name,label,bytes:Buffer.from(await file.arrayBuffer()),mime:file.type});
  return NextResponse.json(result,{status:201});
 }catch(e){return jsonError(e);}
}
