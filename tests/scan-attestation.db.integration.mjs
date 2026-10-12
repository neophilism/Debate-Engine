import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import pg from "pg";
if(!process.env.DATABASE_URL)throw Error("Requires isolated PostgreSQL.");
test("scan attestation cannot be forged against another digest or changed after recording",async()=>{
 const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();await db.query("BEGIN");
 try{
  const account=(await db.query("INSERT INTO accounts(identity_provider,external_subject,display_name) VALUES('fixture',$1,'Fixture') RETURNING id",[randomUUID()])).rows[0].id;
  const office=(await db.query("INSERT INTO offices(slug,title,jurisdiction) VALUES($1,'Fictional office','Test') RETURNING id",["scan-"+randomUUID()])).rows[0].id;
  const election=(await db.query("INSERT INTO election_cycles(office_id,election_date,label) VALUES($1,'2032-11-02','Fixture') RETURNING id",[office])).rows[0].id;
  const candidate=(await db.query("INSERT INTO candidacies(account_id,election_id,public_name,verification_status) VALUES($1,$2,'Fixture','verified') RETURNING id",[account,election])).rows[0].id;
  const digest="a".repeat(64);
  const asset=(await db.query("INSERT INTO media_assets(owner_candidacy_id,storage_key,original_sha256,size_bytes,mime_type,duration_seconds,processing_status) VALUES($1,$2,$3,2048,'video/mp4',30,'ready') RETURNING id",[candidate,"scanner/"+randomUUID(),digest])).rows[0].id;
  const insert="INSERT INTO media_scan_attestations(media_asset_id,original_sha256,scanner,verdict) VALUES($1,$2,'clamav','clean')";
  await db.query("SAVEPOINT invalid_scan");
  await assert.rejects(db.query(insert,[asset,"b".repeat(64)]));
  await db.query("ROLLBACK TO SAVEPOINT invalid_scan");
  await db.query(insert,[asset,digest]);
  const accepted=await db.query("SELECT 1 FROM media_assets m JOIN media_scan_attestations a ON a.media_asset_id=m.id AND a.original_sha256=m.original_sha256 AND a.verdict='clean' WHERE m.id=$1",[asset]);
  assert.equal(accepted.rowCount,1);
  await db.query("SAVEPOINT immutable");
  await assert.rejects(db.query("DELETE FROM media_scan_attestations WHERE media_asset_id=$1",[asset]));
  await db.query("ROLLBACK TO SAVEPOINT immutable");
 }finally{await db.query("ROLLBACK");await db.end()}
});
