import test from "node:test";
import assert from "node:assert/strict";
import {summaryLength,summaryDurationErrors} from "../packages/domain/summary.ts";
const sample={branchId:"b",clips:[{mediaAssetId:"media",startSeconds:2,endSeconds:31}],captions:[],releaseTitle:"Summary",outputKind:"thirty_seconds" as const};
test("shorter summary enforces exact time budget",()=>{
 assert.equal(summaryLength(sample),29);
 assert.deepEqual(summaryDurationErrors(sample),[]);
 assert.ok(summaryDurationErrors({...sample,clips:[{mediaAssetId:"media",startSeconds:0,endSeconds:31}]}).length);
});
