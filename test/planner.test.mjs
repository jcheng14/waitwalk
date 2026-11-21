import {test} from 'node:test';
import assert from 'node:assert/strict';
import {distance,fromOsm,planWalk,planChoices,toGeoJSON,walkable} from '../site/engine.mjs';
import {demoGraph,demoOrigin,loadGraph,findPlaces} from '../site/data.mjs';
import {renderMap} from '../site/render.mjs';
const origin=[0,0];
function assertPlan(plan,graph){
 for(const opt of plan.options){
  assert.deepEqual(opt.waypoints[0],opt.returnWaypoints.at(-1));
  assert.deepEqual(opt.waypoints.at(-1),opt.returnWaypoints[0]);
  assert.equal(opt.total,opt.out+opt.back+opt.stay+plan.buffer);
  assert.ok(opt.total<=plan.minutes);
  if(opt.kind==='loop'){
   const coords=[...opt.waypoints,...opt.returnWaypoints.slice(1,-1)];
   assert.equal(new Set(coords.map(p=>p.join(','))).size,coords.length);
  }
  for(const stop of opt.along)assert.ok(opt.waypoints.concat(opt.returnWaypoints).some(n=>distance(n,stop.coords)<=57.01));
 }
}
test('15–90 minute demo never exceeds return deadline; 45 min gives two actual loops with checkpoint names',()=>{
 const g=demoGraph();for(let minutes=15;minutes<=90;minutes+=5){const p=planWalk(g,{origin:demoOrigin,minutes});assertPlan(p,g);}
 const p=planWalk(g,{origin:demoOrigin,minutes:45});
 assert.deepEqual(p.options.map(o=>[o.kind,o.total,o.along.length]),[['loop',31,3],['loop',45,3]]);
 assert.equal(p.options[0].category,'coffee');assert.equal(p.options[0].stay,8);
 const xml=renderMap({...p,demo:true},g.mapWays);
 for(const term of ['YOU ARE HERE','Juniper Bakehouse','Clover Pocket Park','Plover Arch','45 MIN TO GO','pickup buffer included'])assert.match(xml,new RegExp(term));
});
const node=(id,lat,lon,tags)=>({type:'node',id,lat,lon,tags});
const way=(id,nodes,tags)=>({type:'way',id,nodes,tags});
const home=node(1,0,0), end=node(2,.0007,0,{name:'Test Café',amenity:'cafe'}), neighbor=node(3,0,.0007);
test('physical cul-de-sac yields an honest out-and-back and includes stop + pickup time',()=>{
 const g=fromOsm({elements:[home,end,way(10,[1,2],{highway:'footway'})]});
 const short=planWalk(g,{origin,minutes:15}), p=planWalk(g,{origin,minutes:20});
 assert.equal(short.options.length,0);
 assert.equal(p.options.length,1);assert.equal(p.options[0].kind,'out-and-back');
 assert.equal(p.options[0].stay,8);assertPlan(p,g);
 assert.match(renderMap(p,g.mapWays),/out &amp; back/);
});
test('no path crosses a creek or walks a private footpath based on straight-line proximity',()=>{
 const g=fromOsm({elements:[home,end,neighbor,way(10,[1,3],{highway:'footway'}),way(11,[1,2],{highway:'footway',access:'private'}),way(12,[2,3],{waterway:'stream'})]});
 assert.equal(planWalk(g,{origin,minutes:60}).options.length,0);
 assert.ok(!walkable({highway:'primary',sidewalk:'separate'}));
 assert.ok(!walkable({highway:'footway','foot:conditional':'no @ snow'}));
});
test('one-way pedestrian path does not imply a routable return',()=>{
 const g=fromOsm({elements:[home,end,way(10,[1,2],{highway:'footway','oneway:foot':'yes'})]});
 assert.equal(planWalk(g,{origin,minutes:30}).options.length,0);
});
test('fixture exercises external graph fetch, GeoJSON, and honest provider failure',async()=>{
 const g=await loadGraph(origin,30,{url:'https://fixture.test/x',fetcher:async(url,opts)=>{
  assert.match(String(opts.body),/highway/);assert.equal(opts.credentials,'omit');return {ok:true,json:async()=>({elements:[home,end,way(10,[1,2],{highway:'footway'})]})}
 }});
 const geo=toGeoJSON(planWalk(g,{origin,minutes:30}));assert.equal(geo.features[1].geometry.type,'MultiLineString');
 await assert.rejects(loadGraph(origin,30,{url:'https://fixture.test/fail',fetcher:async()=>({ok:false,status:429})}),/429/);
 assert.throws(()=>fromOsm({elements:[],remark:'Partial timeout'}),/incomplete/);
});
test('address search does not trust malformed coordinates; SVG escapes arbitrary names',async()=>{
 const result=await findPlaces('Park & Trail',{fetcher:async url=>{
  assert.equal(url.searchParams.get('q'),'Park & Trail');
  return {ok:true,json:async()=>({features:[{geometry:{coordinates:[-122.3,47.6]},properties:{name:'Test',city:'Seattle'}},{geometry:{coordinates:[123,90]},properties:{name:'Invalid'}}]})};
 }});
 assert.deepEqual(result,[{name:'Test, Seattle',coords:[47.6,-122.3]}]);
 assert.match(renderMap({origin,minutes:15,buffer:5,label:'<script>bad</script>',options:[]}),/&lt;script&gt;/);
});

test('one visual includes two independently budgeted choices and ordered waypoints, prioritizes the asked time, and shows missing choices accurately',()=>{
 const g=demoGraph(),p=planChoices(g,{origin,minutes:30});
 assert.deepEqual(p.options.map(o=>o.cap),[30,60]);
 assert.ok(p.options.every(o=>o.total<=o.cap));
 for(const o of p.options){assert.deepEqual(o.checkpoints.map(c=>c.sequence),[1,2,3,4]);assert.equal(o.checkpoints.filter(c=>c.plannedStop).length,1);assert.ok(o.checkpoints.every((c,i)=>!i||c.atMinute>=o.checkpoints[i-1].atMinute));}
 assert.equal(p.options.filter(o=>o.cap===p.minutes).length,1);
 const map=renderMap({...p,demo:true},g.mapWays);
 assert.match(map,/30 MIN TO GO/);assert.match(map,/60 min window · 54 min loop/);assert.match(map,/YOU ARE HERE/);assert.match(map,/A2 · Lantern Espresso · 8 min stop/);assert.match(map,/B4 · Creekside Ferns/);
 const empty=planChoices(fromOsm({elements:[home]}),{origin,minutes:30});
 assert.deepEqual(empty.unavailable,[30,60]);assert.match(renderMap(empty),/30 min window · No fit/);
});
