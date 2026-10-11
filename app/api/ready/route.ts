import {NextResponse} from "next/server";
import {database} from "../../../lib/server/db";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
 try{
  if(!process.env.NEON_AUTH_BASE_URL||!process.env.NEON_AUTH_COOKIE_SECRET||!process.env.MEDIA_BUCKET||!process.env.AWS_ENDPOINT_URL_S3)
    return NextResponse.json({status:"not_ready",reason:"Auth or media storage configuration missing"},{status:503});
  const result=await database().query("SELECT to_regclass('public.debates') AS debate_table, to_regclass('public.media_assets') AS media_table");
  if(!result.rows[0]?.debate_table||!result.rows[0]?.media_table)throw Error("Schema unavailable");
  return NextResponse.json({status:"ready",database:"connected",archive:"configured"},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({status:"not_ready",reason:"Required database schema unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});}
}
