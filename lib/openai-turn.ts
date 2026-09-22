import { createParser } from "eventsource-parser";
import { tools, execute } from "./tools";
import type { ModelMessage } from "./model";
import type { RunEvent } from "./turn";

type Item = { type: string; [key: string]: unknown };
type Event = { type: string; delta?: string; response?: { output: Item[] } };
export async function* openaiTurn(messages: ModelMessage[], signal: AbortSignal): AsyncGenerator<RunEvent, string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Set OPENAI_API_KEY on the server to use Astra.");
  const effort = process.env.OPENAI_REASONING_EFFORT || "low";
  if (!["low", "medium", "high", "xhigh", "max"].includes(effort))
    throw new Error("Invalid OPENAI_REASONING_EFFORT.");
  const input: unknown[] = messages.map(({role,content})=>({role,content}));
  let answer = "", count = 0;
  for (let round = 0; round < 5; round++) {
    signal.throwIfAborted();
    yield { type: "model.started" };
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-6-astra",
        reasoning: { effort }, input, stream: true, store: false,
        include: ["reasoning.encrypted_content"], max_output_tokens: 4096,
        tools: tools.map(({function:f})=>({
          type: "function", name:f.name, description:f.description,
          parameters:f.parameters, strict:false
        }))
      })
    });
    if (!response.ok || !response.body)
      throw new Error(`OpenAI returned HTTP ${response.status}. Check API key, model access, and billing.`);
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    const events: Event[] = [];
    const parser = createParser({
      onEvent: ({data}) => { if(data !== "[DONE]") events.push(JSON.parse(data)); },
      onError: () => { throw new Error("Invalid OpenAI stream"); },
      maxBufferSize: 1048576,
    });
    let output: Item[] | undefined;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        parser.feed(part.value);
        for (const event of events.splice(0)) {
          if (event.type === "response.output_text.delta" || event.type === "response.refusal.delta") {
            answer += event.delta || "";
            yield {type:"text.delta",text:event.delta || ""};
          } else if (event.type === "response.completed") {
            output = event.response?.output;
          } else if (["response.failed","response.incomplete","error"].includes(event.type)) {
            throw new Error("OpenAI response failed or reached its output limit. Try a shorter request.");
          }
        }
        if (output) break;
      }
    } finally {
      await reader.cancel().catch(()=>{});
      reader.releaseLock();
    }
    if (!output) throw new Error("OpenAI connection ended before completion");
    // Preserve reasoning (including encrypted content) and original function call IDs.
    // Stateless Responses accepts its output items as input on the next tool round.
    input.push(...output);
    const calls = output.filter(item=>item.type === "function_call");
    if (!calls.length) {
      if (!answer.trim()) throw new Error("Model returned no answer.");
      return answer;
    }
    for (const call of calls) {
      if (++count > 8) throw new Error("Tool limit reached");
      const name = String(call.name), callId = String(call.call_id);
      yield {type:"tool.started",name,callId,helper:
        name==="search_memory"?"memory":name==="search_encyclopedia"?"researcher":name==="list_reminders"?"calendar":"chief_of_staff"};
      let result: unknown, ok=true;
      try {
        result = await execute(name, JSON.parse(String(call.arguments)), AbortSignal.any([signal,AbortSignal.timeout(10000)]));
      } catch {
        signal.throwIfAborted();
        ok=false; result={error:"Tool failed or arguments invalid. Do not claim success."};
      }
      yield {type:"tool.finished",name,callId,ok};
      input.push({type:"function_call_output",call_id:callId,output:JSON.stringify(result).slice(0,12000)});
    }
  }
  throw new Error("Execution round limit reached");
}
