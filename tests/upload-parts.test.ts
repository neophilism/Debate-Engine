import test from "node:test";
import assert from "node:assert/strict";
import {MEDIA_PART_BYTES,MAX_MEDIA_BYTES,partCount,expectedPartSize,completionParts} from "../packages/domain/upload-parts.ts";
test("multipart boundaries include short final part and one-part recordings",()=>{
 assert.equal(partCount(64),1);
 assert.equal(partCount(MEDIA_PART_BYTES),1);
 assert.equal(partCount(MEDIA_PART_BYTES+1),2);
 assert.equal(partCount(MAX_MEDIA_BYTES),8);
 assert.equal(expectedPartSize(MEDIA_PART_BYTES+1,1),MEDIA_PART_BYTES);
 assert.equal(expectedPartSize(MEDIA_PART_BYTES+1,2),1);
 assert.equal(expectedPartSize(MAX_MEDIA_BYTES,8),4*1024*1024);
});
test("client cannot finalize gaps, overwritten sizes, forged ETags, duplicate or out-of-range parts",()=>{
 const etag='"abcdef0123456789"';
 const one=[{PartNumber:1,Size:MEDIA_PART_BYTES,ETag:etag},{PartNumber:2,Size:8,ETag:etag}];
 assert.deepEqual(completionParts(MEDIA_PART_BYTES+8,[one[1],one[0]]),[{PartNumber:1,ETag:etag},{PartNumber:2,ETag:etag}]);
 for(const parts of [
  [one[0]],[one[0],one[0]],[one[0],{...one[1],Size:7}],
  [one[0],{...one[1],ETag:"BAD!"}],[one[0],{...one[1],PartNumber:3}]
 ])assert.throws(()=>completionParts(MEDIA_PART_BYTES+8,parts));
 for(const size of [0,63,MAX_MEDIA_BYTES+1,NaN,1.5])assert.throws(()=>partCount(size));
 assert.throws(()=>expectedPartSize(MEDIA_PART_BYTES+1,0));
 assert.throws(()=>expectedPartSize(MEDIA_PART_BYTES+1,3));
});
