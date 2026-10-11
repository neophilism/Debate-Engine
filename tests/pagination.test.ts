import test from "node:test";
import assert from "node:assert/strict";
import {encodeDebateCursor,decodeDebateCursor} from "../packages/domain/pagination.ts";
const id="123e4567-e89b-42d3-a456-426614174000";
test("paginates stable timestamps and UUID tie breaks",()=>{
 const cursor=encodeDebateCursor(new Date("2026-10-11T12:34:56.000Z"),id);
 assert.deepEqual(decodeDebateCursor(cursor),{publishedAt:"2026-10-11T12:34:56.000Z",id});
});
test("invalid cursors and dates fail closed",()=>{
 for(const value of ["","!!!!","a".repeat(500),"e30","bm90LWpzb24"])assert.throws(()=>decodeDebateCursor(value));
 assert.throws(()=>encodeDebateCursor("yesterday",id));
});
