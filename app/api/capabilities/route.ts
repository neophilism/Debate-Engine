import {NextResponse} from "next/server";
import {probeClamd} from "../../../packages/media/clamav";
export const dynamic="force-dynamic";
export const runtime="nodejs";
/**
 * Public, secret-free operational capability disclosure.
 * A scanner PONG is a preflight check, never independent security acceptance.
 */
export async function GET(){
 const storageConfigured=Boolean(
  process.env.AWS_ENDPOINT_URL_S3?.startsWith("https://")&&
  process.env.MEDIA_BUCKET&&process.env.AWS_ACCESS_KEY_ID&&process.env.AWS_SECRET_ACCESS_KEY
 );
 const scannerOnline=await probeClamd(process.env.CLAMD_SOCKET_PATH||"");
 return NextResponse.json({
  mediaScanner:scannerOnline?"online":"unavailable",
  mediaStorageConfigured:storageConfigured,
  newMediaUploadPreflight:scannerOnline&&storageConfigured?"available_for_validation":"blocked",
  productionMediaAcceptance:"pending",
  note:"Preflight readiness does not certify official malware signatures, end-to-end uploads or release acceptance."
 },{headers:{"Cache-Control":"no-store"}});
}
