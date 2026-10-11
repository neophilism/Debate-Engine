import {redirect} from "next/navigation";
import Link from "next/link";
import {getAuthenticatedUser} from "../../../../lib/auth/server";
import PrivateReview from "./private-review";
export const dynamic="force-dynamic";
export default async function ReviewPage({params}:{params:Promise<{id:string}>}){
 const actor=await getAuthenticatedUser();
 if(!actor)redirect("/sign-in");
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))redirect("/workspace");
 return <div className="interior-page"><p className="eyebrow dark">PRIVATE WORKSPACE / PRE-PUBLICATION REVIEW</p><h1>Review your<br/><em>argument.</em></h1>
 <p className="interior-lead">Only you can see your private Debate Assistant feedback. Suggestions are optional and do not count toward public debate scores or determine inclusion in the reciprocal debate sequence.</p>
 <PrivateReview draftId={id}/><Link href="/workspace" className="inline-arrow">← Candidate workspace</Link>
 </div>;
}
