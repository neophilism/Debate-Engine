import test from "node:test";
import assert from "node:assert/strict";
import {scanWithClamd,ScanFailure} from "../packages/media/clamav.ts";
const socket=process.env.PDE_CLAMD_SOCKET;
if(!socket||!socket.startsWith("/"))throw Error("Live ClamAV CI socket is mandatory.");
const safe=Buffer.from("Entirely fictional harmless interview media fixture; no malware or signature pattern. ".repeat(4));
const threatMarker="PDE-TEST-ONLY-BLOCKED-CONTENT-2026";
const syntheticThreat=Buffer.from("Fictional blocked media fixture ".repeat(3)+threatMarker+" fictional footer ".repeat(3));
test("the ACTUAL ClamAV daemon returns a clean verdict for nonsignature content",{timeout:90000},async()=>{
 const verdict=await scanWithClamd(safe,socket);
 assert.deepEqual(verdict,{scanner:"clamav",verdict:"clean"});
});
test("the ACTUAL ClamAV daemon detects a synthetic custom signature and rejects an upload",{timeout:90000},async()=>{
 await assert.rejects(scanWithClamd(syntheticThreat,socket),
  err=>err instanceof ScanFailure&&err.reason==="detected");
});
test("the upload scanner remains fail-closed if the live service disappears",{timeout:90000},async()=>{
 await assert.rejects(scanWithClamd(safe,socket+".not-present"),
  err=>err instanceof ScanFailure&&err.reason==="unavailable");
});
