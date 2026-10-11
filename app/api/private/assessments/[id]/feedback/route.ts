import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,uuid,jsonError,field,HttpError} from "../../../../../lib/server/http";
import {parsePrivateJson} from "../../../../../lib/server/private-json";
import {submitPrivateFeedback} from "../../../../../lib/server/private-assessment-service";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  requireSameOrigin(request);const user=await requireIdentity(true),body=await parsePrivateJson(request);
  if(!["accept","reject","uncertain"].includes(String(body.choice)))throw new HttpError(400,"Invalid suggestion feedback.");
  const result=await submitPrivateFeedback({assessmentId:uuid((await params).id,"assessment id"),authSubject:user.id,
   findingId:field(body.findingId,"finding id",120),choice:body.choice as "accept"|"reject"|"uncertain",
   note:body.note==null?null:field(body.note,"note",2000)});
  return NextResponse.json(result,{status:201,headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e);}
}
