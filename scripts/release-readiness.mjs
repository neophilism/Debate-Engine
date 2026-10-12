#!/usr/bin/env node
/** Read-only, fail-closed production acceptance checker. No deployment side effects. */
import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {evaluateRelease} from "../packages/domain/release-gates.mjs";
const root=resolve(process.cwd(),"registry");
const roadmap=JSON.parse(await readFile(resolve(root,"roadmap.json"),"utf8"));
const evidence=JSON.parse(await readFile(resolve(root,"production-acceptance.json"),"utf8"));
const result=evaluateRelease({roadmap,evidence});
console.log(JSON.stringify(result,null,2));
if(!result.ready)process.exitCode=2;
