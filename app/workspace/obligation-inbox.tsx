import Link from "next/link";
import {database} from "../../lib/server/db";

type Obligation = {
  id:string; debate_id:string; debate_title:string; obligation_type:"review"|"reply";
  opened_at:Date; effective_due_at:Date|null; received_at:Date|null; state:string;
};

function label(state:string) {
  return ({open:"Response due",overdue:"No response received by the due date",
    fulfilled_on_time:"Completed on time",fulfilled_late:"Reply received late"} as Record<string,string>)[state] || state;
}

export default async function ObligationInbox({subjectId}:{subjectId:string}) {
  let obligations:Obligation[]=[];
  try {
    const result=await database().query<Obligation>(`
      WITH projected AS (
        SELECT ro.*,ro.due_at+COALESCE(sum(oa.seconds),0)*interval '1 second' AS effective_due_at
        FROM reply_obligations ro
        LEFT JOIN obligation_outage_adjustments oa ON oa.obligation_id=ro.id
        GROUP BY ro.id
      )
      SELECT p.id,p.debate_id,d.title AS debate_title,p.obligation_type,p.opened_at,
        p.effective_due_at,p.received_at,
        CASE WHEN p.received_at IS NOT NULL AND (p.effective_due_at IS NULL OR p.received_at<=p.effective_due_at) THEN 'fulfilled_on_time'
          WHEN p.received_at IS NOT NULL THEN 'fulfilled_late'
          WHEN p.effective_due_at IS NOT NULL AND now()>p.effective_due_at THEN 'overdue' ELSE 'open' END AS state
      FROM projected p
      JOIN candidacies c ON c.id=p.obligated_candidacy_id
      JOIN accounts a ON a.id=c.account_id
      JOIN debates d ON d.id=p.debate_id
      WHERE a.identity_provider='neon-auth' AND a.external_subject=$1
      ORDER BY (p.received_at IS NULL) DESC,p.effective_due_at NULLS LAST,p.opened_at DESC
      LIMIT 30`,[subjectId]);
    obligations=result.rows;
  } catch {
    return <section className="workspace-panel"><p className="small-label">DEBATE DEADLINES</p><p>Deadline details are temporarily unavailable.</p></section>;
  }
  return <section className="workspace-panel admin-panel">
    <p className="small-label">DEBATE DEADLINES</p>
    <h2>Your review and reply obligations</h2>
    {obligations.length===0?<p>No debate obligations have been recorded.</p>:obligations.map(item=><article className="mini-card" key={item.id}>
      <strong>{item.debate_title}</strong>
      <p>{label(item.state)}{item.effective_due_at?<> · <time dateTime={item.effective_due_at.toISOString()}>{item.effective_due_at.toISOString().replace("T"," ").replace(".000Z"," UTC")}</time></>:null}</p>
      {!item.received_at&&<Link className="inline-arrow" href={item.obligation_type==="review"?`/debates/${item.debate_id}`:`/debates/${item.debate_id}/respond`}>
        {item.obligation_type==="review"?"Review the response ↗":"Prepare a reply ↗"}
      </Link>}
    </article>)}
  </section>;
}
