import {z} from "zod";
import {guard,failure,HttpError} from "@/lib/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  try{
    guard(request);
    const p=new URL(request.url).searchParams;
    if(p.has("search")){
      const search=z.string().trim().min(2).max(100).parse(p.get("search"));
      const u=new URL("https://geocoding-api.open-meteo.com/v1/search");
      u.search=new URLSearchParams({name:search,count:"5",language:"en",format:"json"}).toString();
      const r=await fetch(u,{signal:AbortSignal.timeout(8000),next:{revalidate:3600}});
      if(!r.ok)throw new HttpError(502,"Location search unavailable. Try again.");
      const d=await r.json();
      return Response.json({locations:(d.results || []).map((x:{latitude:number;longitude:number;name:string;admin1?:string;country?:string})=>({latitude:x.latitude,longitude:x.longitude,name:[x.name,x.admin1,x.country].filter(Boolean).join(", ")}))});
    }
    if(!p.has("lat") || !p.has("lon")) return Response.json({current:null});
    const lat=z.coerce.number().min(-90).max(90).parse(p.get("lat"));
    const lon=z.coerce.number().min(-180).max(180).parse(p.get("lon"));
    if(!p.get("lat")?.trim() || !p.get("lon")?.trim())throw new HttpError(400,"Coordinates required.");
    const u=new URL("https://api.open-meteo.com/v1/forecast");
    u.search=new URLSearchParams({latitude:String(lat),longitude:String(lon),current:"temperature_2m,weather_code",timezone:"auto"}).toString();
    const r=await fetch(u,{signal:AbortSignal.timeout(8000),next:{revalidate:600}});
    if(!r.ok)throw new HttpError(502,"Weather unavailable. Try again.");
    const d=await r.json();
    return Response.json({current:d.current ?? null});
  }catch(e){return failure(e);}
}
