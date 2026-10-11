import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,parseJson,record,field,uuid,jsonError,HttpError} from "../../../../../lib/server/http";
import {listCampaignMembers,grantCampaignAccess,delegatedRoles} from "../../../../../lib/server/delegation";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{const user=await requireIdentity(true);return NextResponse.json({memberships:await listCampaignMembers(uuid((await params).id,"candidacy id"),user.id)},{headers:{"Cache-Control":"private,no-store"}});}
 catch(e){return jsonError(e);}
}
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  requireSameOrigin(request);const user=await requireIdentity(true),b=record(await parseJson(request));
  const role=field(b.role,"role",20);
  if(!delegatedRoles.some(r=>r===role))throw new HttpError(400,"Only editor and publisher delegation roles are supported.");
  const result=await grantCampaignAccess(uuid((await params).id,"candidacy id"),user.id,field(b.accountSubject,"accountSubject",240),role as "editor"|"publisher");
  return NextResponse.json(result,{status:201});
 }catch(e){return jsonError(e);}
}
