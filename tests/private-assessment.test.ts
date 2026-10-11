import test from "node:test";
import assert from "node:assert/strict";
import {draftFingerprint,validateDebateAssistantReport,DEBATE_ASSISTANT_INSTRUCTIONS} from "../packages/domain/private-assessment.ts";
test("draft fingerprint changes with transcript and writing",()=>{
 const a=draftFingerprint({modality:"writing",text:"A claim"},"One");
 const b=draftFingerprint({modality:"writing",text:"Different claim"},"One");
 const c=draftFingerprint({modality:"writing",text:"A claim"},"Two");
 assert.notEqual(a,b);assert.notEqual(a,c);
});
test("findings are optional and attributed to preliminary or final analysis",()=>{
 const r=validateDebateAssistantReport({overview:"No definite errors found.",strengths:["Question addressed"],findings:[],limitations:"Model may have missed context."},"preliminary");
 assert.equal(r.stage,"preliminary");assert.deepEqual(r.findings,[]);
});
test("malformed reports and unsupported certainty are rejected, not fabricated",()=>{
 assert.throws(()=>validateDebateAssistantReport({overview:"ok",strengths:[],findings:[{category:"x",excerpt:"y",explanation:"z",suggestion:"w",confidence:"absolute"}],limitations:"none"},"final"));
});
test("instructions ban scoring and automatic editorial control",()=>{
 assert.match(DEBATE_ASSISTANT_INSTRUCTIONS,/No rankings or public scores/);
 assert.match(DEBATE_ASSISTANT_INSTRUCTIONS,/may reject every suggestion/);
 assert.match(DEBATE_ASSISTANT_INSTRUCTIONS,/must never affect/);
});
