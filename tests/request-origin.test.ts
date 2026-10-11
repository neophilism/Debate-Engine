import test from "node:test";
import assert from "node:assert/strict";
import {isTrustedMutationOrigin} from "../packages/domain/request-origin.ts";
const base={origin:"https://public-debate-engine-preview.onrender.com",host:"public-debate-engine-preview.onrender.com",forwardedHost:null,forwardedProto:"https",environment:"production"};
test("genuine same-origin HTTPS mutation is allowed",()=>{
 assert.equal(isTrustedMutationOrigin(base),true);
 assert.equal(isTrustedMutationOrigin({...base,canonicalOrigin:base.origin}),true);
});
test("cross-origin, protocol downgrade, forwarded proxy disagreement and malformed headers are blocked",()=>{
 for(const v of [
  {...base,origin:"http://public-debate-engine-preview.onrender.com"},
  {...base,origin:"https://adversary.example"},
  {...base,origin:"https://public-debate-engine-preview.onrender.com/a"},
  {...base,origin:"https://public-debate-engine-preview.onrender.com?malicious=yes"},
  {...base,forwardedHost:"adversary.example"},
  {...base,forwardedHost:"example.org, public-debate-engine-preview.onrender.com"},
  {...base,forwardedProto:"http"},
  {...base,host:"public-debate-engine-preview.onrender.com, example.org"},
  {...base,canonicalOrigin:"https://other-site.example"},
  {...base,origin:null}
 ])assert.equal(isTrustedMutationOrigin(v),false,JSON.stringify(v));
});
test("plain HTTP local development only, never production",()=>{
 const x={...base,origin:"http://localhost:3000",host:"localhost:3000",forwardedProto:"http",environment:"development"};
 assert.equal(isTrustedMutationOrigin(x),true);
 assert.equal(isTrustedMutationOrigin({...x,environment:"production"}),false);
});
