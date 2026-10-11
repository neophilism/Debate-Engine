import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,uuid,jsonError,HttpError} from "../../../../../../lib/server/http";
import {parsePrivateJson} from "../../../../../../lib/server/private-json";
import {runPrivateAssessment} from "../../../../../../lib/server/private-assessment-service";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  requireSameOrigin(request);const user=await requireIdentity(true),draftId=uuid((await params).id,"draft id");
  const body=await parsePrivateJson(request);
  if(body.stage!=="preliminary"&&body.stage!=="final")throw new HttpError(400,"Assessment stage required.");
  return NextResponse.json(await runPrivateAssessment({draftId,authSubject:user.id,stage:body.stage}),{headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e);}
}
