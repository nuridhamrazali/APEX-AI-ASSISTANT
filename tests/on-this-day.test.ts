import {test} from "node:test";
import assert from "node:assert/strict";
import {GET} from "../app/api/on-this-day/route";
import {session} from "../lib/auth";
process.env.APP_PASSWORD="testing-password";process.env.SESSION_SECRET="x".repeat(64);
const req=(q:string)=>new Request('http://localhost/api/on-this-day?'+q,{headers:{cookie:`apex_session=${session()}`}});
test('history validates real calendar dates, including leap day',async()=>{
 assert.equal((await GET(req('month=2&day=30'))).status,400);
 const original=fetch;
 globalThis.fetch=async u=>{assert.match(String(u),/events\/02\/29$/);return Response.json({events:[]});};
 try{assert.equal((await GET(req('month=2&day=29'))).status,200);}finally{globalThis.fetch=original;}
});
test('history returns year, text and a safe Wikipedia source; upstream failures are explicit',async()=>{
 const original=fetch;
 globalThis.fetch=async()=>Response.json({events:[{year:1900,text:'Test event',pages:[{content_urls:{desktop:{page:'https://en.wikipedia.org/wiki/Test'}}}]},{year:1901,text:'Unsafe link',pages:[{content_urls:{desktop:{page:'javascript:alert(1)'}}}]}]});
 try{
 const d=await(await GET(req('month=9&day=23'))).json();assert.equal(d.events.length,1);assert.equal(d.events[0].year,1900);
 globalThis.fetch=async()=>new Response('',{status:503});assert.equal((await GET(req('month=9&day=23'))).status,502);
 }finally{globalThis.fetch=original;}
});
