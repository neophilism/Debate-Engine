import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {extractUnitIds,mergeRegistry,listGithubPullRequests} from "../scripts/sync-pr-registry.mjs";
const make=(n,title="PDE-17: Filter public debates")=>({id:n,number:n,title,html_url:"https://github.com/acme/demo/pull/"+n,state:"closed",draft:false,created_at:"2026-01-01T00:00:00Z",updated_at:"2026-01-01T00:01:00Z",closed_at:"2026-01-01T00:01:00Z",merged_at:"2026-01-01T00:01:00Z",head:{sha:"abc"},base:{ref:"main"},merge_commit_sha:"xyz"});
const roadmap={repository:"acme/demo",version:6,planVerified:true,plannedPrCount:2,milestones:[{id:"PDE-17",title:"Public debate discovery"},{id:"PDE-30",title:"Production handoff"}]};
const old={schemaVersion:1,repository:"acme/demo",roadmapVersion:6,planVerified:true,plannedPrCount:2,observedAt:"earlier",units:[{id:"PDE-17",title:"Public debate discovery",origin:"original",prs:[1]},{id:"PDE-30",title:"Production handoff",origin:"original",prs:[]}],pullRequests:[]};
test("maps named PRs without changing 2-unit denominator or faking operational acceptance",()=>{
 const {registry:r,changed}=mergeRegistry(old,roadmap,[make(60),make(61,"PDE-30: improve handoff")],"now");
 assert.equal(changed,true);assert.equal(r.plannedPrCount,2);
 assert.deepEqual(r.units[0].prs,[1,60]);assert.deepEqual(r.units[1].prs,[61]);
 assert.equal(r.pullRequests[0].number,61);
});
test("all merged-status and observed-at fields must actually be derived from GitHub",()=>{
 const a=mergeRegistry(old,roadmap,[make(60)],"now").registry;
 const b=mergeRegistry(a,roadmap,[make(60)],"later");
 assert.equal(b.changed,false);
 assert.equal(b.registry.observedAt,"now");
 assert.deepEqual(extractUnitIds("PDE-17 and PDE-30",new Set(["PDE-17","PDE-30"])),["PDE-17","PDE-30"]);
});
test("unverified or inconsistent roadmap is not silently overwritten",()=>{
 assert.throws(()=>mergeRegistry(old,{...roadmap,plannedPrCount:44},[],"now"));
 assert.throws(()=>mergeRegistry(old,{...roadmap,planVerified:false},[],"now"));
});
test("reads multiple pages, rejects GitHub API failures and never swallows partial data",async()=>{
 const fake=async url=>({ok:true,json:async()=>new URL(url).searchParams.get("page")==="1"?Array.from({length:100},(_,i)=>make(i+1)):[make(101)]});
 const r=await listGithubPullRequests({repo:"acme/demo",token:"test",fetchImpl:fake});
 assert.equal(r.length,101);
 await assert.rejects(listGithubPullRequests({repo:"acme/demo",token:"test",fetchImpl:async()=>({ok:false,status:403})}));
});

test("PDE-32 keeps one product name and one canonical plan while the repository rename is pending",()=>{
 const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
 const readme=read("README.md");
 const handoff=read("docs/CURRENT_STATUS_AND_HANDOFF.md");
 const transition=read("docs/REPOSITORY_NAME_TRANSITION.md");
 assert.match(readme,/^# Public Debate Engine/m);
 assert.match(readme,/Full 44-unit development plan/);
 assert.match(readme,/Canonical 44-unit PR registry/);
 assert.match(handoff,/\*\*Product:\*\* Public Debate Engine/);
 assert.match(handoff,/registry\/prs\.json/);
 assert.match(transition,/canonical `registry\/prs\.json`/);
 assert.match(transition,/currently hosted GitHub repository slug is `neophilism\/Debate-Engine`/);
 assert.doesNotMatch(readme,/Full 30-milestone/);
 assert.doesNotMatch(handoff,/See `registry\/roadmap\.json` for each milestone/);
});
