import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {archiveManifestDigest,verifyByteStream} from "../packages/domain/archive-integrity.mjs";
const bytes=Buffer.from("unaltered original video bytes");
const digest=createHash("sha256").update(bytes).digest("hex");
async function* chunks(data){yield data.subarray(0,4);yield data.subarray(4);}
test("archive verification accepts authentic streamed bytes",async()=>{
 const x=await verifyByteStream(chunks(bytes),{expectedSha256:digest,expectedSize:bytes.length,maxBytes:200});
 assert.equal(x.bytes,bytes.length);
 assert.equal(x.verified,true);
});
test("refuses short, tampered, oversized and invalid source claims",async()=>{
 await assert.rejects(verifyByteStream(chunks(bytes),{expectedSha256:"0".repeat(64),maxBytes:200}),/hash mismatch/);
 await assert.rejects(verifyByteStream(chunks(bytes),{expectedSha256:digest,expectedSize:bytes.length+1,maxBytes:200}),/length mismatch/);
 await assert.rejects(verifyByteStream(chunks(bytes),{expectedSha256:digest,maxBytes:2}),/exceeded/);
 await assert.rejects(verifyByteStream(chunks(bytes),{expectedSha256:"not-a-sha"}),/Invalid expected/);
});
test("integrity manifests sort stable records without changing their contents",()=>{
 const a=[{kind:"video",id:"2",sha256:digest,sizeBytes:bytes.length},{kind:"video",id:"1",sha256:digest,sizeBytes:bytes.length}];
 assert.equal(archiveManifestDigest(a),archiveManifestDigest([...a].reverse()));
 assert.notEqual(archiveManifestDigest(a),archiveManifestDigest([...a,{kind:"document",id:"3",sha256:digest,sizeBytes:17}]));
});
