import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
if (!process.env.DATABASE_URL) throw Error("This integration test requires an isolated DATABASE_URL.");

test("PostgreSQL migrations enforce permanent evidence and party attribution", async () => {
 const db=new pg.Client({connectionString:process.env.DATABASE_URL}); await db.connect();
 await db.query("BEGIN");
 try {
  const applied=(await db.query("SELECT filename FROM schema_migrations")).rows.map(x=>x.filename);
  for(const name of ["0001_foundation.sql","0002_debate_chain.sql","0003_reply_obligations.sql","0003_supporting_sources.sql","0004_captions.sql","0005_summary_rendering.sql"])assert.ok(applied.includes(name),"Missing migration: "+name);
  const actors=[];
  for(const label of ["Candidate A","Candidate B","Candidate C"]){
   const r=await db.query("INSERT INTO accounts(identity_provider,external_subject,display_name) VALUES('fixture',$1,$1) RETURNING id",[label]);
   actors.push(r.rows[0].id);
  }
  const o=await db.query("INSERT INTO offices(slug,title,jurisdiction) VALUES('fictional-office','Test office','fictional') RETURNING id");
  const e=await db.query("INSERT INTO election_cycles(office_id,election_date,label) VALUES($1,'2028-11-07','fixture') RETURNING id",[o.rows[0].id]);
  const candidates=[];
  for(let i=0;i<3;i++){
   const r=await db.query("INSERT INTO candidacies(account_id,election_id,public_name,verification_status) VALUES($1,$2,$3,'verified') RETURNING id",[actors[i],e.rows[0].id,"Test "+i]);
   candidates.push(r.rows[0].id);
  }
  const videos=[];
  for(let i=0;i<2;i++){
   const r=await db.query("INSERT INTO media_assets(owner_candidacy_id,storage_key,original_sha256,size_bytes,mime_type,duration_seconds,processing_status) VALUES($1,$2,$3,1024,'video/mp4',60,'ready') RETURNING id",[candidates[i],"fixture/source-"+i,"a".repeat(64)]);
   videos.push(r.rows[0].id);
  }
  const d=await db.query("INSERT INTO debates(election_id,originator_candidacy_id,title,proposition,max_response_seconds) VALUES($1,$2,'Fixture','Fictional subject',120) RETURNING id",[e.rows[0].id,candidates[0]]);
  const did=d.rows[0].id;
  const a=await db.query("INSERT INTO submissions(debate_id,candidacy_id,media_asset_id,kind) VALUES($1,$2,$3,'opening') RETURNING id",[did,candidates[0],videos[0]]);
  const opening=a.rows[0].id;
  const q=await db.query("INSERT INTO questions(submission_id,asked_by_candidacy_id,ordinal,question_text,video_timestamp_seconds) VALUES($1,$2,1,'How?',10) RETURNING id",[opening,candidates[0]]);
  await db.query("UPDATE submissions SET published_at=now() WHERE id=$1",[opening]);
  await db.query("UPDATE debates SET status='published',published_at=now() WHERE id=$1",[did]);
  const publishedSubmission=await db.query("SELECT published_at FROM submissions WHERE id=$1",[opening]);
  const publishedDebate=await db.query("SELECT status,published_at FROM debates WHERE id=$1",[did]);
  assert.ok(publishedSubmission.rows[0].published_at,"Draft-to-public submission transition must persist.");
  assert.equal(publishedDebate.rows[0].status,"published","Debate publication state must persist.");
  assert.ok(publishedDebate.rows[0].published_at,"Debate publication timestamp must persist.");

  const b=await db.query("INSERT INTO debate_branches(debate_id,responder_candidacy_id) VALUES($1,$2) RETURNING id",[did,candidates[1]]);
  const branch=b.rows[0].id;
  const response=await db.query("INSERT INTO submissions(debate_id,branch_id,candidacy_id,parent_submission_id,media_asset_id,kind) VALUES($1,$2,$3,$4,$5,'response') RETURNING id",[did,branch,candidates[1],opening,videos[1]]);
  const responseId=response.rows[0].id;
  await db.query("INSERT INTO answers(submission_id,question_id,video_timestamp_seconds) VALUES($1,$2,12)",[responseId,q.rows[0].id]);
  await db.query("UPDATE submissions SET published_at=now() WHERE id=$1",[responseId]);
  await db.query("INSERT INTO assessments(question_id,answer_submission_id,reviewer_candidacy_id,decision,reasoning) VALUES($1,$2,$3,'answered','Answered within original video.')",[q.rows[0].id,responseId,candidates[0]]);
  async function refused(sql,params,code="55000"){
   await db.query("SAVEPOINT assertion");
   let err;
   try{await db.query(sql,params);}catch(ex){err=ex;}
   await db.query("ROLLBACK TO SAVEPOINT assertion");
   assert.ok(err,"Expected refusal from: "+sql);
   assert.ok((Array.isArray(code)?code:[code]).includes(err.code),"Unexpected PostgreSQL error: "+String(err.message));
  }
  await refused("DELETE FROM submissions WHERE id=$1",[responseId],["55000","23503"]);
  await refused("UPDATE submissions SET media_asset_id=$2 WHERE id=$1",[opening,videos[1]]);
  await refused("UPDATE questions SET question_text='Modified' WHERE id=$1",[q.rows[0].id]);
  await refused("UPDATE media_assets SET original_sha256=$2 WHERE id=$1",[videos[0],"f".repeat(64)]);
  await refused("INSERT INTO assessments(question_id,answer_submission_id,reviewer_candidacy_id,decision,reasoning) VALUES($1,$2,$3,'answered','Bad attribution')",[q.rows[0].id,responseId,candidates[1]],"23514");
  const version=await db.query("INSERT INTO policy_versions(branch_id,proposed_by_candidacy_id,content_sha256,policy_body) VALUES($1,$2,$3,'Fictional common alternative') RETURNING id",[branch,candidates[0],"c".repeat(64)]);
  await refused("INSERT INTO policy_acceptances(policy_version_id,content_sha256,candidacy_id) VALUES($1,$2,$3)",[version.rows[0].id,"d".repeat(64),candidates[1]],"23503");
  await db.query("INSERT INTO policy_acceptances(policy_version_id,content_sha256,candidacy_id) VALUES($1,$2,$3)",[version.rows[0].id,"c".repeat(64),candidates[0]]);
  await db.query("INSERT INTO policy_acceptances(policy_version_id,content_sha256,candidacy_id) VALUES($1,$2,$3)",[version.rows[0].id,"c".repeat(64),candidates[1]]);
  await refused("DELETE FROM policy_acceptances WHERE policy_version_id=$1",[version.rows[0].id]);
  const ev=await db.query("INSERT INTO publication_events(debate_id,branch_id,kind,object_id) VALUES($1,$2,'fixture',$3) RETURNING id",[did,branch,responseId]);
  await refused("DELETE FROM publication_events WHERE id=$1",[ev.rows[0].id]);
 } finally {
  await db.query("ROLLBACK").catch(()=>{});
  await db.end();
 }
});
