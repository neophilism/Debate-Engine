import {redirect,notFound} from "next/navigation";
import {getAuthenticatedUser} from "../../../../lib/auth/server";
import MediaWorkroom from "./workroom-client";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{branchId:string}>}){
 const actor=await getAuthenticatedUser();
 if(!actor)redirect("/sign-in");
 const {branchId}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(branchId))notFound();
 return <MediaWorkroom branchId={branchId}/>;
}
