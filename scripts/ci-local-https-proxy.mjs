#!/usr/bin/env node
/**
 * CI-only local HTTPS reverse proxy to exercise PRODUCTION same-origin rules
 * without changing the deployed app or enabling HTTP mutations in production.
 * Uses a generated one-day self-signed certificate from the disposable runner.
 */
import https from "node:https";
import http from "node:http";
import {readFile} from "node:fs/promises";
const expected="postgresql://debate_ci:test_only_password@localhost:5432/debate_ci";
if(process.env.GITHUB_ACTIONS!=="true"||process.env.PDE_CI_PILOT_RUN!=="true"||
   process.env.DATABASE_URL!==expected||process.env.NEON_AUTH_BASE_URL)
 throw Error("Local HTTPS test proxy cannot run outside isolated CI.");
const cert=await readFile("/tmp/pde-ci-tls-cert.pem");
const key=await readFile("/tmp/pde-ci-tls-key.pem");
const server=https.createServer({cert,key},(request,response)=>{
 const upstream=http.request({
  hostname:"127.0.0.1",port:3100,method:request.method,path:request.url,
  headers:{...request.headers,host:"127.0.0.1:3443",
   "x-forwarded-host":"127.0.0.1:3443","x-forwarded-proto":"https"}
 },upstreamResponse=>{
  response.writeHead(upstreamResponse.statusCode||502,upstreamResponse.headers);
  upstreamResponse.pipe(response);
 });
 upstream.on("error",()=>{
  if(!response.headersSent)response.writeHead(502,{"content-type":"text/plain"});
  response.end("Fixture upstream unavailable.");
 });
 request.pipe(upstream);
});
server.listen(3443,"127.0.0.1",()=>console.log("CI-only HTTPS origin listening on localhost."));
