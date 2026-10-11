import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,jsonError} from "../../../../lib/server/http";
import {privatePrivacySummary,revokeImprovementConsent} from "../../../../lib/server/private-privacy";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){try{const user=await requireIdentity(true);return NextResponse.json(await privatePrivacySummary(user.id),{headers:{"Cache-Control":"private,no-store","X-Robots-Tag":"noindex,nofollow"}})}catch(e){return jsonError(e)}}
export async function POST(request:NextRequest){try{requireSameOrigin(request);const user=await requireIdentity(true);return NextResponse.json(await revokeImprovementConsent(user.id),{headers:{"Cache-Control":"private,no-store","X-Robots-Tag":"noindex,nofollow"}})}catch(e){return jsonError(e)}}
