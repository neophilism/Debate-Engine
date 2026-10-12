#!/usr/bin/env node
/**
 * CI-only real HTTP/Next.js + PostgreSQL browser pilot, with TWO separate
 * cryptographically signed fixture sessions. Managed Neon Auth itself is NOT
 * mocked into a production environment and is NOT accepted by this test.
 * Everything runs on a disposable localhost GitHub runner and fictional data.
 */
import assert from "node:assert/strict";
import {createHmac,randomUUID} from "node:crypto";
import {chromium} from "playwright";
const origin=process.env.PDE_BROWSER_URL;
if(process.env.GITHUB_ACTIONS!=="true"||process.env.PDE_CI_PILOT_RUN!=="true"||
   origin!=="https://127.0.0.1:3443"||
   process.env.DATABASE_URL!=="postgresql://debate_ci:test_only_password@localhost:5432/debate_ci"||
   !/^[0-9a-f]{64}$/.test(process.env.PDE_CI_AUTH_KEY||""))
 throw Error("The candidate pilot may run only on its disposable localhost CI database.");
const key=process.env.PDE_CI_AUTH_KEY;
const browser=await chromium.launch({headless:true});
const contexts=[];
const random="ci-"+randomUUID().slice(0,8);
const candidateNameA="Fictional Policy Candidate A "+random;
const candidateNameB="Fictional Policy Candidate B "+random;
const questionA="How would you independently verify the evidence for each budget change?";
const questionB="How would you preserve those public audit records?";
const openingText="This is an entirely fictional policy debate. The proposal is to publish documented fiscal assumptions and clearly state which spending estimates are subject to independent verification. The record must preserve original source material so that participants can check each claim against the published budget calculations and explain any disputes.";
const responseText="I would use an open and independently inspectable audit ledger to evaluate each published budget change. The responsible office should identify its evidence, sources and approval date without altering the preceding original statement. I also want the proposer to explain how the audit records would be kept accessible without changing prior versions.";
const replyText="I would publish a permanently attributed append-only audit ledger with dated records, immutable original sources and independent restoration checks. No candidate or reviewer should silently remove another candidate's published contribution or invent a determination of who won the exchange.";
const actorId={reviewer:"00000000-0000-4000-8000-000000000001",a:"00000000-0000-4000-8000-000000000002",b:"00000000-0000-4000-8000-000000000003"};
function signedCookie(actor){
 return actor+"."+createHmac("sha256",key).update("ci-session:"+actor).digest("hex");
}
async function contextFor(actor){
 const context=await browser.newContext({viewport:{width:1250,height:900},locale:"en-US",ignoreHTTPSErrors:true});
 contexts.push(context);
 if(actor){
  await context.addCookies([{name:"pde_ci_session",value:signedCookie(actor),
   url:origin,httpOnly:true,sameSite:"Lax",secure:true}]);
 }
 return context;
}
async function request(context,verb,path,data,expected=200){
 const response=await context.request.fetch(new URL(path,origin).href,{
  method:verb,headers:{"origin":origin,...(data===undefined?{}:{"content-type":"application/json"})},
  ...(data===undefined?{}:{data:JSON.stringify(data)})
 });
 const raw=await response.text();
 let result;
 try{result=JSON.parse(raw)}catch{result={raw:raw.slice(0,1200)}}
 assert.equal(response.status(),expected,verb+" "+path+": "+JSON.stringify(result));
 return result;
}
async function pageAt(context,path){
 const page=await context.newPage();
 const response=await page.goto(origin+path,{waitUntil:"domcontentloaded",timeout:30000});
 assert.equal(response?.status(),200,path+" must load in the real browser");
 return page;
}
async function publishFromComposer(page,label){
 await page.getByRole("button",{name:/Prepare private assessment/}).click();
 try{
  await page.getByRole("heading",{name:/Review your speech before publishing/}).waitFor({timeout:25000});
 }catch(e){throw Error(label+" preparation failed: "+JSON.stringify(await page.locator('[role="alert"]').allTextContents()))}
 await page.getByRole("button",{name:/Skip optional assessment/}).click();
 await page.getByText(/Optional analysis skipped/).waitFor({timeout:25000});
 await page.getByRole("button",{name:/Approve my final original and publish/}).click();
 try{
  await page.waitForURL(/\/workspace\/drafts\/[0-9a-f-]+$/, {timeout:35000});
 }catch(e){throw Error(label+" confirmation failed: "+JSON.stringify(await page.locator('[role="alert"],[role="status"]').allTextContents()))}
 const id=page.url().match(/\/workspace\/drafts\/([0-9a-f-]+)$/)?.[1];
 assert.ok(id,label+" must resolve to a private draft receipt");
 return id;
}
function consent(page){
 return Promise.all([
  page.getByRole("checkbox",{name:/I authorize permanent public archiving/}).check(),
  page.getByRole("checkbox",{name:/I authorize unedited inclusion/}).check()
 ]);
}
async function waitVerified(page,id){
 await page.goto(origin+"/workspace",{waitUntil:"domcontentloaded"});
 await page.getByRole("link",{name:/Prepare a debate/}).first().waitFor({timeout:25000});
 const options=await page.locator("select").count();
 assert.ok(options>=1);
}
async function prepareWriting(page,candidateId,content){
 await page.getByLabel("Verified candidate").selectOption(candidateId);
 await page.getByRole("checkbox",{name:"Writing"}).check().catch(async()=>{
  // Replies have inherited allowed modalities rather than editable checkboxes.
  assert.ok((await page.getByLabel("Your submission medium").locator('option[value="writing"]').count())===1);
 });
 await page.getByLabel("Your submission medium").selectOption("writing");
 await page.getByLabel("Complete written speech").fill(content);
}
try{
 const anonymous=await contextFor(null),admin=await contextFor("reviewer"),
  a=await contextFor("a"),b=await contextFor("b");
 await request(anonymous,"GET","/api/account/me",undefined,401);
 await request(anonymous,"GET","/api/private/drafts",undefined,401);
 const tampered=await contextFor(null);
 await tampered.addCookies([{name:"pde_ci_session",value:"a."+"0".repeat(64),url:origin,httpOnly:true,sameSite:"Lax"}]);
 await request(tampered,"GET","/api/account/me",undefined,401);
 const publicAnonymous=await pageAt(anonymous,"/debates");
 assert.ok(await publicAnonymous.getByRole("heading",{name:/Debates in/}).count());
 const uniqueSlug="pde-fixture-"+randomUUID().slice(0,12);
 const election=await request(admin,"POST","/api/admin/elections",{
  title:"FICTIONAL Pilot Legislature",slug:uniqueSlug,jurisdiction:"CI synthetic jurisdiction",
  label:"Fictional pilot 2032",date:"2032-11-02"
 },201);
 const electionId=election.id;
 assert.equal((await request(a,"GET","/api/account/me")).user.id,actorId.a);
 assert.equal((await request(b,"GET","/api/account/me")).user.id,actorId.b);
 const pageA=await pageAt(a,"/workspace"),pageB=await pageAt(b,"/workspace");
 for(const [page,name] of [[pageA,candidateNameA],[pageB,candidateNameB]]){
  // The native HTML label wraps the select and its option text. Exact label
  // matching can include option content; target the actual election form.
  const form=page.locator(".workspace-panel").filter({hasText:"REGISTER FOR AN ELECTION"}).locator("form");
  try{await form.locator("select").selectOption(electionId,{timeout:15000});}
  catch{throw Error("Workspace election picker unavailable: "+(await page.locator("main").innerText()).slice(0,1200));}
  await form.getByLabel("Public candidate name").fill(name);
  await form.getByRole("button",{name:/Request verification/}).click();
  await page.getByText(/Candidate registration submitted/).waitFor({timeout:20000});
 }
 const mineA=(await request(a,"GET","/api/account/me")).candidacies;
 const mineB=(await request(b,"GET","/api/account/me")).candidacies;
 const candidateA=mineA.find(c=>c.public_name===candidateNameA)?.id;
 const candidateB=mineB.find(c=>c.public_name===candidateNameB)?.id;
 assert.ok(candidateA&&candidateB&&candidateA!==candidateB);
 assert.equal(mineA.find(c=>c.id===candidateA)?.verification_status,"pending");
 assert.equal(mineB.find(c=>c.id===candidateB)?.verification_status,"pending");
 const pendingPayload={candidacyId:candidateA,modality:"writing",writtenContent:openingText,
  mediaAssetId:null,allowedModalities:["writing"],questions:[{text:questionA,characterOffset:0}],
  title:"Synthetic source accountability policy",proposition:"A fictional and explicitly synthetic proposal",
  maxResponseSeconds:300,replyWindowHours:48,archiveConsent:true,sequenceConsent:true};
 await request(a,"POST","/api/private/drafts",{kind:"opening",candidacyId:candidateA,
  payload:pendingPayload,providerConsent:false,improvementConsent:false},403);
 await request(b,"POST","/api/admin/candidacies/"+candidateA+"/verify",
  {approve:true,reason:"A nonreviewer may not verify another candidate."},403);
 const reason="In this disposable test only, each fixture identity is permitted to publish synthetic speeches.";
 await request(admin,"POST","/api/admin/candidacies/"+candidateA+"/verify",{approve:true,reason});
 await request(admin,"POST","/api/admin/candidacies/"+candidateB+"/verify",{approve:true,reason});
 assert.equal((await request(a,"GET","/api/account/me")).candidacies.find(c=>c.id===candidateA).verification_status,"verified");
 assert.equal((await request(b,"GET","/api/account/me")).candidacies.find(c=>c.id===candidateB).verification_status,"verified");
 await waitVerified(pageA,candidateA);
 await waitVerified(pageB,candidateB);
 await pageA.goto(origin+"/workspace/new");
 await pageA.getByLabel("Verified candidate").selectOption(candidateA);
 await pageA.getByLabel("Policy title").fill("Synthetic source accountability policy");
 await pageA.getByLabel("Proposal and supporting explanation").fill("An explicitly fictional plan to make public-source budget estimates more auditable.");
 await pageA.getByRole("checkbox",{name:"Writing"}).check();
 await pageA.getByLabel("Your submission medium").selectOption("writing");
 await pageA.getByLabel("Complete written speech").fill(openingText);
 await pageA.getByLabel("Question 1").fill(questionA);
 await consent(pageA);
 // The private text remains absent from the public archive until explicit confirmation.
 await pageA.getByRole("button",{name:/Prepare private assessment/}).click();
 await pageA.getByRole("heading",{name:/Review your speech before publishing/}).waitFor();
 const prepared=(await request(a,"GET","/api/private/drafts")).drafts.find(d=>d.kind==="opening");
 assert.ok(prepared&&prepared.status==="draft");
 await request(b,"GET","/api/private/drafts/"+prepared.id,undefined,404);
 await request(anonymous,"GET","/api/private/drafts/"+prepared.id,undefined,401);
 const visibleBefore=(await request(anonymous,"GET","/api/debates?q=Synthetic%20source%20accountability%20policy")).debates;
 assert.equal(visibleBefore.length,0,"Private candidate drafts must not appear in public search.");
 await pageA.getByRole("button",{name:/Skip optional assessment/}).click();
 await pageA.getByText(/Optional analysis skipped/).waitFor();
 await pageA.getByRole("button",{name:/Approve my final original and publish/}).click();
 await pageA.waitForURL(/\/workspace\/drafts\/[0-9a-f-]+$/,{timeout:35000});
 const openingReceipt=await request(a,"GET","/api/private/drafts/"+prepared.id);
 const debateId=openingReceipt.draft.published_debate_id,openingId=openingReceipt.draft.published_submission_id;
 assert.ok(debateId&&openingId);
 const firstPublic=await request(anonymous,"GET","/api/debates/"+debateId);
 const qA=firstPublic.questions.find(q=>q.submission_id===openingId)?.id;
 assert.ok(qA,"Published opening must persist its attributed question");
 await request(b,"GET","/api/private/drafts/"+prepared.id,undefined,404);
 await pageB.goto(origin+"/debates/"+debateId+"/respond");
 await pageB.getByLabel("Verified candidate").selectOption(candidateB);
 await pageB.getByLabel("Opponent's contribution to answer").selectOption(openingId);
 await pageB.getByLabel("Your submission medium").selectOption("writing");
 await pageB.getByLabel("Complete written speech").fill(responseText);
 await pageB.getByLabel(questionA).fill("0");
 await pageB.getByLabel("Reciprocal question").fill(questionB);
 await consent(pageB);
 const responseDraftId=await publishFromComposer(pageB,"Responder");
 const responseReceipt=await request(b,"GET","/api/private/drafts/"+responseDraftId);
 const responseId=responseReceipt.draft.published_submission_id;
 assert.ok(responseId);
 await request(b,"POST","/api/assessments",{candidacyId:candidateB,questionId:qA,
  answerSubmissionId:responseId,decision:"answered",reasoning:"The responder cannot assess the originator's question."},403);
 await request(a,"POST","/api/assessments",{candidacyId:candidateA,questionId:qA,
  answerSubmissionId:responseId,decision:"answered",
  reasoning:"The responder gave a specific method for independent checks and public records."},201);
 const secondPublic=await request(anonymous,"GET","/api/debates/"+debateId);
 const qB=secondPublic.questions.find(q=>q.submission_id===responseId)?.id;
 assert.ok(qB,"Responder's reciprocal question must be attributed and public");
 await pageA.goto(origin+"/debates/"+debateId+"/respond");
 await pageA.getByLabel("Verified candidate").selectOption(candidateA);
 await pageA.getByLabel("Opponent's contribution to answer").selectOption(responseId);
 await pageA.getByLabel("Your submission medium").selectOption("writing");
 await pageA.getByLabel("Complete written speech").fill(replyText);
 await pageA.getByLabel(questionB).fill("0");
 await consent(pageA);
 const replyDraftId=await publishFromComposer(pageA,"Originator reply");
 const replyReceipt=await request(a,"GET","/api/private/drafts/"+replyDraftId);
 const replyId=replyReceipt.draft.published_submission_id;
 assert.ok(replyId);
 await request(b,"POST","/api/assessments",{candidacyId:candidateB,questionId:qB,
  answerSubmissionId:replyId,decision:"answered",
  reasoning:"The originator explained how public source records would remain available."},201);
 const timeline=await request(anonymous,"GET","/api/debates/"+debateId);
 assert.equal(timeline.submissions.length,3,"All three published originals must be preserved");
 const sequence=await request(anonymous,"GET","/api/debates/"+debateId+"/sequence");
 const branch=sequence.branches.find(x=>x.qualifyingSubmissionIds?.includes(responseId));
 assert.ok(branch,"The responder must have a separate branch");
 assert.deepEqual(branch.qualifyingSubmissionIds,[openingId,responseId,replyId],
  "Only reciprocal question/assessment-complete exchanges belong to the qualified sequence.");
 await request(b,"POST","/api/contributions/"+openingId+"/corrections",{
  candidacyId:candidateB,correctionBody:"An opponent must not be allowed to rewrite this original."},403);
 const correction=await request(a,"POST","/api/contributions/"+openingId+"/corrections",{
  candidacyId:candidateA,correctionBody:"This fictional proposal also preserves all historical source versions for public inspection."},201);
 assert.ok(correction.correctionId);
 const corrections=await request(anonymous,"GET","/api/contributions/"+openingId+"/corrections");
 assert.equal(corrections.corrections.length,1);
 const publicPage=await pageAt(anonymous,"/debates/"+debateId);
 assert.match(await publicPage.locator("main").innerText(),/fictional|Synthetic/i);
 assert.match(await publicPage.locator("main").innerText(),/preserves all historical source versions/i);
 const archive=await request(anonymous,"GET","/api/debates?q=Synthetic%20source%20accountability%20policy");
 assert.ok(archive.debates.some(d=>d.id===debateId));
 console.log(JSON.stringify({result:"PASS",mode:"isolated_signed_session_fixture_not_real_neon_auth",
  distinctCandidateSessions:2,independentReviewerSession:true,verifiedFixtureCandidacies:2,
  publishedSubmissions:3,assessments:2,qualifyingSubmissions:3,
  attributedCorrections:1,privateDraftCrossAccountDenied:true,
  unauthenticatedDenied:true,reviewerOnlyVerification:true,privateBeforePublish:true,
  noRealCandidateData:true,noProductionDatabase:true}));
}finally{
 await Promise.all(contexts.map(x=>x.close().catch(()=>{})));
 await browser.close();
}
