#!/usr/bin/env node
/**
 * Disposable PostgreSQL 18 backup/restore rehearsal.
 * IMPORTANT: refuses all non-local databases and accepts only a known CI database.
 * Only fictional fixture records are ever exported. No backup is uploaded.
 */
import assert from "node:assert/strict";
import {randomUUID,createHash} from "node:crypto";
import {promisify} from "node:util";
import {execFile} from "node:child_process";
import pg from "pg";

const run=promisify(execFile);
const sourceUrl=process.env.DATABASE_URL||"";
const container=process.env.PDE_TEST_POSTGRES_CONTAINER||"";
let address;
try{address=new URL(sourceUrl)}catch{throw Error("A disposable DATABASE_URL is required.");}
if(!["localhost","127.0.0.1"].includes(address.hostname)||
   address.pathname!=="/debate_ci"||
   !/^[0-9a-f]{12,64}$/.test(container)){
 throw Error("Refusing backup rehearsal outside its disposable local CI PostgreSQL container.");
}
const user=decodeURIComponent(address.username);
if(user!=="debate_ci")throw Error("Refusing database role outside the CI fixture.");
const destinationName="debate_restore_ci";
const dump="/tmp/pde-rehearsal-"+randomUUID()+".dump";
const docker=async (...args)=>run("docker",["exec",container,...args],{timeout:120000,maxBuffer:512*1024});
const source=new pg.Client({connectionString:sourceUrl});
const restoredUrl=new URL(sourceUrl);
restoredUrl.pathname="/"+destinationName;
let destination=null,created=false,connected=false;
async function seed(){
 const nonce=randomUUID();
 const a=(await source.query(
  "INSERT INTO accounts(identity_provider,external_subject,display_name) VALUES('fixture',$1,'Fictional Archive A') RETURNING id",
  ["restore-a-"+nonce])).rows[0].id;
 const b=(await source.query(
  "INSERT INTO accounts(identity_provider,external_subject,display_name) VALUES('fixture',$1,'Fictional Archive B') RETURNING id",
  ["restore-b-"+nonce])).rows[0].id;
 const office=(await source.query(
  "INSERT INTO offices(slug,title,jurisdiction) VALUES($1,'Fictional Restore Legislature','Synthetic') RETURNING id",
  ["restore-"+nonce])).rows[0].id;
 const election=(await source.query(
  "INSERT INTO election_cycles(office_id,election_date,label) VALUES($1,'2032-11-02','Synthetic restore election') RETURNING id",
  [office])).rows[0].id;
 const candidateA=(await source.query(
  "INSERT INTO candidacies(account_id,election_id,public_name,verification_status) VALUES($1,$2,'Fictional Archive A','verified') RETURNING id",
  [a,election])).rows[0].id;
 const candidateB=(await source.query(
  "INSERT INTO candidacies(account_id,election_id,public_name,verification_status) VALUES($1,$2,'Fictional Archive B','verified') RETURNING id",
  [b,election])).rows[0].id;
 const debate=(await source.query(
  "INSERT INTO debates(election_id,originator_candidacy_id,title,proposition,max_response_seconds,allowed_modalities) VALUES($1,$2,'Synthetic backup integrity debate','Should fictional archives be recoverable?',300,ARRAY['writing']::text[]) RETURNING id",
  [election,candidateA])).rows[0].id;
 const opening=(await source.query(
  "INSERT INTO submissions(debate_id,candidacy_id,kind,modality,written_content) VALUES($1,$2,'opening','writing',$3) RETURNING id",
  [debate,candidateA,"An archive should preserve every original question and response. How would you independently check restoration?"])).rows[0].id;
 const question=(await source.query(
  "INSERT INTO questions(submission_id,asked_by_candidacy_id,ordinal,question_text,written_anchor) VALUES($1,$2,1,'How would you independently check restoration?','char:0') RETURNING id",
  [opening,candidateA])).rows[0].id;
 await source.query("UPDATE submissions SET published_at=now() WHERE id=$1",[opening]);
 await source.query("UPDATE debates SET status='published',published_at=now() WHERE id=$1",[debate]);
 const branch=(await source.query(
  "INSERT INTO debate_branches(debate_id,responder_candidacy_id) VALUES($1,$2) RETURNING id",
  [debate,candidateB])).rows[0].id;
 const response=(await source.query(
  "INSERT INTO submissions(debate_id,branch_id,candidacy_id,parent_submission_id,kind,modality,written_content) VALUES($1,$2,$3,$4,'response','writing',$5) RETURNING id",
  [debate,branch,candidateB,opening,"I would independently restore a fresh database and compare the complete evidence, including immutable published answers."])).rows[0].id;
 await source.query("INSERT INTO answers(submission_id,question_id,written_anchor) VALUES($1,$2,'char:0')",[response,question]);
 await source.query("UPDATE submissions SET published_at=now() WHERE id=$1",[response]);
 await source.query(
  "INSERT INTO assessments(question_id,answer_submission_id,reviewer_candidacy_id,decision,reasoning) VALUES($1,$2,$3,'answered','The response describes a reproducible restoration process.')",
  [question,response,candidateA]);
 await source.query(
  "INSERT INTO submission_corrections(submission_id,candidacy_id,correction_body) VALUES($1,$2,'The original remains valid; this is a separately preserved clarification.')",
  [response,candidateB]);
 return {opening,response};
}
function stable(value){
 if(value===null||typeof value!=="object")return value;
 if(value instanceof Date)return value.toISOString();
 if(Buffer.isBuffer(value))return value.toString("hex");
 if(Array.isArray(value))return value.map(stable);
 return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));
}
async function fingerprint(db){
 const list=await db.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name");
 const hash=createHash("sha256");
 for(const {table_name:name} of list.rows){
  if(!/^[a-z_][a-z0-9_]*$/.test(name))throw Error("Unexpected table identifier.");
  const rows=(await db.query('SELECT * FROM public."'+name+'"')).rows.map(r=>JSON.stringify(stable(r))).sort();
  hash.update(name+"\n"+rows.length+"\n");
  for(const entry of rows)hash.update(entry+"\n");
 }
 return {sha256:hash.digest("hex"),tables:list.rows.length};
}
try{
 await source.connect();connected=true;
 const ids=await seed();
 const original=await fingerprint(source);
 assert.ok(original.tables>=25,"Expected a complete migrated application schema.");
 await docker("pg_dump","-U",user,"-d","debate_ci","--format=custom","--file="+dump);
 await docker("createdb","-U",user,destinationName);created=true;
 await docker("pg_restore","-U",user,"-d",destinationName,"--no-owner","--no-privileges","--exit-on-error",dump);
 destination=new pg.Client({connectionString:restoredUrl.toString()});
 await destination.connect();
 const restored=await fingerprint(destination);
 assert.deepEqual(restored,original,"The restored complete database must match the original.");
 assert.equal((await destination.query("SELECT count(*)::int AS n FROM submissions WHERE published_at IS NOT NULL")).rows[0].n,2);
 // Check that published-source integrity constraints survived the export and restore.
 await destination.query("BEGIN");
 await destination.query("SAVEPOINT immutable");
 let refused=false;
 try{await destination.query("UPDATE submissions SET written_content='forbidden overwrite' WHERE id=$1",[ids.response]);}
 catch{refused=true;}
 await destination.query("ROLLBACK TO SAVEPOINT immutable");
 await destination.query("ROLLBACK");
 assert.equal(refused,true,"Restored database must still prevent editing published originals.");
 console.log(JSON.stringify({result:"pass",tableCount:original.tables,rowsAndSchemaSha256:restored.sha256,
  publishedSubmissions:2,immutablePublishedSpeech:true,mode:"fictional-data-only"}));
}finally{
 if(destination)await destination.end().catch(()=>{});
 if(connected)await source.end().catch(()=>{});
 if(created)await docker("dropdb","-U",user,"--if-exists","--force",destinationName).catch(()=>{});
 await docker("rm","-f",dump).catch(()=>{});
}
