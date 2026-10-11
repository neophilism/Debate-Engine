import {NextRequest,NextResponse} from "next/server";
import {requireSameOrigin,requireIdentity,parseJson,record,uuid,jsonError,HttpError} from "../../../../lib/server/http";
import {createMediaSession} from "../../../../lib/server/resumable-uploads";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 try{
  requireSameOrigin(request);const user=await requireIdentity(true);
  const b=record(await parseJson(request));
  const modality=b.modality;
  if(modality!=="audio"&&modality!=="video")throw new HttpError(400,"A video or audio medium is required.");
  const session=await createMediaSession({
   authSubject:user.id,candidacyId:uuid(b.candidacyId,"candidacyId"),modality,
   sizeBytes:Number(b.sizeBytes),claimedMime:typeof b.mimeType==="string"?b.mimeType:"",
   expectedSha256:typeof b.sha256==="string"?b.sha256:""
  });
  return NextResponse.json(session,{status:201,headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e)}
}
