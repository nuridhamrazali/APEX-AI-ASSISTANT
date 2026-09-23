import {z} from "zod";
import {guard,failure,HttpError} from "@/lib/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const input=z.object({month:z.coerce.number().int().min(1).max(12),day:z.coerce.number().int().min(1).max(31)})
 .refine(({month,day})=>new Date(Date.UTC(2000,month-1,day)).getUTCMonth()===month-1);
const event=z.object({year:z.number().int(),text:z.string(),pages:z.array(z.object({content_urls:z.object({desktop:z.object({page:z.string()})}).optional()})).optional()});
export async function GET(req:Request){
 try{
  guard(req);
  const p=new URL(req.url).searchParams;
  const {month,day}=input.parse({month:p.get("month"),day:p.get("day")});
  const url=`https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${String(month).padStart(2,"0")}/${String(day).padStart(2,"0")}`;
  const r=await fetch(url,{headers:{"User-Agent":"APEXAssistant/2.0 (https://github.com/nuridhamrazali/APEX-AI-ASSISTANT)",Accept:"application/json"},signal:AbortSignal.timeout(8000),next:{revalidate:21600}});
  if(!r.ok)throw new HttpError(502,"Historical events unavailable. Please try again.");
  const data=await r.json();
  if(!Array.isArray(data.events))throw new HttpError(502,"Historical events unavailable. Please try again.");
  const events=data.events.flatMap((raw:unknown)=>{
   const e=event.safeParse(raw);if(!e.success)return [];
   const source=e.data.pages?.map(p=>p.content_urls?.desktop.page).find((s):s is string=>{
    if(!s)return false;try{const u=new URL(s);return u.protocol==="https:" && u.hostname==="en.wikipedia.org" && u.pathname.startsWith("/wiki/");}catch{return false;}
   });
   if(!source)return [];
   return [{year:e.data.year,text:e.data.text,source}];
  }).slice(0,5);
  return Response.json({month,day,events,attribution:"Wikipedia contributors",license:"https://creativecommons.org/licenses/by-sa/4.0/"});
 }catch(e){return failure(e);}
}
