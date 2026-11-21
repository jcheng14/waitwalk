import {planWalk,planChoices,toGeoJSON} from './site/engine.mjs';
import {demoGraph,demoOrigin,loadGraph} from './site/data.mjs';
import {parseArgs} from 'node:util';
import {renderMap} from './site/render.mjs';
try{
 const args=process.argv.slice(2).reduce((a,v,i,l)=>{if(/^-[0-9.]/.test(v)&&['--lat','--lon'].includes(l[i-1]))a[a.length-1]+='='+v;else a.push(v);return a},[]);
 const {values:v}=parseArgs({args,options:{demo:{type:'boolean'},live:{type:'boolean'},lat:{type:'string'},lon:{type:'string'},minutes:{type:'string',default:'30'},interest:{type:'string',default:'any'},label:{type:'string'},geojson:{type:'boolean'},choices:{type:'boolean'},svg:{type:'boolean'},help:{type:'boolean'}}});
 if(v.help){
  console.log('node plan-walk.mjs --demo [--minutes 30] [--interest any|coffee|nature|photo] [--geojson|--svg] [--choices]\nnode plan-walk.mjs --live --lat LAT --lon LON [--minutes 30] [--label NAME]');process.exit(0)
 }
 if(Boolean(v.demo)===Boolean(v.live))throw new Error('Choose --demo or explicitly consent to the Overpass coordinate request with --live.');
 if(!v.demo&&(!v.lat?.trim()||!v.lon?.trim()))throw new Error('Live planning requires --lat and --lon.');
 const minutes=Number(v.minutes),origin=v.demo?demoOrigin:[Number(v.lat),Number(v.lon)];
 const graph=v.demo?demoGraph():await loadGraph(origin,v.choices?60:minutes,{url:process.env.WAITWALK_OVERPASS_URL});
 const plan=(v.choices?planChoices:planWalk)(graph,{origin,minutes,interest:v.interest,label:v.demo?'Alder & Main (sample)':String(v.label||'Starting point').slice(0,120)});
 plan.demo=Boolean(v.demo);
 console.log(v.svg?renderMap(plan,graph.mapWays):JSON.stringify(v.geojson?toGeoJSON(plan):plan));
}catch(e){console.error(e.message);process.exitCode=1}
