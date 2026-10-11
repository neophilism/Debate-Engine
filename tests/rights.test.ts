import test from "node:test";
import assert from "node:assert/strict";
import {exactManifestHash,validateManifest} from "../packages/domain/rights.ts";
const m={branchId:"branch",clips:[{mediaAssetId:"source",startSeconds:12,endSeconds:21}],captions:["A direct answer"],outputKind:"master" as const,releaseTitle:"Common ground"};
test("the manifest hash is stable and uniquely identifies exact edits",()=>{
 assert.equal(exactManifestHash(m),exactManifestHash({...m}));
 assert.notEqual(exactManifestHash(m),exactManifestHash({...m,captions:["A misleading cut"]}));
 assert.notEqual(exactManifestHash(m),exactManifestHash({...m,clips:[{mediaAssetId:"source",startSeconds:13,endSeconds:21}]}));
});
test("clips must have valid source time boundaries",()=>{
 assert.deepEqual(validateManifest(m),[]);
 assert.ok(validateManifest({...m,clips:[{mediaAssetId:"source",startSeconds:21,endSeconds:12}]}).length>0);
});
