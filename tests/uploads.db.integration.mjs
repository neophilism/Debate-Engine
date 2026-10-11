import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import pg from "pg";
if(!process.env.DATABASE_URL)throw Error("Requires isolated test PostgreSQL");
test("upload sessions cannot misstate chunk counts, hashes or media publication",async()=>{
 const db=new pg.Client({connectionString:process.env.DATABASE_URL});
 await db.connect();await db.query("BEGIN");
 try{
  const account=(await db.query("INSERT INTO accounts(identity_provider,external_subject,display_name) VALUES('fixture',$1,'Test owner') RETURNING id",[randomUUID()])).rows[0].id;
  const office=(await db.query("INSERT INTO offices(slug,title,jurisdiction) VALUES($1,'Test office','test') RETURNING id",["upload-"+randomUUID()])).rows[0].id;
  const election=(await db.query("INSERT INTO election_cycles(office_id,election_date,label) VALUES($1,'2032-11-02','test') RETURNING id",[office])).rows[0].id;
  const candidate=(await db.query("INSERT INTO candidacies(account_id,election_id,public_name,verification_status) VALUES($1,$2,'Test owner','verified') RETURNING id",[account,election])).rows[0].id;
  const sql="INSERT INTO media_upload_sessions(owner_candidacy_id,storage_key,storage_upload_id,modality,claimed_mime,expected_sha256,declared_size_bytes,part_count) VALUES($1,$2,'test-upload','video','video/mp4',$3,$4,$5) RETURNING id";
  const id=(await db.query(sql,[candidate,"uploads/"+randomUUID(),"a".repeat(64),8388609,2])).rows[0].id;
  assert.equal((await db.query("SELECT status FROM media_upload_sessions WHERE id=$1",[id])).rows[0].status,"uploading");
  assert.equal((await db.query("SELECT count(*)::integer AS n FROM media_assets WHERE owner_candidacy_id=$1",[candidate])).rows[0].n,0);
  const invalid=[["bad part count",8388609,1,"a".repeat(64)],["empty bytes",1,1,"a".repeat(64)],["invalid digest",64,1,"wat"]];
  for(const [name,size,count,hash] of invalid){
   await db.query("SAVEPOINT wrong");
   await assert.rejects(db.query(sql,[candidate,"uploads/"+randomUUID(),hash,size,count]),undefined,String(name));
   await db.query("ROLLBACK TO SAVEPOINT wrong");
   await db.query("RELEASE SAVEPOINT wrong");
  }
  await db.query("SAVEPOINT mismatch");
  await assert.rejects(db.query("UPDATE media_upload_sessions SET status='completed' WHERE id=$1",[id]));
  await db.query("ROLLBACK TO SAVEPOINT mismatch");
  await db.query("UPDATE media_upload_sessions SET status='aborted' WHERE id=$1",[id]);
  assert.equal((await db.query("SELECT status FROM media_upload_sessions WHERE id=$1",[id])).rows[0].status,"aborted");
 }finally{await db.query("ROLLBACK");await db.end();}
});
