import {test,after} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {GET as weather} from "../app/api/weather/route";
import {GET as tasks} from "../app/api/tasks/route";
import {session} from "../lib/auth";
import {db} from "../lib/store";
const temp=mkdtempSync(join(tmpdir(),"apex-daily-"));
process.env.DATA_DIR=temp;process.env.APP_PASSWORD="testing-password";process.env.SESSION_SECRET="x".repeat(64);
after(()=>{db().close();rmSync(temp,{recursive:true,force:true});});
const req=(path:string)=>new Request("http://localhost:3000"+path,{headers:{cookie:`apex_session=${session()}`}});
test("weather rejects invalid coordinates before network use and requires auth",async()=>{
 assert.equal((await weather(new Request("http://localhost/api/weather?lat=0&lon=0"))).status,401);
 assert.equal((await weather(req("/api/weather?lat=91&lon=0"))).status,400);
 assert.equal((await weather(req("/api/weather?lat=&lon=0"))).status,400);
});
test("weather handles selected coordinates and geocoding without key",async()=>{
 const original=fetch;const urls:string[]=[];
 globalThis.fetch=async url=>{urls.push(String(url));return Response.json(urls.length===1?{results:[{name:"Gurun",admin1:"Kedah",country:"Malaysia",latitude:5.8,longitude:100.5}]}:{current:{temperature_2m:29,weather_code:3}});};
 try{
  const found=await(await weather(req("/api/weather?search=Gurun"))).json();assert.match(found.locations[0].name,/Kedah/);
  const data=await(await weather(req("/api/weather?lat=5.8&lon=100.5"))).json();assert.equal(data.current.temperature_2m,29);
  assert.equal(new URL(urls[1]).searchParams.get("latitude"),"5.8");
 }finally{globalThis.fetch=original;}
});
test("today range uses inclusive start, exclusive end and excludes cancelled events",async()=>{
 const start=Date.now()+86400000,end=start+25*3600000;
 const add=db().prepare("INSERT INTO tasks(id,title,due,status) VALUES(?,?,?,?)");
 add.run("before","Before",start-1,"pending");add.run("today","Today",start,"pending");
 add.run("cancelled","Cancelled",start+1,"cancelled");add.run("next","Next",end,"pending");
 const r=await tasks(req(`/api/tasks?start=${start}&end=${end}`));assert.deepEqual((await r.json()).tasks.map((t:any)=>t.id),["today"]);
 assert.equal((await tasks(req(`/api/tasks?start=${start}&end=${start+30*3600000}`))).status,400);
});
