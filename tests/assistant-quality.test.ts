import test from "node:test";
import assert from "node:assert/strict";
import {groundPrivateReport,internalFeedbackSummary} from "../packages/domain/assistant-quality.ts";
import type {DebateAssistantReport} from "../packages/domain/private-assessment.ts";
const sample:DebateAssistantReport={stage:"preliminary",overview:"Consider source support.",strengths:[],limitations:"Probabilistic review.",findings:[
 {id:"finding-1",category:"ad_hominem",excerpt:"You are ignorant",explanation:"Targets a person.",suggestion:"Address the claim.",confidence:"medium"},
 {id:"finding-2",category:"straw_man",excerpt:"A fabricated line",explanation:"Invented excerpt.",suggestion:"Remove claim.",confidence:"low"}
]};
test("assistant cannot show invented quotations as if spoken",()=>{
 const v=groundPrivateReport(sample,"My opening: You are ignorant. Here is my argument.");
 assert.deepEqual(v.findings.map(x=>x.id),["finding-1"]);
 assert.match(v.limitations,/omitted/i);
});
test("whitespace variations do not incorrectly invalidate real quotations",()=>{
 const v=groundPrivateReport({...sample,findings:[sample.findings[0]]},"You\nare   ignorant.");
 assert.equal(v.findings.length,1);
});
test("private improvement metrics refuse small groups",()=>{
 assert.equal(internalFeedbackSummary(["accept","reject"]),null);
 assert.deepEqual(internalFeedbackSummary(["accept","accept","reject","uncertain","reject"]),{count:5,accepted:2,rejected:2,uncertain:1});
});
