/** Pure release gate evaluator: source merges cannot imply operational acceptance. */
export const REQUIRED_GATES=["candidateIdentity","browserPilot","workerDeployment","externalDistribution","independentBackupRestore","securityReview","productionRelease"];
export function evaluateRelease({roadmap,evidence}){
 if(!roadmap||roadmap.planVerified!==true||!Number.isInteger(roadmap.plannedPrCount)||roadmap.milestones?.length!==roadmap.plannedPrCount)throw Error("Approved development plan is missing or inconsistent.");
 if(!evidence||evidence.schemaVersion!==1||!Array.isArray(evidence.gates))throw Error("Versioned acceptance evidence is required.");
 const reasons=[];
 const seen=new Set();
 for(const gate of evidence.gates){
  if(!REQUIRED_GATES.includes(gate.id)||seen.has(gate.id))throw Error("Unexpected or duplicated acceptance gate "+gate.id);
  seen.add(gate.id);
  const approved=gate.status==="accepted" && typeof gate.evidenceUrl==="string" && /^https:\/\/[\w.-]+\//.test(gate.evidenceUrl) && typeof gate.reviewer==="string" && gate.reviewer.trim().length>=3 && typeof gate.reviewedAt==="string" && !Number.isNaN(Date.parse(gate.reviewedAt));
  if(!approved)reasons.push({gate:gate.id,status:gate.status||"missing",reason:"Requires accepted status, independent reviewer and linked dated evidence"});
 }
 for(const id of REQUIRED_GATES)if(!seen.has(id))reasons.push({gate:id,status:"missing",reason:"No acceptance entry"});
 const roadmapFailures=Object.entries(roadmap.operationalAcceptance||{}).filter(([id,value])=>REQUIRED_GATES.includes(id)&&value!=="accepted").map(([gate,status])=>({gate,status,reason:"Canonical roadmap has not recorded approval"}));
 return {ready:reasons.length===0&&roadmapFailures.length===0,requiredGates:REQUIRED_GATES.length,unaccepted:[...reasons,...roadmapFailures],planUnits:roadmap.plannedPrCount};
}
