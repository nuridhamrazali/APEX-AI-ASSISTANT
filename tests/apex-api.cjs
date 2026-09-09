// Contract tests with mocked paid providers; no API keys or network needed.
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
function load(path, requireMock, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,
    {exports,require:requireMock,...globals});
  return exports;
}
const personality = load('lib/personality.ts', require);
const env = {};
const originGuard = load('lib/request-origin.ts', require, {URL});
let fishStatus = true, llmFailure = false, sent, generation;
const api = load('app/api/apex/route.ts', name => {
  if (name === '@/lib/request-origin') return originGuard;
  if (name === '@/lib/personality') return personality;
  if (name === 'next/server') return {NextResponse:{json:(body,options)=>({body,status:options?.status||200})}};
  if (name === '@google/genai') return {GoogleGenAI:class { models={generateContent:async args=>{ generation=args; if(llmFailure) throw Error(); return {text:'Here is your draft.'}; }}; }};
  throw Error(name);
}, {process:{env},Buffer,AbortSignal, fetch:async (url, options)=>{sent={url,...options};return {ok:fishStatus,arrayBuffer:async()=>Buffer.from('mock mp3')}}});
function req(body, origin='http://localhost:3000') {return {headers:new Headers({origin}),nextUrl:new URL('http://localhost:3000/api/apex'),text:async()=>JSON.stringify(body)}}
(async()=>{
  const internal = new URL('http://0.0.0.0:3000/api/apex');
  assert.equal(originGuard.allowedOrigin(new Headers({origin:'http://localhost:3000',host:'localhost:3000'}),internal),true);
  assert.equal(originGuard.allowedOrigin(new Headers({origin:'http://127.0.0.1:3000',host:'127.0.0.1:3000'}),internal),true);
  assert.equal(originGuard.allowedOrigin(new Headers({origin:'https://evil.example',host:'localhost:3000'}),internal),false);
  assert.equal(originGuard.allowedOrigin(new Headers({origin:'http://localhost:4000',host:'localhost:3000'}),internal),false);
  assert.equal(originGuard.allowedOrigin(new Headers({origin:'null',host:'localhost:3000'}),internal),false);
  assert.equal(originGuard.allowedOrigin(new Headers({origin:'https://apex.example',host:'internal:3000'}),internal,'https://apex.example'),true);

  assert.equal((await api.POST(req({prompt:''}))).status,400);
  assert.equal((await api.POST(req({prompt:'hello'},'https://other.example'))).status,403);
  assert.equal((await api.POST(req({prompt:'hello'}))).status,503);
  env.GEMINI_API_KEY='test';
  let r=await api.POST(req({prompt:'hello',personality:'focused',history:[{role:'assistant',text:'Earlier response'}]}));
  assert.equal(r.body.text,'Here is your draft.');assert.ok(r.body.voiceError);
  assert.ok(generation.config.systemInstruction.includes('Skip jokes'));
  assert.equal(generation.contents[0].role,'model');
  env.FISH_AUDIO_API_KEY='test';
  r=await api.POST(req({prompt:'hello'}));
  assert.equal(r.body.audioMimeType,'audio/mpeg');assert.ok(r.body.audioBase64);
  assert.equal(JSON.parse(sent.body).reference_id,'e6b437b389c34041856d56d3cde1f494');
  assert.equal(sent.headers.Authorization,'Bearer test');
  fishStatus=false;r=await api.POST(req({prompt:'hello'}));assert.ok(r.body.voiceError);assert.equal(r.body.text,'Here is your draft.');
  llmFailure=true;assert.equal((await api.POST(req({prompt:'hello'}))).status,502);
  assert.ok(!personality.spokenText('```js\nrun()\n```').includes('executed'));
  console.log('Passed: validation, origin, missing credentials, history/personality, Fish voice/MIME, provider failures, honest code narration.');
})().catch(e=>{console.error(e);process.exitCode=1});
