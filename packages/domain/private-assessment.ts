import {createHash} from "node:crypto";
export type Confidence="low"|"medium"|"high";
export type DebateFinding={
 id:string;category:string;excerpt:string;explanation:string;suggestion:string;confidence:Confidence;
};
export type DebateAssistantReport={
 stage:"preliminary"|"final";overview:string;strengths:string[];findings:DebateFinding[];
 limitations:string;
};
export function draftFingerprint(payload:unknown,transcript:string|null){
 return createHash("sha256").update(JSON.stringify({payload,transcript:transcript||null})).digest("hex");
}
export function validateDebateAssistantReport(value:unknown,stage:"preliminary"|"final"):DebateAssistantReport{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Invalid assistant response.");
 const v=value as Record<string,unknown>;
 if(typeof v.overview!=="string"||v.overview.length>5000||
    typeof v.limitations!=="string"||v.limitations.length>5000||
    !Array.isArray(v.strengths)||v.strengths.length>12||
    v.strengths.some(x=>typeof x!=="string"||x.length>500)||
    !Array.isArray(v.findings)||v.findings.length>30)
  throw Error("Assistant response does not satisfy the private editorial report schema.");
 const findings:DebateFinding[]=v.findings.map((raw,i)=>{
  if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("Invalid assistant finding.");
  const f=raw as Record<string,unknown>;
  if(typeof f.category!=="string"||f.category.length>120||
     typeof f.excerpt!=="string"||f.excerpt.length>1000||
     typeof f.explanation!=="string"||f.explanation.length>2000||
     typeof f.suggestion!=="string"||f.suggestion.length>2000||
     !["low","medium","high"].includes(String(f.confidence)))
    throw Error("Invalid assistant finding fields.");
  return {id:"finding-"+(i+1),category:f.category,excerpt:f.excerpt,explanation:f.explanation,suggestion:f.suggestion,confidence:f.confidence as Confidence};
 });
 return {stage,overview:v.overview,strengths:v.strengths as string[],findings,limitations:v.limitations};
}
export const DEBATE_ASSISTANT_INSTRUCTIONS=`You are an OPTIONAL PRIVATE debate-writing adviser, never a judge of a person's value or of the public debate's winner.
Analyze claims with epistemic humility, context sensitivity and neutrality. Flag possible ad hominem, hasty generalization, straw man, cherry-picking, false dilemma, unsupported causation, missing evidence, ambiguity, uncertainty calibration and genuinely unanswered questions when warranted. Do not assume dissent is bias. For each concern supply an exact short quoted excerpt from input (not an invented quotation), a provisional explanation, and a constructive optional suggestion. Also note strengths and limitations of the analysis. Prefer fewer high-quality grounded findings over speculative claims. No rankings or public scores. The candidate may reject every suggestion. Output JSON only: overview:string,strengths:string[],findings:{category:string,excerpt:string,explanation:string,suggestion:string,confidence:"low"|"medium"|"high"}[],limitations:string. Do not include personal details outside the supplied speech. This report must never affect whether a submission qualifies for a public debate sequence.`;
