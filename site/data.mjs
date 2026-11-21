import {distance, fromOsm, inRange, searchRadius} from './engine.mjs';
export const GRAPH_TIMEOUT_MS=8500;
export const GEOCODE_TIMEOUT_MS=5000;
const MAX_ELEMENTS=45000;
export const endpoints={overpass:'https://overpass-api.de/api/interpreter',photon:'https://photon.komoot.io/api/'};
const roads='footway|pedestrian|path|living_street|residential|tertiary|tertiary_link|unclassified|service|steps|track|secondary|secondary_link|primary|primary_link|corridor|cycleway';
export function overpassQuery(lat,lon,minutes) {
 if(!inRange(lat,lon))throw new RangeError('Enter valid latitude and longitude.');
 const r=searchRadius(minutes), p=[r,lat.toFixed(5),lon.toFixed(5)].join(',');
 return `[out:json][timeout:6][maxsize:50000000];
 way(around:${p})["highway"~"^(${roads})$"]->.roads;
 (nwr(around:${p})["leisure"~"^(park|garden|nature_reserve)$"]["name"];
 nwr(around:${p})["amenity"~"^(cafe|library|arts_centre|marketplace|ice_cream)$"]["name"];
 nwr(around:${p})["tourism"~"^(viewpoint|artwork|museum|gallery|attraction)$"]["name"];
 nwr(around:${p})["historic"~"^(monument|memorial)$"]["name"];
 nwr(around:${p})["shop"="books"]["name"];)->.places;
 (way(around:${p})["natural"="water"];way(around:${p})["waterway"~"^(river|canal|stream)$"];)->.waters;
 (.roads;.places;.waters;>;);
 out body center qt;`;
}
const cache=new Map;
export async function loadGraph(origin, minutes, {fetcher=fetch, url=endpoints.overpass, signal}={}) {
 const query=overpassQuery(...origin,minutes), key=url+'\n'+query;
 if(cache.has(key))return cache.get(key);
 const timer=AbortSignal.timeout(GRAPH_TIMEOUT_MS), combined=signal?AbortSignal.any([signal,timer]):timer;
 try{
  const res=await fetcher(url,{method:'POST',body:new URLSearchParams({data:query}),signal:combined,credentials:'omit'});
  if(!res.ok)throw new Error('The map provider returned '+res.status+'. Try the offline demo or retry later.');
  const data=await res.json();
  if(data?.elements?.length>MAX_ELEMENTS)throw new Error('This area returned too much map data for a quick plan. Try the single-budget CLI with a shorter time.');
  const graph=fromOsm(data);
  if(cache.size>=3)cache.delete(cache.keys().next().value);
  cache.set(key,graph);return graph;
 }catch(error){
  if(timer.aborted&&!signal?.aborted)throw new Error('Live map data timed out. Try again or use the offline sample; no live route was invented.');
  throw error;
 }
}

export async function findPlaces(query,{fetcher=fetch,url=endpoints.photon,signal}={}){
 const q=query.trim(); if(q.length<2||q.length>150)throw new Error('Enter 2–150 characters for the place search.');
 const request=new URL(url);request.searchParams.set('q',q); request.searchParams.set('limit','5');
 const timer=AbortSignal.timeout(GEOCODE_TIMEOUT_MS);
 const reply=await fetcher(request,{credentials:'omit',signal:signal?AbortSignal.any([signal,timer]):timer});
 if(!reply.ok)throw new Error('Place search is temporarily unavailable. Enter coordinates instead.');
 const body=await reply.json();
 if(!Array.isArray(body?.features))throw new Error('Place search returned no usable results.');
 return body.features.slice(0,5).flatMap(f=>{
  const [lon,lat]=f.geometry?.coordinates||[];
  if(!inRange(lat,lon))return [];
  const a=f.properties||{}, name=[a.name||[a.housenumber,a.street].filter(Boolean).join(' '),a.city||a.locality,a.state,a.country].filter(Boolean).filter((s,i,l)=>l.indexOf(s)===i).join(', ');
  return name?[{name:name.slice(0,150),coords:[lat,lon]}]:[];
 });
}
export const demoOrigin=[0,0];
export function demoGraph(){
 const points=new Map, linkable=new Set, edges=[], mapWays=[], places=[];
 const f=(x,y)=>[y*.00086+(x%3)*.000025,x*.00086+(y%3)*.000015], id=(x,y)=>x+':'+y;
 for(let y=-14;y<=14;y++)for(let x=-16;x<=16;x++){
  const k=id(x,y);points.set(k,f(x,y));linkable.add(k);
  for(const [dx,dy] of [[-1,0],[0,-1]]) {
   if(x+dx< -16||y+dy< -14)continue;
   const prev=id(x+dx,y+dy), a=f(x,y),b=f(x+dx,y+dy),m=distance(a,b);
   // Two real crossings through the illustrated creek corridor.
   if(dx===-1&&x===8&&y!==2&&y!==-5)continue;
   edges.push([prev,k,m],[k,prev,m]);mapWays.push({kind:'road',coords:[a,b],closed:false});
  }
 }
 function area(kind,corners){mapWays.unshift({kind,coords:corners.map(p=>f(...p)),closed:true});}
 area('water',[[7.15,15],[7.8,15],[7.6,5],[7.85,1],[7.3,-5],[7.85,-15],[7.15,-15],[6.85,-5],[7.25,1],[7,5]]);
 area('park',[[-7,5],[-1,5],[-1,2],[-7,2]]);
 area('park',[[2,-6],[7,-6],[7,-2],[4,-2],[4,-3],[2,-3]]);
 area('park',[[9,7],[13,7],[13,1],[9,1]]);
 area('park',[[-12,-5],[-8,-5],[-8,-9],[-12,-9]]);
 const records=[
  [0,-1,'Rose Tile Stairs','photo'], [0,1,'Mosswing Tree','nature'], [2,1,'Button House','photo'], [3,0,'Book Nest','culture'], [1,0,'Mosslight Pocket Garden','nature'], [-1,0,'The Little Mosaic','photo'],[1,1,'Little Fern Coffee','coffee'],
  [3,-1,'Alder Lane Books','culture'],[3,-2,'Lantern Espresso','coffee'],[-3,2,'Fern Steps','nature'],[2,3,'Three Swallows Mural','photo'],[-4,-2,'Juniper Bakehouse','coffee'],
  [1,-1,'Frog Tile Wall','photo'],[-2,-2,'Clover Pocket Park','nature'], [5,-4,'South Creek Gardens','nature'], [7,-5,'Lantern Steps','photo'], [8,-5,'Creekside Ferns','nature'], [6,-7,'Plover Arch','photo'], [8,-6,'Stone Bridge View','photo'],[-6,4,'Overlook Terrace','photo'],[6,2,'Footbridge Café','coffee'],[-7,-2,'Paper Lantern Arcade','culture'],
  [-10,-7,'West Orchard Trail','nature'],[9,2,'Creek Footbridge','photo'],[11,4,'Lookout Grove','nature'],[10,-6,'Sparrow Roasters','coffee'],
  [-12,4,'The Clockmaker’s Courtyard','culture'],[12,8,'Hilltop View','photo']
 ];
 for(const [x,y,name,category] of records) places.push({id:id(x,y),node:id(x,y),name,category,coords:f(x,y),demo:true});
 return {points,edges,linkable,mapWays,places};
}
