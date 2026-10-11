import test from "node:test";
import assert from "node:assert/strict";
import {normalizeCaptions} from "../packages/domain/captions.ts";
test("normalizes two time-coded captions",()=>{
 const o=normalizeCaptions("WEBVTT\n\n00:00:01.000 --> 00:00:03.500\nA direct answer\n\n00:00:04.000 --> 00:00:05.000\nAnother point");
 assert.equal(o.duration,5);
 assert.match(o.searchableText,/Another point/);
 assert.match(o.webvtt,/WEBVTT/);
});
test("rejects caption markup and invalid times",()=>{
 assert.throws(()=>normalizeCaptions("WEBVTT\n\n00:00:01.000 --> 00:00:03.000\n<script>attack</script>"));
 assert.throws(()=>normalizeCaptions("WEBVTT\n\n00:00:03.000 --> 00:00:02.000\nReversed"));
});
test("requires cues and header",()=>assert.throws(()=>normalizeCaptions("WEBVTT")));
