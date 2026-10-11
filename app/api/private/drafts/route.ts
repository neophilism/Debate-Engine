import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,uuid,jsonError,HttpError} from "../../../../lib/server/http";
import {parsePrivateJson} from "../../../../lib/server/private-json";
import {createPrivateDraft,listPrivateDrafts} from "../../../../lib/server/private-drafts";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
 try{const user=await requireIdentity(true);
  return NextResponse.json({drafts:await listPrivateDrafts(user.id)},{headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e);}
}
export async function POST(request:NextRequest){
 try{
  requireSameOrigin(request);const user=await requireIdentity(true);const b=await parsePrivateJson(request);
  if(b.kind!=="opening"&&b.kind!=="response")throw new HttpError(400,"Draft kind must be opening or response.");
  if(!b.payload||typeof b.payload!=="object"||Array.isArray(b.payload))throw new HttpError(400,"Draft payload must be an object.");
  const transcript=b.transcriptText===null||b.transcriptText===undefined?null:typeof b.transcriptText==="string"?b.transcriptText:null;
  const result=await createPrivateDraft({kind:b.kind,candidateId:uuid(b.candidacyId,"candidacyId"),authSubject:user.id,
   debateId:b.kind==="response"?uuid(b.debateId,"debateId"):null,
   parentId:b.kind==="response"?uuid(b.parentSubmissionId,"parentSubmissionId"):null,
   payload:b.payload as Record<string,unknown>,transcript,
   providerConsent:b.providerConsent===true,improvementConsent:b.improvementConsent===true});
  return NextResponse.json(result,{status:201,headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e);}
}
