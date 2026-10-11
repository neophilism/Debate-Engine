import { NextRequest,NextResponse } from "next/server";
import { requireAdmin,requireSameOrigin,record,parseJson,field,jsonError,HttpError,syncAccount } from "../../../../lib/server/http";
import { transaction } from "../../../../lib/server/db";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function POST(request:NextRequest) {
 try{
   requireSameOrigin(request);const admin=await requireAdmin();
   const body=record(await parseJson(request));
   const title=field(body.title,"title",180),slug=field(body.slug,"slug",120),jurisdiction=field(body.jurisdiction,"jurisdiction",160),label=field(body.label,"label",180);
   const date=field(body.date,"date",10);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))throw new HttpError(400,"Invalid election date.");
   if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new HttpError(400,"Invalid office slug.");
   const aid=await syncAccount(admin);
   const result=await transaction(async(db)=>{
     const office=await db.query<{id:string}>("INSERT INTO offices(slug,title,jurisdiction) VALUES($1,$2,$3) ON CONFLICT(slug) DO UPDATE SET slug=EXCLUDED.slug RETURNING id",[slug,title,jurisdiction]);
     const e=await db.query<{id:string}>("INSERT INTO election_cycles(office_id,election_date,label) VALUES($1,$2,$3) ON CONFLICT(office_id,election_date) DO UPDATE SET label=EXCLUDED.label RETURNING id",[office.rows[0].id,date,label]);
     await db.query("INSERT INTO audit_events(actor_account_id,action,target_kind,target_id) VALUES($1,'election_registered','election_cycle',$2)",[aid,e.rows[0].id]);
     return e.rows[0];
   });
   return NextResponse.json({id:result.id},{status:201});
 }catch(e){return jsonError(e);}
}
