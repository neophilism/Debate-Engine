import {NextResponse} from "next/server";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(){return NextResponse.json({error:"Direct publication is disabled. Use a private candidate-reviewed draft and explicit confirmation."},{status:409})}
