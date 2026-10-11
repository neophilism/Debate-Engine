import {NextResponse} from "next/server";
import {requireAdmin,uuid,jsonError} from "../../../../../../lib/server/http";
import {database} from "../../../../../../lib/server/db";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  await requireAdmin();const id=uuid((await params).id,"candidate id");
  const q=await database().query("SELECT event_type,public_reason,private_explanation,occurred_at FROM candidacy_verification_events WHERE candidacy_id=$1 ORDER BY occurred_at,id",[id]);
  return NextResponse.json({events:q.rows},{headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e);}
}
