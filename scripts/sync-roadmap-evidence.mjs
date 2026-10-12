#!/usr/bin/env node
/** GitHub PR evidence -> roadmap implementation metadata, without changing acceptance. */
import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
export function reconcileRoadmap(roadmap,registry){
 if(!roadmap?.planVerified||!registry?.planVerified||
  roadmap.repository!==registry.repository||
  roadmap.plannedPrCount!==registry.plannedPrCount||
  roadmap.milestones?.length!==roadmap.plannedPrCount||
  registry.units?.length!==roadmap.plannedPrCount)
  throw Error("Roadmap and PR evidence must be verified and share the same fixed plan.");
 const prs=new Map(registry.pullRequests.map(p=>[p.number,p]));
 const units=new Map(registry.units.map(u=>[u.id,u]));
 let changes=0;
 const milestones=roadmap.milestones.map(m=>{
  const nums=units.get(m.id)?.prs||[];
  const links=[...(m.pullRequests||[])];
  const active=[];
  const merged=[];
  for(const num of nums){
   const pr=prs.get(num);
   if(!pr)continue;
   if(pr.mergedAt){merged.push(pr);if(!links.includes(pr.url))links.push(pr.url)}
   if(pr.state==="open"){active.push(pr.url);if(!links.includes(pr.url))links.push(pr.url)}
  }
  const next={...m,pullRequests:links,openPullRequests:active};
  // A merged implementation PR provides source evidence of partial progress,
  // NEVER proof that all requirements or release acceptance are complete.
  if(merged.length&&next.implementation==="not_started")next.implementation="partial";
  if(merged.length&&["approved_not_started","pending","implementation_open"].includes(next.state))
   next.state="implementation_partially_merged_operational_acceptance_pending";
  else if(active.length&&!merged.length&&["approved_not_started","pending"].includes(next.state))
   next.state="implementation_open";
  // Always preserve independent acceptance and acceptanceNote verbatim.
  if(next.acceptance!==m.acceptance||next.acceptanceNote!==m.acceptanceNote)throw Error("Acceptance fields changed unexpectedly.");
  if(JSON.stringify(next)!==JSON.stringify(m))changes++;
  return next;
 });
 return {changed:changes>0,modifiedMilestones:changes,roadmap:{...roadmap,milestones}};
}
async function main(){
 const root=resolve(process.cwd(),"registry");
 const original=JSON.parse(await readFile(resolve(root,"roadmap.json"),"utf8"));
 const registry=JSON.parse(await readFile(resolve(root,"prs.json"),"utf8"));
 const outcome=reconcileRoadmap(original,registry);
 if(outcome.changed)await writeFile(resolve(root,"roadmap.json"),JSON.stringify(outcome.roadmap,null,2)+"\n");
 console.log(JSON.stringify({changed:outcome.changed,modifiedMilestones:outcome.modifiedMilestones,
  accepted:outcome.roadmap.milestones.filter(m=>m.acceptance==="accepted").length,
  planned:outcome.roadmap.plannedPrCount}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 main().catch(e=>{console.error(e.message);process.exitCode=1});
}
