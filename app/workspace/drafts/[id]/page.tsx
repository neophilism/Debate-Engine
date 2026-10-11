import PrivateDraftAccount from "../private-draft-account";
export default async function PrivateDraftPage({params}:{params:Promise<{id:string}>}){
 return <PrivateDraftAccount draftId={(await params).id}/>;
}
