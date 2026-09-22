import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const data=mkdtempSync(join(tmpdir(),'apex-http-'));
let round=0;
const mock=createServer(async(req,res)=>{
 if(req.url==='/api/tags'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({models:[{name:'qwen3:4b'}]}));return;}
 let body='';for await(const c of req)body+=c;const request=JSON.parse(body);round++;
 res.setHeader('Content-Type','application/x-ndjson');
 if(request.messages.at(-1).role==='tool')res.end(JSON.stringify({message:{content:'Verified test answer.'},done:true})+'\n');
 else res.end(JSON.stringify({message:{content:'',tool_calls:[{function:{name:'current_time',arguments:{timeZone:'Asia/Kuala_Lumpur'}}}]},done:true})+'\n');
});
await new Promise(resolve=>mock.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:3105',password=randomBytes(18).toString('hex');
const app=spawn(process.execPath,['scripts/start.mjs'],{env:{...process.env,PORT:'3105',BIND_HOST:'127.0.0.1',APP_ORIGIN:base,DATA_DIR:data,APP_PASSWORD:password,SESSION_SECRET:randomBytes(32).toString('hex'),OLLAMA_BASE_URL:`http://127.0.0.1:${mock.address().port}`},stdio:['ignore','pipe','pipe']});
const deadline=setTimeout(()=>{app.kill();mock.close();console.error('Server startup timed out');process.exit(1);},30000);
try{
 await new Promise((resolve,reject)=>{app.stdout.on('data',c=>{if(c.toString().includes('Ready'))resolve();});app.stderr.on('data',c=>process.stderr.write(c));app.once('exit',code=>reject(new Error(`Server exited ${code}`)));});
 let r=await fetch(base+'/api/memory');assert.equal(r.status,401);
 r=await fetch(base+'/api/auth',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({password})});assert.equal(r.status,200);
 const cookie=r.headers.get('set-cookie').split(';')[0],headers={'Content-Type':'application/json',Origin:base,Cookie:cookie};
 r=await fetch(base+'/api/memory',{method:'POST',headers,body:JSON.stringify({title:'Smoke test',content:'Kubernetes test note'})});assert.equal(r.status,200);const note=await r.json();
 r=await fetch(base+'/api/memory',{headers});assert.ok((await r.json()).notes.some(n=>n.id===note.id));
 r=await fetch(base+'/api/memory',{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:'{}'});assert.equal(r.status,403);
 const conversationId=randomUUID();r=await fetch(base+'/api/apex',{method:'POST',headers,body:JSON.stringify({prompt:'Use the time tool',conversationId})});assert.equal(r.status,200);const events=await r.text();assert.match(events,/tool.finished/);assert.match(events,/Verified test answer/);assert.match(events,/run.completed/);assert.equal(round,2);
 r=await fetch(base+'/api/history?id='+conversationId,{headers});assert.equal((await r.json()).messages.at(-1).content,'Verified test answer.');
 r=await fetch(base+'/api/memory',{method:'DELETE',headers,body:JSON.stringify({id:note.id})});assert.equal(r.status,200);
 r=await fetch(base+'/',{headers});assert.equal(r.status,200);assert.match(await r.text(),/PERSONAL ASSISTANT/);
 console.log('HTTP smoke passed: session, private API, memory CRUD, origin protection, SSE tool loop, persisted history, authenticated HUD HTML. Provider is mocked.');
}finally{clearTimeout(deadline);app.kill('SIGTERM');mock.close();await new Promise(resolve=>app.once('exit',resolve));rmSync(data,{recursive:true,force:true});}
