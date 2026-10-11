import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,record,parseJson,field,uuid,jsonError,HttpError} from "../../../../../lib/server/http";
import {grantEditPermission} from "../../../../../lib/server/derivative-rights";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  requireSameOrigin(request);const user=await requireIdentity(true);
  const mediaId=uuid((await params).id,"media ID");const b=record(await parseJson(request)),scope=record(b.scope);
  const start=Number(scope.clipStart),end=Number(scope.clipEnd);
  if(!Number.isFinite(start)||!Number.isFinite(end))throw new HttpError(400,"Valid time range required.");
  const result=await grantEditPermission({mediaId,candidateId:uuid(b.candidacyId,"candidate ID"),authSubject:user.id,scope:{artifactId:uuid(scope.artifactId,"artifact ID"),clipStart:start,clipEnd:end}});
  return NextResponse.json(result,{status:201});
 }catch(e){return jsonError(e);}
}
