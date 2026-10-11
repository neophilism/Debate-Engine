import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import pg from "pg";
if(!process.env.DATABASE_URL)throw Error("Requires disposable PostgreSQL");
test("withdrawal is append-only, independently attributable and does not remove historical approval",async()=>{
 const db=new pg.Client({connectionString:process.env.DATABASE_URL});
 await db.connect();await db.query("BEGIN");
 try{
  const candidates=[];
  const o=(await db.query("INSERT INTO offices(slug,title,jurisdiction) VALUES($1,'Debate test','fixture') RETURNING id",["withdraw-"+randomUUID()])).rows[0].id;
  const election=(await db.query("INSERT INTO election_cycles(office_id,election_date,label) VALUES($1,'2032-11-02','fixture') RETURNING id",[o])).rows[0].id;
  for(let n=0;n<3;n++){
   const account=(await db.query("INSERT INTO accounts(identity_provider,external_subject,display_name) VALUES('fixture',$1,$2) RETURNING id",[randomUUID(),"Candidate "+n])).rows[0].id;
   candidates.push((await db.query("INSERT INTO candidacies(account_id,election_id,public_name,verification_status) VALUES($1,$2,$3,'verified') RETURNING id",[account,election,"Candidate "+n])).rows[0].id);
  }
  const d=(await db.query("INSERT INTO debates(election_id,originator_candidacy_id,title,proposition,max_response_seconds) VALUES($1,$2,'Test debate','Policy',$3) RETURNING id",[election,candidates[0],300])).rows[0].id;
  const b=(await db.query("INSERT INTO debate_branches(debate_id,responder_candidacy_id) VALUES($1,$2) RETURNING id",[d,candidates[1]])).rows[0].id;
  const hash="a".repeat(64);
  const version=(await db.query("INSERT INTO policy_versions(branch_id,proposed_by_candidacy_id,content_sha256,policy_body) VALUES($1,$2,$3,'Test policy') RETURNING id",[b,candidates[0],hash])).rows[0].id;
  const sql="INSERT INTO policy_endorsement_events(policy_version_id,content_sha256,candidacy_id,action) VALUES($1,$2,$3,$4) RETURNING id";
  await db.query("SAVEPOINT guard");
  await assert.rejects(db.query(sql,[version,hash,candidates[2],"withdraw"]));
  await db.query("ROLLBACK TO SAVEPOINT guard");
  for(const who of candidates.slice(0,2)){
   await db.query("INSERT INTO policy_acceptances(policy_version_id,content_sha256,candidacy_id) VALUES($1,$2,$3)",[version,hash,who]);
   await db.query(sql,[version,hash,who,"accept"]);
  }
  const withdrawal=(await db.query(sql,[version,hash,candidates[0],"withdraw"])).rows[0].id;
  const latest=(await db.query("SELECT DISTINCT ON (candidacy_id) candidacy_id,action FROM policy_endorsement_events WHERE policy_version_id=$1 ORDER BY candidacy_id,occurred_at DESC,id DESC",[version])).rows;
  assert.equal(latest.filter(x=>x.action==="accept").length,1);
  assert.equal((await db.query("SELECT count(*)::integer AS n FROM policy_acceptances WHERE policy_version_id=$1",[version])).rows[0].n,2);
  await db.query("SAVEPOINT immutable");
  await assert.rejects(db.query("DELETE FROM policy_endorsement_events WHERE id=$1",[withdrawal]));
  await db.query("ROLLBACK TO SAVEPOINT immutable");
 }finally{await db.query("ROLLBACK");await db.end();}
});
