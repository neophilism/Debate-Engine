import test from "node:test";
import assert from "node:assert/strict";
import {escapeXml,rssFeed} from "../packages/domain/xml.ts";
test("feed escapes hostile candidate titles instead of injecting markup",()=>{
 const result=rssFeed("https://example.org/press",[{id:"a&b",title:"<script>\"x\"</script>",description:"A & B",url:"https://example.org/debates/1",publishedAt:"2026-10-11T00:00:00Z"}]);
 assert.match(result,/<title>&lt;script&gt;&quot;x&quot;&lt;\/script&gt;<\/title>/);
 assert.ok(!result.includes("<script>"));
 assert.match(result,/A &amp; B/);
 assert.match(result,/<guid isPermaLink="false">a&amp;b<\/guid>/);
});
test("escapes all five reserved XML entities",()=>{
 assert.equal(escapeXml(String.fromCharCode(38,60,62,34,39)),"&amp;&lt;&gt;&quot;&apos;");
});
