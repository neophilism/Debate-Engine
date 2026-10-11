import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import pg from "pg";
if(!process.env.DATABASE_URL)throw Error("Disposable PostgreSQL required");
test("published corrections are author-owned, permanent and never mutate original speech",async()=>{
 const db=new pg.Client({connectionString:process.env.DATABASE_URL});
 await db.connect();await db.query("BEGIN");
 try{
  const actors=[];
  const office=(await db.query("INSERT INTO offices(slug,title,jurisdiction) VALUES($1,'Test','fictional') RETURNING id",["correction-"+randomUUID()])).rows[0].id;
  const election=(await db.query("INSERT INTO election_cycles(office_id,election_date,label) VALUES($1,'2032-11-02','fixture') RETURNING id",[office])).rows[0].id;
  for(let n=0;n<2;n++){
   const account=(await db.query("INSERT INTO accounts(identity_provider,external_subject,display_name) VALUES('fixture',$1,'Test') RETURNING id",[randomUUID()])).rows[0].id;
   actors.push((await db.query("INSERT INTO candidacies(account_id,election_id,public_name,verification_status) VALUES($1,$2,$3,'verified') RETURNING id",[account,election,"Fictional "+n])).rows[0].id);
  }
  const debate=(await db.query("INSERT INTO debates(election_id,originator_candidacy_id,title,proposition,max_response_seconds,status,published_at,allowed_modalities) VALUES($1,$2,'Testing','Testing corrected publications',300,'published',now(),ARRAY['writing']::text[]) RETURNING id",[election,actors[0]])).rows[0].id;
  const original="The first, permanent version of this policy speech was preserved.";
  const submission=(await db.query("INSERT INTO submissions(debate_id,candidacy_id,kind,modality,written_content,published_at) VALUES($1,$2,'opening','writing',$3,now()) RETURNING id",[debate,actors[0],original])).rows[0].id;
  const good="The original contained an incorrect date; the corrected date is 2032.";
  const inserted=(await db.query("INSERT INTO submission_corrections(submission_id,candidacy_id,correction_body) VALUES($1,$2,$3) RETURNING id",[submission,actors[0],good])).rows[0].id;
  await db.query("SAVEPOINT denied");
  await assert.rejects(db.query("INSERT INTO submission_corrections(submission_id,candidacy_id,correction_body) VALUES($1,$2,$3)",[submission,actors[1],good]));
  await db.query("ROLLBACK TO SAVEPOINT denied");
  await db.query("SAVEPOINT immutable");
  await assert.rejects(db.query("DELETE FROM submission_corrections WHERE id=$1",[inserted]));
  await db.query("ROLLBACK TO SAVEPOINT immutable");
  assert.equal((await db.query("SELECT written_content FROM submissions WHERE id=$1",[submission])).rows[0].written_content,original);
 }finally{await db.query("ROLLBACK");await db.end()}
});
