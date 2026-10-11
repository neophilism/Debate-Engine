import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";

if(!process.env.DATABASE_URL)throw Error("Isolated DATABASE_URL required.");
test("Private assistant data stays account-scoped, can be retired without altering published evidence",async()=>{
 const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();
 try{
  await db.query("BEGIN");
  const name="privacy-fixture-"+Date.now();
  const owner=(await db.query("INSERT INTO accounts(identity_provider,external_subject,display_name) VALUES('fixture',$1,'Privacy owner') RETURNING id",[name])).rows[0].id;
  const stranger=(await db.query("INSERT INTO accounts(identity_provider,external_subject,display_name) VALUES('fixture',$1,'Stranger') RETURNING id",[name+"-other"])).rows[0].id;
  const office=(await db.query("INSERT INTO offices(slug,title,jurisdiction) VALUES($1,'Fictional office','Test') RETURNING id",[name])).rows[0].id;
  const election=(await db.query("INSERT INTO election_cycles(office_id,election_date,label) VALUES($1,'2028-11-07','Test') RETURNING id",[office])).rows[0].id;
  const candidacy=(await db.query("INSERT INTO candidacies(account_id,election_id,public_name,verification_status) VALUES($1,$2,'Fixture','verified') RETURNING id",[owner,election])).rows[0].id;
  const draft=(await db.query("INSERT INTO private_submission_drafts(candidacy_id,owner_account_id,kind,modality,payload,content_sha256) VALUES($1,$2,'opening','writing','{\"candidacyId\":\"fixture\",\"writtenContent\":\"test\"}'::jsonb,$3) RETURNING id",[candidacy,owner,"a".repeat(64)])).rows[0].id;
  await db.query("SAVEPOINT unauthorized");
  let failed=false;
  try{await db.query("INSERT INTO private_debate_assessments(draft_id,owner_account_id,stage,content_sha256,model_provider,model_name,findings) VALUES($1,$2,'preliminary',$3,'test','fake-fixture','{}'::jsonb)",[draft,stranger,"a".repeat(64)]);}
  catch(e){failed=true;assert.equal(e.code,"23514");}
  await db.query("ROLLBACK TO SAVEPOINT unauthorized");
  assert.ok(failed,"Stranger cannot own another candidate's private report");
  const assessment=(await db.query("INSERT INTO private_debate_assessments(draft_id,owner_account_id,stage,content_sha256,model_provider,model_name,findings) VALUES($1,$2,'preliminary',$3,'test','fixture','{}'::jsonb) RETURNING id",[draft,owner,"a".repeat(64)])).rows[0].id;
  await db.query("INSERT INTO private_assessment_feedback(assessment_id,owner_account_id,finding_id,choice) VALUES($1,$2,'finding-1','reject')",[assessment,owner]);
  await db.query("DELETE FROM private_submission_drafts WHERE id=$1",[draft]);
  const residual=(await db.query("SELECT count(*)::integer AS n FROM private_debate_assessments WHERE draft_id=$1",[draft])).rows[0].n;
  assert.equal(residual,0,"Unpublished erased drafts cascade all private reports");
  assert.equal((await db.query("SELECT count(*)::integer AS n FROM private_assessment_feedback WHERE assessment_id=$1",[assessment])).rows[0].n,0);
  await db.query("ROLLBACK");
 }finally{await db.end();}
},{timeout:45000});
