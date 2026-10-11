import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,uuid,jsonError} from "../../../../../../lib/server/http";
import {revokeCampaignAccess} from "../../../../../../lib/server/delegation";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string;membershipId:string}>}){
 try{requireSameOrigin(request);const user=await requireIdentity(true);const p=await params;
 return NextResponse.json(await revokeCampaignAccess(uuid(p.id,"candidacy id"),user.id,uuid(p.membershipId,"membership id")));
 }catch(e){return jsonError(e);}
}
