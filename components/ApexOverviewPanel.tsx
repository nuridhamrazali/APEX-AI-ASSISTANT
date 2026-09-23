"use client";
import {useEffect,useState} from "react";
type Place={name:string;latitude:number;longitude:number};
type Task={id:string;title:string;due:number;status:string};
const codes:Record<number,string>={0:"Clear",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Snow",73:"Snow",75:"Heavy snow",80:"Rain showers",81:"Rain showers",82:"Heavy showers",95:"Thunderstorm",96:"Thunderstorm",99:"Thunderstorm"};
async function get(url:string,signal?:AbortSignal){
 const r=await fetch(url,{signal});const d=await r.json();if(!r.ok)throw new Error(d.error || "Request unavailable");return d;
}
export default function ApexOverviewPanel(){
 const [now,setNow]=useState<Date|null>(null),[place,setPlace]=useState<Place|null>(null);
 const [weather,setWeather]=useState<{temperature_2m:number;weather_code:number}|null>(null);
 const [weatherError,setWeatherError]=useState(""),[editing,setEditing]=useState(false),[query,setQuery]=useState("");
 const [locations,setLocations]=useState<Place[]>([]),[locationError,setLocationError]=useState("");
 const [tasks,setTasks]=useState<Task[]>([]),[taskError,setTaskError]=useState(""),[loadingTasks,setLoadingTasks]=useState(true);
 useEffect(()=>{
  setNow(new Date());const t=setInterval(()=>setNow(new Date()),1000);
  try{const p=JSON.parse(localStorage.getItem("apex.location") || "null");if(p && typeof p.name==="string" && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude)<=90 && Math.abs(p.longitude)<=180)setPlace(p);}catch{}
  return ()=>clearInterval(t);
 },[]);
 useEffect(()=>{
  if(!place)return;
  const controller=new AbortController();setWeather(null);setWeatherError("");
  const load=()=>get(`/api/weather?lat=${place.latitude}&lon=${place.longitude}`,controller.signal)
   .then(d=>{setWeather(d.current);setWeatherError(d.current?"":"Weather unavailable");})
   .catch(()=>{if(!controller.signal.aborted){setWeather(null);setWeatherError("Weather unavailable");}});
  void load();const timer=setInterval(load,600000);return ()=>{controller.abort();clearInterval(timer);};
 },[place]);
 const day=now?.toLocaleDateString();
 useEffect(()=>{
  if(!day)return;
  const controller=new AbortController();
  const load=()=>{
   const start=new Date();start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);
   return get(`/api/tasks?start=${start.getTime()}&end=${end.getTime()}`,controller.signal)
    .then(d=>{setTasks(d.tasks);setTaskError("");setLoadingTasks(false);})
    .catch(()=>{if(!controller.signal.aborted){setTaskError("Could not load today's events");setLoadingTasks(false);}});
  };
  void load();const timer=setInterval(load,10000);window.addEventListener("apex:tasks-updated",load);
  return ()=>{controller.abort();clearInterval(timer);window.removeEventListener("apex:tasks-updated",load);};
 },[day]);
 function choose(p:Place){setPlace(p);localStorage.setItem("apex.location",JSON.stringify(p));setEditing(false);setLocationError("");setLocations([]);}
 return <aside className="apex-overview daily-overview" aria-label="Daily overview">
  <div className="overview-filament"/><small className="overview-heading">OVERVIEW</small>
  <div className="overview-clock"><time>{now?.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}) || "--:--"}</time><span>{weather ? `${Math.round(weather.temperature_2m)}°C` : "—"}</span></div>
  <div className="overview-date">{now?.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}) || "Loading date"}</div>
  <button className="overview-location" onClick={()=>setEditing(v=>!v)} aria-expanded={editing}>{place?.name || "Set location"}</button>
  <p className="overview-weather">{weatherError || (weather ? codes[weather.weather_code] || "Weather conditions unavailable" : place ? "Loading weather…" : "Choose a location for weather")}</p>
  {place && <a className="weather-credit" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Weather by Open-Meteo</a>}
  {editing && <div className="location-picker">
   <form onSubmit={async e=>{e.preventDefault();setLocationError("");setLocations([]);try{const d=await get(`/api/weather?search=${encodeURIComponent(query)}`);setLocations(d.locations);if(!d.locations.length)setLocationError("No locations found");}catch(e){setLocationError((e as Error).message);}}}>
    <label>City<input value={query} onChange={e=>setQuery(e.target.value)} minLength={2} maxLength={100} required placeholder="Search city"/></label><button>Search</button>
   </form>
   {locations.map(p=><button key={`${p.latitude},${p.longitude}`} onClick={()=>choose(p)}>{p.name}</button>)}
   <button onClick={()=>{setLocationError("");if(!navigator.geolocation){setLocationError("Device location unavailable. Search a city instead.");return;}navigator.geolocation.getCurrentPosition(p=>choose({name:"Current location",latitude:Math.round(p.coords.latitude*100)/100,longitude:Math.round(p.coords.longitude*100)/100}),()=>setLocationError("Location unavailable. Search a city instead."),{timeout:10000,maximumAge:600000});}}>Use device location</button>
   {locationError && <p role="alert">{locationError}</p>}
  </div>}
  <section className="overview-events" aria-label="Today's events"><h2>ON THIS DAY</h2><small>Today’s events · local time</small>
   {taskError ? <p role="status">{taskError}</p> : loadingTasks ? <p>Loading events…</p> : tasks.length ? <ol>{tasks.map(t=><li key={t.id}><time>{new Date(t.due).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</time><span>{t.title}<small>{t.status==="completed"?"Reminder due":"Scheduled"}</small></span></li>)}</ol> : <p>No events scheduled today.</p>}
   <button onClick={()=>window.dispatchEvent(new Event("apex:open-reminders"))}>Add event</button>
  </section>
 </aside>;
}
