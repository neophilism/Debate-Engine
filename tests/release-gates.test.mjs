import test from "node:test";
import assert from "node:assert/strict";
import {evaluateRelease,REQUIRED_GATES} from "../packages/domain/release-gates.mjs";
const roadmap={planVerified:true,plannedPrCount:2,milestones:[{},{}],operationalAcceptance:Object.fromEntries(REQUIRED_GATES.map(id=>[id,"pending"]))};
const gates=REQUIRED_GATES.map(id=>({id,status:"pending",reviewer:null,evidenceUrl:null,reviewedAt:null}));
test("merging every PR cannot independently grant production acceptance",()=>{
 const r=evaluateRelease({roadmap,evidence:{schemaVersion:1,gates}});
 assert.equal(r.ready,false);assert.equal(r.planUnits,2);assert.ok(r.unaccepted.length>=7);
});
test("evidence and roadmap must both be accepted",()=>{
 const accepted=REQUIRED_GATES.map(id=>({id,status:"accepted",reviewer:"Security reviewer",reviewedAt:"2026-10-12T12:00:00Z",evidenceUrl:"https://github.com/neophilism/Debate-Engine/issues/1"}));
 assert.equal(evaluateRelease({roadmap,evidence:{schemaVersion:1,gates:accepted}}).ready,false);
 assert.equal(evaluateRelease({roadmap:{...roadmap,operationalAcceptance:Object.fromEntries(REQUIRED_GATES.map(id=>[id,"accepted"]))},evidence:{schemaVersion:1,gates:accepted}}).ready,true);
});
test("missing, duplicated, malformed or unreviewed evidence fails closed",()=>{
 assert.equal(evaluateRelease({roadmap,evidence:{schemaVersion:1,gates:[]}}).ready,false);
 assert.throws(()=>evaluateRelease({roadmap,evidence:{schemaVersion:1,gates:[gates[0],gates[0]]}}));
 assert.throws(()=>evaluateRelease({roadmap:{...roadmap,plannedPrCount:3},evidence:{schemaVersion:1,gates}}));
});

test("AI security reviewer can satisfy the review gate without external auditor signoff",()=>{
 const accepted=REQUIRED_GATES.map(id=>({id,status:"accepted",reviewer:id==="securityReview"?"AI-assisted source security reviewer":"Operational reviewer",reviewedAt:"2026-10-12T12:00:00Z",evidenceUrl:"https://github.com/neophilism/Debate-Engine/issues/1"}));
 const completePlan={...roadmap,operationalAcceptance:Object.fromEntries(REQUIRED_GATES.map(id=>[id,"accepted"]))};
 assert.equal(evaluateRelease({roadmap:completePlan,evidence:{schemaVersion:1,gates:accepted}}).ready,true);
 accepted.find(item=>item.id==="securityReview").evidenceUrl=null;
 const blocked=evaluateRelease({roadmap:completePlan,evidence:{schemaVersion:1,gates:accepted}});
 assert.equal(blocked.ready,false);
 assert.match(blocked.unaccepted.find(item=>item.gate==="securityReview").reason,/independent human audit is not required/i);
});
