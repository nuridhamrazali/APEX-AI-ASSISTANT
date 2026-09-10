const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');const ts=require('typescript');
let spawns=0,hang=false;
function spawn(){
  spawns++;const c=new EventEmitter();c.killed=false;c.exitCode=null;
  c.stdout=new EventEmitter();c.stdout.setEncoding=()=>{};
  c.stderr={resume(){}};c.stdin=new EventEmitter();
  c.kill=()=>{c.killed=true;};
  c.stdin.write=text=>{const p=JSON.parse(text);if(!hang)setImmediate(()=>c.stdout.emit('data',JSON.stringify({text:p.prompt,harness:'hermes'})+'\n'));};
  return c;
}
const exp={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/hermes.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports:exp,require:n=>n==='node:child_process'?{spawn}:require(n),process,setTimeout,clearTimeout});
(async()=>{
  assert.equal((await exp.runHermes('one',[],'test')).text,'one');
  assert.equal((await exp.runHermes('two',[],'test')).text,'two');assert.equal(spawns,1);
  hang=true;const abort=new AbortController();const pending=exp.runHermes('stop',[],'test',abort.signal);
  abort.abort();await assert.rejects(pending,/stopped/);
  hang=false;await exp.runHermes('restart',[],'test');assert.equal(spawns,2);
  console.log('Passed: worker reuse, cancellation, fresh worker after stop.');
})().catch(e=>{console.error(e);process.exitCode=1});
