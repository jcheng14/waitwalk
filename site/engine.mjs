export const KPH=4.2;
export const BUFFER=5;
export const interests=['any','coffee','nature','photo'];
export const inRange=(lat,lon)=>Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=85&&Math.abs(lon)<=180;
const rad=x=>x*Math.PI/180;
export function distance(a,b) {
 const x=Math.sin(rad(b[0]-a[0])/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(rad(b[1]-a[1])/2)**2;
 return 12742000*Math.asin(Math.sqrt(Math.min(1,x)));
}
export function timeBudget(minutes) {
 if(!Number.isInteger(minutes)||minutes<15||minutes>90) throw new RangeError('Use a whole number from 15 to 90 minutes.');
 return {minutes, buffer:BUFFER, maxMeters:(minutes-BUFFER)*KPH*1000/60};
}
export function searchRadius(minutes) {return Math.min(2900,Math.ceil(timeBudget(minutes).maxMeters/2)+120)}
const allowed=new Set(['footway','pedestrian','path','living_street','residential','tertiary','tertiary_link','unclassified','service','steps','track','secondary','secondary_link','primary','primary_link','corridor','cycleway']);
const explicitFoot=t=>['yes','designated','permissive','official'].includes(t.foot);
const denied=t=>['private','no','customers','delivery','destination','permit'].includes(t.foot)||(!explicitFoot(t)&&['no','private','customers','delivery','destination','permit'].includes(t.access));
export function walkable(t={}) {
 if(!allowed.has(t.highway)||denied(t)||t.area==='yes'||t['foot:conditional']||t['access:conditional']||t.construction||t.indoor==='yes')return false;
 if(t.highway==='cycleway'&&!explicitFoot(t))return false;
 if(['primary','primary_link','secondary','secondary_link'].includes(t.highway)&&!explicitFoot(t)&&!['yes','both','left','right','separate'].includes(t.sidewalk))return false;
 if(t.sidewalk==='separate'&&!explicitFoot(t)&&['primary','primary_link','secondary','secondary_link'].includes(t.highway))return false;
 return true;
}
export function classify(t={}) {
 if(t.amenity==='cafe')return 'coffee';
 if(['park','garden','nature_reserve'].includes(t.leisure))return 'nature';
 if(t.tourism==='viewpoint'||t.tourism==='artwork'||t.historic==='monument'||t.historic==='memorial')return 'photo';
 if(['library','arts_centre','marketplace','ice_cream'].includes(t.amenity)||['museum','gallery','attraction'].includes(t.tourism)||t.shop==='books')return 'culture';
 return null;
}
const safeUrl = v => {
 try {let u=new URL(v); return u.protocol==='https:'&&!u.username&&!u.password?u.href:null} catch{return null}
};
export function fromOsm(data) {
 if(!Array.isArray(data?.elements)||data.remark)throw new Error('Map data is incomplete. Try again or choose a shorter time.');
 const points=new Map, edges=[],linkable=new Set, places=[], mapWays=[];
 for(const e of data.elements) if(e.type==='node'&&inRange(e.lat,e.lon)) points.set(e.id,[e.lat,e.lon]);
 for(const e of data.elements) {
  const t=e.tags||{};
  if(e.type==='way'&&Array.isArray(e.nodes)){
   if(walkable(t)) for(let i=1;i<e.nodes.length;i++){
    const a=e.nodes[i-1],b=e.nodes[i]; if(points.has(a)&&points.has(b)&&a!==b){
     const m=distance(points.get(a),points.get(b)); if(m<0.005)continue;
     if(t['oneway:foot']!=='-1') edges.push([a,b,m]);
     if(!['yes','1','true'].includes(t['oneway:foot'])) edges.push([b,a,m]);
     linkable.add(a);linkable.add(b);
    }
   }
   if(e.nodes.length>1&&e.nodes.some(id=>points.has(id))) mapWays.push({kind:classify(t)==='nature'?'park':t.natural==='water'||t.waterway?'water':walkable(t)?'road':'minor', coords:e.nodes.map(id=>points.get(id)).filter(Boolean),closed:e.nodes[0]===e.nodes.at(-1)});
  }
  const category=classify(t);
  if(!category||!t.name||denied(t)||!['node','way','relation'].includes(e.type))continue;
  const lat=e.lat??e.center?.lat,lon=e.lon??e.center?.lon;
  if(!inRange(lat,lon))continue;
  const wiki=String(t.wikidata||'');
  places.push({id:e.type+'/'+e.id,name:String(t.name).slice(0,120),category,coords:[lat,lon],nodes:e.nodes?.filter(n=>points.has(n)),node:e.type==='node'?e.id:undefined,homepage:safeUrl(t.website||t['contact:website']),source:'https://www.openstreetmap.org/'+e.type+'/'+e.id,photo:/^Q\d+$/.test(wiki)?'https://www.wikidata.org/wiki/'+wiki:null,hours:t.opening_hours||null});
 }
 return {points,edges,linkable,places,mapWays};
}
class Heap{
 constructor(){this.h=[]}
 add(x){let h=this.h,i=h.push(x)-1;while(i){const p=(i-1)>>1;if(h[p][0]<=x[0])break;h[i]=h[p];i=p}h[i]=x}
 pop(){let h=this.h,r=h[0],x=h.pop();if(h.length){let i=0;for(;;){let a=i*2+1;if(a>=h.length)break;let b=a+1,j=b<h.length&&h[b][0]<h[a][0]?b:a;if(h[j][0]>=x[0])break;h[i]=h[j];i=j}h[i]=x}return r}
}
function dijkstra(adj,start,limit,blocked=null){
 const costs=new Map([[start,0]]), prev=new Map, heap=new Heap; heap.add([0,start]);
 for(let item;(item=heap.pop());){
  const [d,u]=item;if(costs.get(u)!==d)continue;
  for(const [v,m] of adj.get(u)||[]){
   if(blocked?.get(u)?.has(v))continue;
   const nd=d+m;if(nd<=limit&&nd<(costs.get(v)??Infinity)){costs.set(v,nd);prev.set(v,u);heap.add([nd,v])}
  }
 }
 return {costs,prev};
}
function nearest(target, keys, points, max=75) {
 let result=null;
 for(const key of keys){const p=points.get(key);if(!p)continue;const m=distance(target,p);if(m<=max&&(!result||m<result.m))result={key,m};}
 return result;
}
function path(prev, start,end){
 let array=[end];
 while(array.at(-1)!==start){const p=prev.get(array.at(-1));if(p===undefined)return [];array.push(p);}
 return array.reverse();
}
export const dwellMinutes={coffee:8,nature:3,photo:4,culture:5};
export function planWalk(graph, options){
 const {origin,minutes,interest='any',label='Starting point'}=options;
 if(!Array.isArray(origin)||!inRange(...origin))throw new RangeError('Enter valid latitude and longitude.');
 if(!interests.includes(interest))throw new RangeError('Unknown interest.');
 const budget=timeBudget(minutes),base={origin,label,minutes,buffer:BUFFER,speedKph:KPH,options:[]};
 const {points,edges,linkable,places}=graph;
 const start=nearest(origin,linkable,points,65);
 if(!start)return {...base,reason:'no-nearby-path'};
 const forward=new Map,reverse=new Map;
 for(const [a,b,m] of edges){
  if(!forward.has(a))forward.set(a,[]); forward.get(a).push([b,m]);
  if(!reverse.has(b))reverse.set(b,[]); reverse.get(b).push([a,m]);
 }
 const max=budget.maxMeters-start.m*2, begin=dijkstra(forward,start.key,max), end=dijkstra(reverse,start.key,max);
 const valid=[],seen=new Set;
 for(const p of places){
  if(interest!=='any'&&p.category!==interest)continue;
  if(distance(origin,p.coords)>max/2+70)continue;
  const direct=p.node!==undefined&&linkable.has(p.node);
  const boundary=p.category==='nature'&&p.nodes?.length?p.nodes:null;
  const foot=direct?{key:p.node,m:0}:boundary
   ? nearest(origin,boundary.filter(n=>linkable.has(n)&&begin.costs.has(n)&&end.costs.has(n)),points,Infinity)
   : nearest(p.coords,linkable,points,45);
  if(!foot)continue;
  const access=boundary?0:foot.m;
  const outMeters=(begin.costs.get(foot.key)??Infinity)+start.m+access;
  const backMeters=(end.costs.get(foot.key)??Infinity)+start.m+access;
  const out=Math.ceil(outMeters/(KPH*1000/60)), back=Math.ceil(backMeters/(KPH*1000/60));
  const stay=dwellMinutes[p.category], total=out+back+stay+BUFFER;
  if(total>minutes||out+back<2)continue;
  const dedup=p.name.toLocaleLowerCase(); if(seen.has(dedup))continue;seen.add(dedup);
  valid.push({p,foot,boundary,access,outMeters,backMeters,out,back,stay,total});
 }
 // Try bounded, spread-out destination candidates. A true loop uses no repeated way segment
 // in either direction and revisits no mapped node except at the origin.
 const shortlist=valid.sort((a,b)=>a.total-b.total);
 const pending=shortlist.length>30
  ? Array.from({length:30},(_,i)=>shortlist[Math.round(i*(shortlist.length-1)/29)])
  : shortlist;
 const loops=[];
 const fallback=[];
 for(const v of pending){
  const {p,foot,boundary,access,outMeters,backMeters,out,back,stay,total}=v;
  const outKeys=path(begin.prev,start.key,foot.key);
  if(outKeys.length<2)continue;
  const legA=outKeys.map(k=>points.get(k));
  const decorate=(retKeys,retMeters,retMinutes,kind)=>{
   const returning=retKeys.map(k=>points.get(k)), along=[];
   const nearby=places.filter(a=>a.id!==p.id&&a.name.toLocaleLowerCase()!==p.name.toLocaleLowerCase()&&distance(origin,a.coords)<max/2+100);
   const complete=[...legA,...returning.slice(1)];let traversed=0;
   for(let i=0;i<complete.length;i++){
    if(i)traversed+=distance(complete[i-1],complete[i]);
    for(const a of nearby){
     if(along.length>=3)break;
     if(along.some(s=>s.id===a.id||distance(s.coords,a.coords)<65)||distance(a.coords,origin)<55||distance(a.coords,p.coords)<45)continue;
     if(distance(a.coords,complete[i])>(a.category==='nature'?57:35))continue;
     along.push({...a,atMinute:Math.max(1,Math.ceil((traversed+start.m)/(KPH*1000/60)))});
    }
   }
   const stopCoords=boundary?points.get(foot.key):p.coords;
   const checkpoints=[...along.map(a=>({...a,plannedStop:false})),{id:p.id,name:p.name,category:p.category,coords:stopCoords,atMinute:out,plannedStop:true}].sort((a,b)=>a.atMinute-b.atMinute||Number(b.plannedStop)-Number(a.plannedStop)).map((a,i)=>({...a,sequence:i+1}));
   return {...p,coords:stopCoords,mappedStart:points.get(start.key),mappedStop:points.get(foot.key),out,back:retMinutes,stay,total:out+retMinutes+stay+BUFFER,walkMeters:Math.round(outMeters+retMeters),waypoints:legA,returnWaypoints:returning,approxAccessMeters:Math.round(start.m+access),kind,along,checkpoints};
  };
  const returnKeys=path(end.prev,start.key,foot.key).reverse();
  if(returnKeys.length>1)fallback.push(decorate(returnKeys,backMeters,back,'out-and-back'));
  const blocked=new Map;
  const add=(a,b)=>{if(!blocked.has(a))blocked.set(a,new Set);blocked.get(a).add(b)};
  for(let i=1;i<outKeys.length;i++){add(outKeys[i-1],outKeys[i]);add(outKeys[i],outKeys[i-1]);}
  for(const u of outKeys.slice(1,-1)) for(const [n] of reverse.get(u)||[])add(n,u);
  const retRoom=(minutes-BUFFER-stay-out)*KPH*1000/60-start.m-access;
  if(retRoom<=0)continue;
  const detour=dijkstra(forward,foot.key,retRoom,blocked);
  const detourCost=detour.costs.get(start.key);
  if(detourCost===undefined)continue;
  const ret=path(detour.prev,foot.key,start.key);
  if(ret.length<2)continue;
  const retMeters=detourCost+start.m+access,retMinutes=Math.ceil(retMeters/(KPH*1000/60));
  if(out+retMinutes+stay+BUFFER<=minutes)loops.push(decorate(ret,retMeters,retMinutes,'loop'));
 }
 // Aim for a distinctly shorter and fuller outing rather than returning two near-identical stops.
 const quickTarget=minutes>=45?Math.min(40,Math.round(minutes*.66)):Math.round(minutes*.76);
 const fullTarget=minutes>=45?Math.min(minutes,Math.max(45,Math.round(minutes*.91))):minutes;
 function choose(candidates,target){
  return [...candidates].sort((a,b)=>(Math.abs(a.total-target)-a.along.length*1.45)-(Math.abs(b.total-target)-b.along.length*1.45)||a.name.localeCompare(b.name))[0]
 }
 const quick=choose(loops,quickTarget)||choose(fallback,quickTarget);
 if(quick){
  base.options.push({...quick,label:'Short route'});
  const others=loops.filter(p=>p.id!==quick.id&&p.total>=quick.total+2);
  const otherFallback=fallback.filter(p=>p.id!==quick.id&&p.total>=quick.total+2);
  const full=choose(others,fullTarget)||choose(otherFallback,fullTarget);
  if(full)base.options.push({...full,label:'Long route'});
  if(base.options.length===1){
   const alt=choose(loops.filter(p=>p.id!==quick.id&&p.total>=quick.total),fullTarget)||choose(fallback.filter(p=>p.id!==quick.id&&p.total>=quick.total),fullTarget);
   if(alt)base.options.push({...alt,label:'Alternate route'});
   else {const a=choose(loops.filter(p=>p.id!==quick.id),quickTarget)||choose(fallback.filter(p=>p.id!==quick.id),quickTarget);if(a){base.options[0]={...a,label:'Short route'};base.options.push({...quick,label:'Long route'});}}
  }
 }else base.reason='no-fit';
 return base;
}
export function toGeoJSON(plan) {
 const sw=p=>[p[1],p[0]];
 return {type:'FeatureCollection',features:[{type:'Feature',properties:{kind:'start',name:plan.label},geometry:{type:'Point',coordinates:sw(plan.origin)}},...plan.options.flatMap((p,index)=>[
  {type:'Feature',properties:{option:index+1,name:p.name,out:p.out,back:p.back,stay:p.stay,buffer:plan.buffer,kind:p.kind,total:p.total},geometry:{type:'MultiLineString',coordinates:[p.waypoints,p.returnWaypoints].filter(x=>x.length>1).map(x=>x.map(sw))}},
  {type:'Feature',properties:{option:index+1,kind:p.category,name:p.name},geometry:{type:'Point',coordinates:sw(p.coords)}}
 ])]};
}

export const choiceCaps=[30,60];
export function planChoices(graph,options){
 const {minutes=30}=options;timeBudget(minutes);
 const first=planWalk(graph,{...options,minutes:choiceCaps[0]});
 const plan={...first,minutes,options:[],unavailable:[],choices:true};
 const used=new Set;
 for(const cap of choiceCaps){
  const attempt=cap===choiceCaps[0]?first:planWalk(graph,{...options,minutes:cap});
  const candidates=[...attempt.options].sort((a,b)=>Number(b.kind==='loop')-Number(a.kind==='loop')||b.total-a.total);
  const best=candidates.find(p=>!used.has(p.id));
  if(best){used.add(best.id);plan.options.push({...best,cap,label:cap+'-min choice'});}
  else plan.unavailable.push(cap);
 }
 if(plan.options.length)delete plan.reason;
 return plan;
}
