#!/usr/bin/env node
/**
 * CI-ONLY simulated identity fixture.
 * Writes a replacement auth module into this disposable runner's working tree.
 * NEVER ship this generated file or use it on a hosted/staging/production app.
 * The real production module in Git is NEVER edited by this PR.
 */
import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
const expectedDatabase="postgresql://debate_ci:test_only_password@localhost:5432/debate_ci";
if(process.env.GITHUB_ACTIONS!=="true"||process.env.PDE_CI_PILOT_RUN!=="true"||
   process.env.DATABASE_URL!==expectedDatabase||
   process.env.NEON_AUTH_BASE_URL||process.env.NEON_AUTH_COOKIE_SECRET||
   !/^[0-9a-f]{64}$/.test(process.env.PDE_CI_AUTH_KEY||""))
 throw Error("Refusing to inject fixture identities outside the disposable, isolated public CI pilot.");
const filename=resolve(process.cwd(),"lib/auth/server.ts");
const original=await readFile(filename,"utf8");
if(!original.includes("createNeonAuth")||original.includes("PDE CI SIGNED SESSION FIXTURE"))
 throw Error("Unexpected production authentication module; refuse modification.");
const fixture="import \"server-only\";\n// PDE CI SIGNED SESSION FIXTURE: generated only on a disposable GitHub runner.\n// The repository never contains this module in its deployed application tree.\nimport {cookies} from \"next/headers\";\nimport {createHmac,timingSafeEqual} from \"node:crypto\";\nimport {createNeonAuth} from \"@neondatabase/auth/next/server\";\ntype Actor={id:string;email:string;name:string;emailVerified:boolean};\nconst ACTORS:Record<string,Actor>={\n reviewer:{id:\"00000000-0000-4000-8000-000000000001\",email:\"fixture-reviewer@example.invalid\",name:\"Fictional Independent Reviewer\",emailVerified:true},\n a:{id:\"00000000-0000-4000-8000-000000000002\",email:\"fixture-a@example.invalid\",name:\"Fictional Candidate A\",emailVerified:true},\n b:{id:\"00000000-0000-4000-8000-000000000003\",email:\"fixture-b@example.invalid\",name:\"Fictional Candidate B\",emailVerified:true}\n};\nfunction enabled(){\n return process.env.GITHUB_ACTIONS===\"true\"&&process.env.PDE_CI_PILOT_RUN===\"true\"&&\n process.env.DATABASE_URL===\"postgresql://debate_ci:test_only_password@localhost:5432/debate_ci\"&&\n /^[0-9a-f]{64}$/.test(process.env.PDE_CI_AUTH_KEY||\"\")&&!process.env.NEON_AUTH_BASE_URL;\n}\nexport function getAuthServer():ReturnType<typeof createNeonAuth>|null{return null;}\nexport async function getAuthenticatedUser(){\n if(!enabled())return null;\n const value=(await cookies()).get(\"pde_ci_session\")?.value||\"\";\n const i=value.indexOf(\".\");\n if(i<1)return null;\n const role=value.slice(0,i),signature=value.slice(i+1);\n if(!ACTORS[role]||!/^[a-f0-9]{64}$/.test(signature))return null;\n const expected=createHmac(\"sha256\",process.env.PDE_CI_AUTH_KEY!).update(\"ci-session:\"+role).digest();\n const received=Buffer.from(signature,\"hex\");\n if(!timingSafeEqual(expected,received))return null;\n return {...ACTORS[role]};\n}\nexport type Identity=NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>;\nexport function isPlatformAdmin(user:Identity){\n return enabled()&&user.emailVerified&&user.id===ACTORS.reviewer.id;\n}\n";
await writeFile(filename,fixture,{mode:0o600});
console.log("Installed signed fixture sessions in disposable CI checkout only (no test login route).");
