#!/usr/bin/env node
/**
 * Refreshes machine-readable PR evidence from authoritative GitHub REST data.
 * Never changes the separately approved roadmap milestones or acceptance state.
 * Uses only authenticated requests to the repository specified in the roadmap.
 */
import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
export function extractUnitIds(title,validIds){
 const match=title.match(/\bPDE-(?:0[1-9]|[1-3]\d|4[0-4])\b/gi)||[];
 return [...new Set(match.map(x=>x.toUpperCase()))].filter(x=>validIds.has(x));
}
export function mergeRegistry(old,roadmap,prs,observedAt){
 if(!roadmap.planVerified||roadmap.milestones.length!==roadmap.plannedPrCount)
  throw Error("Unverified roadmap or changed plan denominator: refuse to overwrite registry.");
 if(old.repository!==roadmap.repository||!old.planVerified)
  throw Error("Roadmap repository or plan verification mismatch.");
 const valid=new Set(roadmap.milestones.map(u=>u.id));
 const units=roadmap.milestones.map(m=>{
  const original=old.units.find(u=>u.id===m.id);
  const historical=original?.prs||[];
  const observed=prs.filter(p=>extractUnitIds(p.title,valid).includes(m.id)).map(p=>p.number);
  return {id:m.id,title:m.title,origin:original?.origin||(m.id>="PDE-31"?"addition":"original"),
   prs:[...new Set([...historical,...observed])].sort((a,b)=>a-b)};
 });
 const pullRequests=prs.map(p=>({
  id:p.id,number:p.number,title:p.title,url:p.html_url,state:p.state,draft:p.draft,
  createdAt:p.created_at,updatedAt:p.updated_at,closedAt:p.closed_at,mergedAt:p.merged_at,
  headSha:p.head.sha,baseRef:p.base.ref,mergeCommitSha:p.merge_commit_sha
 })).sort((a,b)=>b.number-a.number);
 const next={schemaVersion:old.schemaVersion,repository:roadmap.repository,roadmapVersion:roadmap.version,
  planVerified:roadmap.planVerified,plannedPrCount:roadmap.plannedPrCount,
  observedAt,units,pullRequests};
 const oldComparable={...old,observedAt:null},newComparable={...next,observedAt:null};
 // Only move observedAt when the authoritative PR data or roadmap mapping changes.
 if(JSON.stringify(oldComparable)===JSON.stringify(newComparable))return {changed:false,registry:old};
 return {changed:true,registry:next};
}
export async function listGithubPullRequests({repo,token,fetchImpl=fetch}){
 if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))
  throw Error("Invalid repo name.");
 const results=[];
 for(let page=1;page<=100;page++){
  const url="https://api.github.com/repos/"+repo+"/pulls?state=all&per_page=100&page="+page;
  const response=await fetchImpl(url,{headers:{
   Accept:"application/vnd.github+json",Authorization:"Bearer "+token,
   "X-GitHub-Api-Version":"2022-11-28","User-Agent":"public-debate-engine-pr-sync"
  }});
  if(!response.ok)throw Error("GitHub API failed on page "+page+": HTTP "+response.status);
  const rows=await response.json();
  if(!Array.isArray(rows))throw Error("Unexpected GitHub pull request response.");
  results.push(...rows);
  if(rows.length<100)return results;
 }
 throw Error("PR registry exceeds the protected 10,000 PR pagination limit.");
}
async function main(){
 const token=process.env.GITHUB_TOKEN;
 if(!token)throw Error("Authenticated GITHUB_TOKEN is required.");
 const root=resolve(process.cwd(),"registry");
 const roadmap=JSON.parse(await readFile(resolve(root,"roadmap.json"),"utf8"));
 const prior=JSON.parse(await readFile(resolve(root,"prs.json"),"utf8"));
 const repo=process.env.GITHUB_REPOSITORY;
 if(repo!==roadmap.repository)throw Error("Refusing to sync a mismatched GitHub repository.");
 const prs=await listGithubPullRequests({repo,token});
 const result=mergeRegistry(prior,roadmap,prs,new Date().toISOString());
 if(result.changed){await writeFile(resolve(root,"prs.json"),JSON.stringify(result.registry,null,2)+"\n");}
 console.log(result.changed?"Updated machine-readable PR registry from GitHub.":"PR registry already current.");
 console.log(JSON.stringify({repo,observedPullRequests:prs.length,plannedUnits:roadmap.plannedPrCount,changed:result.changed}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 main().catch(e=>{console.error(e instanceof Error?e.message:"Unexpected registry sync error.");process.exitCode=1});
}
