import {test} from "node:test";
import assert from "node:assert/strict";
import {openaiTurn} from "../lib/openai-turn";
const signal=()=>new AbortController().signal;
const messages=[{role:"user",content:"What time is it?"}];
function sse(events:unknown[]) {return new Response(events.map(e=>"data: "+JSON.stringify(e)+"\n\n").join(""));}

test("Astra low streams tools, preserves reasoning and call IDs", async()=>{
 process.env.OPENAI_API_KEY="test-only";
 const original=globalThis.fetch;
 let rounds=0;
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,"https://api.openai.com/v1/responses");
  const body=JSON.parse(String(options?.body));
  assert.equal(body.model,"gpt-6-astra"); assert.equal(body.reasoning.effort,"low");
  assert.equal(body.store,false);
  rounds++;
  if(rounds===1) return sse([{type:"response.completed",response:{output:[
   {type:"reasoning",id:"rs1",summary:[],encrypted_content:"opaque"},
   {type:"function_call",id:"fc1",call_id:"call1",name:"current_time",arguments:'{"timeZone":"UTC"}'}
  ]}}]);
  assert.ok(body.input.some((x:any)=>x.encrypted_content==="opaque"));
  const result=body.input.at(-1);
  assert.equal(result.type,"function_call_output");assert.equal(result.call_id,"call1");
  assert.ok(JSON.parse(result.output));
  return sse([{type:"response.output_text.delta",delta:"Time checked."},{type:"response.completed",response:{output:[]}}]);
 };
 try {
  const events=[];
  const gen=openaiTurn(messages,signal());
  let item;
  do {item=await gen.next();if(!item.done) events.push(item.value);} while(!item.done);
  assert.equal(item.value,"Time checked.");
  assert.equal(rounds,2);
  assert.ok(events.find(e=>e.type==="tool.finished"&&e.callId==="call1"&&e.ok));
 } finally {globalThis.fetch=original;}
});
test("Astra rejects incomplete, truncated, and HTTP failure streams",async()=>{
 process.env.OPENAI_API_KEY="test-only";
 const original=globalThis.fetch;
 try {
  for(const response of [
   sse([{type:"response.incomplete"}]),
   sse([{type:"response.output_text.delta",delta:"partial"}]),
   new Response("private upstream error",{status:401})
  ]) {
   globalThis.fetch=async()=>response;
   await assert.rejects(async()=>{for await(const _ of openaiTurn(messages,signal())){}});
  }
 } finally {globalThis.fetch=original;}
});
test("Astra missing key fails before network access",async()=>{
 delete process.env.OPENAI_API_KEY;
 await assert.rejects(async()=>{for await(const _ of openaiTurn(messages,signal())){}},/OPENAI_API_KEY/);
});
