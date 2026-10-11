import DraftComposer from "../../../workspace/draft-composer";
export default async function RespondPage({params}:{params:Promise<{id:string}>}){return <DraftComposer kind="response" debateId={(await params).id}/>;}
