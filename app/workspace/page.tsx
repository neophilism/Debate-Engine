import { redirect } from "next/navigation";
import { getAuthenticatedUser, isPlatformAdmin } from "../../lib/auth/server";
import CandidateWorkspace from "./workspace-client";
export const dynamic="force-dynamic";
export default async function WorkspacePage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in");
  return <CandidateWorkspace displayName={user.name} admin={isPlatformAdmin(user)} verifiedEmail={user.emailVerified}/>;
}
