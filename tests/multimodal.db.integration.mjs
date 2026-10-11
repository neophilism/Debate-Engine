import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
if(!process.env.DATABASE_URL)throw Error("Isolated DATABASE_URL required for real-PostgreSQL acceptance tests.");

test("A mixed-media contender response remains published, immutable, and selectable for qualification",async()=>{
 const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();
 try{
  await db.query("BEGIN");
  const uid="mixed-fixture-"+Date.now();
  const a=(await db.query("INSERT INTO accounts(identity_provider,external_subject,display_name) VALUES('fixture',$1,'Candidate A') RETURNING id",[uid+"-a"])).rows[0].id;
  const b=(await db.query("INSERT INTO accounts(identity_provider,external_subject,display_name) VALUES('fixture',$1,'Candidate B') RETURNING id",[uid+"-b"])).rows[0].id;
  const office=(await db.query("INSERT INTO offices(slug,title,jurisdiction) VALUES($1,'Fictional public office','Test') RETURNING id",[uid])).rows[0].id;
  const election=(await db.query("INSERT INTO election_cycles(office_id,election_date,label) VALUES($1,'2028-11-07','Test') RETURNING id",[office])).rows[0].id;
  const ca=(await db.query("INSERT INTO candidacies(account_id,election_id,public_name,verification_status) VALUES($1,$2,'A','verified') RETURNING id",[a,election])).rows[0].id;
  const cb=(await db.query("INSERT INTO candidacies(account_id,election_id,public_name,verification_status) VALUES($1,$2,'B','verified') RETURNING id",[b,election])).rows[0].id;
  const ma=(await db.query("INSERT INTO media_assets(owner_candidacy_id,storage_key,original_sha256,size_bytes,mime_type,duration_seconds,processing_status) VALUES($1,$2,$3,1024,'video/mp4',120,'ready') RETURNING id",[ca,uid+"/opening-video","a".repeat(64)])).rows[0].id;
  const original=(await db.query("INSERT INTO debates(election_id,originator_candidacy_id,title,proposition,max_response_seconds,allowed_modalities) VALUES($1,$2,'Fixture','Debate a written alternative.',300,ARRAY['video','audio','writing']) RETURNING id",[election,ca])).rows[0].id;
  const opening=(await db.query("INSERT INTO submissions(debate_id,candidacy_id,media_asset_id,modality,kind) VALUES($1,$2,$3,'video','opening') RETURNING id",[original,ca,ma])).rows[0].id;
  const qa=(await db.query("INSERT INTO questions(submission_id,asked_by_candidacy_id,ordinal,question_text,video_timestamp_seconds) VALUES($1,$2,1,'What is your alternative?',42) RETURNING id",[opening,ca])).rows[0].id;
  await db.query("UPDATE submissions SET published_at=now() WHERE id=$1",[opening]);
  await db.query("UPDATE debates SET status='published',published_at=now() WHERE id=$1",[original]);
  const branch=(await db.query("INSERT INTO debate_branches(debate_id,responder_candidacy_id) VALUES($1,$2) RETURNING id",[original,cb])).rows[0].id;
  const written="My alternative is transparent public evidence. It answers the specific question and advances the discussion.";
  const response=(await db.query("INSERT INTO submissions(debate_id,branch_id,candidacy_id,parent_submission_id,modality,written_content,kind) VALUES($1,$2,$3,$4,'writing',$5,'response') RETURNING id",[original,branch,cb,opening,written])).rows[0].id;
  const qb=(await db.query("INSERT INTO questions(submission_id,asked_by_candidacy_id,ordinal,question_text,written_anchor) VALUES($1,$2,1,'What about implementation?','char:10') RETURNING id",[response,cb])).rows[0].id;
  await db.query("INSERT INTO answers(submission_id,question_id,written_anchor) VALUES($1,$2,'char:3')",[response,qa]);
  await db.query("UPDATE submissions SET published_at=now() WHERE id=$1",[response]);
  const record=await db.query("SELECT s.id,s.modality,s.written_content,m.id AS media_id FROM submissions s LEFT JOIN media_assets m ON m.id=s.media_asset_id WHERE s.debate_id=$1 AND s.published_at IS NOT NULL ORDER BY s.published_at",[original]);
  assert.equal(record.rows.length,2);
  assert.ok(record.rows.some(x=>x.id===opening&&x.modality==="video"&&x.media_id===ma));
  assert.ok(record.rows.some(x=>x.id===response&&x.modality==="writing"&&x.media_id===null&&x.written_content===written));
  assert.equal((await db.query("SELECT written_anchor FROM questions WHERE id=$1",[qb])).rows[0].written_anchor,"char:10");
  await refused(db,"UPDATE submissions SET written_content='Silently replaced speech' WHERE id=$1",[response],"55000");
  await refused(db,"DELETE FROM submissions WHERE id=$1",[response],["55000","23503"]);
  await refused(db,"UPDATE questions SET written_anchor='char:0' WHERE id=$1",[qb],"55000");
  await refused(db,"INSERT INTO answers(submission_id,question_id,written_anchor) VALUES($1,$2,'not-an-anchor')",[response,qb],"23514");
  const videoOnly=(await db.query("INSERT INTO debates(election_id,originator_candidacy_id,title,proposition,max_response_seconds) VALUES($1,$2,'Legacy video only','No text allowed.',300) RETURNING id",[election,ca])).rows[0].id;
  assert.deepEqual((await db.query("SELECT allowed_modalities FROM debates WHERE id=$1",[videoOnly])).rows[0].allowed_modalities,["video"]);
  await refused(db,"INSERT INTO submissions(debate_id,candidacy_id,modality,written_content,kind) VALUES($1,$2,'writing','Not permitted here','opening')",[videoOnly,ca],"23514");
  await db.query("ROLLBACK");
 }finally{await db.end();}
},{timeout:45000});

async function refused(db,sql,params,expected){
 await db.query("SAVEPOINT verify_refusal");
 let error;
 try{await db.query(sql,params);}catch(e){error=e;}
 await db.query("ROLLBACK TO SAVEPOINT verify_refusal");
 assert.ok(error,"Expected database refusal: "+sql);
 assert.ok((Array.isArray(expected)?expected:[expected]).includes(error.code),"Unexpected database error: "+error.message);
}
