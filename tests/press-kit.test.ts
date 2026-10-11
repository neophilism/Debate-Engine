import test from "node:test";
import assert from "node:assert/strict";
import {zipSync,strToU8,unzipSync,strFromU8} from "fflate";
test("archive manifest and press text are byte-identical reproducible ZIP entries",()=>{
 const sample={kind:"mutually_agreed_policy_press_kit",debate:{id:"123",title:"Policy"},agreement:{body:"Common ground",sha256:"a".repeat(64)}};
 const text="Original public records are linked, not rewritten.";
 const bytes=zipSync({"manifest.json":strToU8(JSON.stringify(sample)),"PUBLIC-RECORD-AND-POLICY.txt":strToU8(text)});
 const extract=unzipSync(bytes);
 assert.deepEqual(JSON.parse(strFromU8(extract["manifest.json"])),sample);
 assert.equal(strFromU8(extract["PUBLIC-RECORD-AND-POLICY.txt"]),text);
});
