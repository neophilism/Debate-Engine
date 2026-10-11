import test from "node:test";
import assert from "node:assert/strict";
import {auditPageQuery} from "../packages/domain/archive-audit-query.mjs";
const time=new Date("2026-10-11T22:51:00.000Z");
test("full archive audit pages include all public media, documents and released derivatives",()=>{
 const page=auditPageQuery({asOf:time,cursor:null,limit:101});
 assert.match(page.text,/FROM media_assets/);
 assert.match(page.text,/FROM submission_documents/);
 assert.match(page.text,/FROM derivative_artifacts/);
 assert.match(page.text,/published_at IS NOT NULL/);
 assert.match(page.text,/ORDER BY audit_sort_time DESC,kind DESC,id DESC/);
 assert.deepEqual(page.values,[time,null,null,null,101]);
 const cursor={time:new Date("2025-04-05T00:00:00Z"),kind:"media",id:"123"};
 const next=auditPageQuery({asOf:time,cursor,limit:75});
 assert.deepEqual(next.values,[time,cursor.time,"media","123",75]);
});
test("audit refuses invalid dates, sort cursors and unbounded batch size",()=>{
 assert.throws(()=>auditPageQuery({asOf:new Date("bad"),limit:100}));
 assert.throws(()=>auditPageQuery({asOf:time,limit:1000}));
 assert.throws(()=>auditPageQuery({asOf:time,cursor:{time:new Date("bad"),kind:"media",id:"id"},limit:10}));
});
