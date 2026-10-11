import "server-only";
import {transaction,database} from "./db";
import {HttpError} from "./http";

/** Delegates never receive the immutable-video publication or candidate-verification privileges. */
export const delegatedRoles=["editor","publisher"] as const;
export type DelegatedRole=typeof delegatedRoles[number];
export async function listCampaignMembers(candidacyId:string,subject:string){
 const allowed=await database().query("SELECT 1 FROM candidacies c JOIN accounts a ON a.id=c.account_id WHERE c.id=$1 AND a.external_subject=$2 AND a.identity_provider='neon-auth'",[candidacyId,subject]);
 if(!allowed.rowCount)throw new HttpError(403,"Only the account holder controlling the candidacy can view campaign access.");
 const q=await database().query("SELECT m.id,m.role,m.granted_at,m.revoked_at,a.display_name,a.id AS account_id FROM campaign_memberships m JOIN accounts a ON a.id=m.account_id WHERE m.candidacy_id=$1 ORDER BY m.granted_at DESC LIMIT 200",[candidacyId]);
 return q.rows;
}
export async function grantCampaignAccess(candidacyId:string,subject:string,targetSubject:string,role:DelegatedRole){
 return transaction(async db=>{
  const owner=await db.query<{account_id:string}>("SELECT c.account_id FROM candidacies c JOIN accounts a ON a.id=c.account_id WHERE c.id=$1 AND a.external_subject=$2 AND a.identity_provider='neon-auth' FOR UPDATE OF c",[candidacyId,subject]);
  if(!owner.rowCount)throw new HttpError(403,"Only the verified candidacy account owner may grant access.");
  const other=await db.query<{id:string}>("SELECT id FROM accounts WHERE identity_provider='neon-auth' AND external_subject=$1 AND status='active'",[targetSubject]);
  if(!other.rowCount)throw new HttpError(404,"The intended delegate must already have an account.");
  if(other.rows[0].id===owner.rows[0].account_id)throw new HttpError(400,"The owner cannot delegate to themselves.");
  const existing=await db.query("SELECT 1 FROM campaign_memberships WHERE candidacy_id=$1 AND account_id=$2 AND role=$3 AND revoked_at IS NULL",[candidacyId,other.rows[0].id,role]);
  if(existing.rowCount)throw new HttpError(409,"That delegate already has this role.");
  const result=await db.query<{id:string}>("INSERT INTO campaign_memberships(candidacy_id,account_id,role,granted_by) VALUES($1,$2,$3,$4) RETURNING id",[candidacyId,other.rows[0].id,role,owner.rows[0].account_id]);
  await db.query("INSERT INTO audit_events(actor_account_id,action,target_kind,target_id,context) VALUES($1,'campaign_access_granted','campaign_membership',$2,$3::jsonb)",[owner.rows[0].account_id,result.rows[0].id,JSON.stringify({candidacyId,role})]);
  return result.rows[0];
 });
}
export async function revokeCampaignAccess(candidacyId:string,subject:string,membershipId:string){
 return transaction(async db=>{
  const owner=await db.query<{account_id:string}>("SELECT c.account_id FROM candidacies c JOIN accounts a ON a.id=c.account_id WHERE c.id=$1 AND a.external_subject=$2 AND a.identity_provider='neon-auth' FOR UPDATE OF c",[candidacyId,subject]);
  if(!owner.rowCount)throw new HttpError(403,"Only the candidacy owner may revoke access.");
  const membership=await db.query<{id:string}>("UPDATE campaign_memberships SET revoked_at=now() WHERE id=$1 AND candidacy_id=$2 AND role IN('editor','publisher') AND revoked_at IS NULL RETURNING id",[membershipId,candidacyId]);
  if(!membership.rowCount)throw new HttpError(404,"Active campaign delegate grant not found.");
  await db.query("INSERT INTO audit_events(actor_account_id,action,target_kind,target_id) VALUES($1,'campaign_access_revoked','campaign_membership',$2)",[owner.rows[0].account_id,membershipId]);
  return {revoked:true};
 });
}
