import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,uuid,jsonError,HttpError} from "../../../../../../lib/server/http";
import {parsePrivateJson} from "../../../../../../lib/server/private-json";
import {setPrivateReviewConsent} from "../../../../../../lib/server/private-consent";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  requireSameOrigin(request);const user=await requireIdentity(true);
  const body=await parsePrivateJson(request);
  if(typeof body.providerConsent!=="boolean"||typeof body.improvementConsent!=="boolean")
   throw new HttpError(400,"Provide explicit booleans for both independent consents.");
  const result=await setPrivateReviewConsent({draftId:uuid((await params).id,"draft id"),authSubject:user.id,
   providerConsent:body.providerConsent,improvementConsent:body.improvementConsent});
  return NextResponse.json(result,{headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e);}
}
