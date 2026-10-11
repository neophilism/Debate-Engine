import {NextResponse} from "next/server";
import {listPublicDebates} from "../../../lib/server/public-debates";
import {jsonError} from "../../../lib/server/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){try{return NextResponse.json({debates:await listPublicDebates()},{headers:{"Cache-Control":"public,max-age=60"}})}catch(e){return jsonError(e)}}
export async function POST(){return NextResponse.json({error:"Direct publication is disabled. Use a private candidate-reviewed draft and explicit confirmation."},{status:409})}
