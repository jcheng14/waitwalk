import {planWalk,planChoices,choiceCaps,inRange} from './engine.mjs';
import {demoOrigin,demoGraph,loadGraph,findPlaces} from './data.mjs';
import {renderMap} from './render.mjs';
import {isBilingual,localLabel} from './i18n.mjs';
const el=id=>document.getElementById(id), dom={};for(const i of ['form','language','address','search','search-results','demo','live','origin-sample','origin-live','locate','lat','lon','time','time-output','ticks','submit','map','save','status','results'])dom[i]=el(i);
const params=new URLSearchParams(location.search);
const custom=params.get('single')==='1';
let lang=isBilingual(params.get('lang'))?'bilingual':'en';
const bilingual=()=>isBilingual(lang);
const bi=(en,zh)=>bilingual()?en+' · '+zh:en;
function language(){for(const node of document.querySelectorAll('.cn'))node.hidden=!bilingual();dom.language.setAttribute('aria-pressed',bilingual());}
dom.language.addEventListener('click',()=>{lang=bilingual()?'en':'bilingual';language();time();if(latest){latest.lang=lang;draw();results()}});
language();
if(custom){dom.time.min=15;dom.time.max=90;dom.time.step=1;}
let isDemo=true,controller=null,selected=-1,latest=null,graph=null,lookupLabel=(params.get('label')||'').slice(0,120);
const demo=demoGraph();
function mode(value){isDemo=value;dom.demo.setAttribute('aria-pressed',value);dom.live.setAttribute('aria-pressed',!value);dom['origin-sample'].hidden=!value;dom['origin-live'].hidden=value;}
function time(){dom['time-output'].value=dom.time.value+' '+bi('min','分钟');for(const button of dom.ticks.querySelectorAll('button'))button.setAttribute('aria-pressed',button.dataset.min===dom.time.value)}
dom.time.addEventListener('input',time);
dom.ticks.addEventListener('click',e=>{if(e.target.dataset.min){dom.time.value=e.target.dataset.min;time();if(isDemo||latest&&!latest.demo)dom.form.requestSubmit()}});
dom.demo.addEventListener('click',()=>{placeRun?.abort();dom['search-results'].replaceChildren();mode(true);dom.form.requestSubmit()});
dom.live.addEventListener('click',()=>{mode(false);if(controller)controller.abort();dom.status.textContent='Choose your starting point, then find a walk.';dom.lat.focus()});
for(const field of [dom.lat,dom.lon])field.addEventListener('input',()=>{lookupLabel=''});
let placeRun;
async function search(){
 placeRun?.abort();const ctrl=new AbortController;placeRun=ctrl;
 dom['search-results'].textContent='Looking for places…';
 try{
  const found=await findPlaces(dom.address.value,{signal:ctrl.signal});
  if(ctrl.signal.aborted)return;
  dom['search-results'].replaceChildren();
  if(!found.length){dom['search-results'].textContent='No match. Add a city or enter coordinates.';return}
  for(const hit of found){
   const b=document.createElement('button');b.type='button';b.textContent=hit.name;
   b.addEventListener('click',()=>{
    dom.lat.value=hit.coords[0].toFixed(5);dom.lon.value=hit.coords[1].toFixed(5);lookupLabel=hit.name;dom.address.value=hit.name;
    dom['search-results'].replaceChildren();dom.form.requestSubmit();
   });
   dom['search-results'].append(b);
  }
 }catch(e){if(!ctrl.signal.aborted)dom['search-results'].textContent=e.message}
}
dom.search.addEventListener('click',search);
dom.address.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();search()}});
dom.locate.addEventListener('click',()=>{
 if(!navigator.geolocation){dom.status.textContent='Current location is unavailable. Use coordinates instead.';return}
 if(!isSecureContext){dom.status.textContent='Location needs HTTPS or localhost. Use coordinates instead.';return}
 dom.locate.disabled=true;dom.status.textContent='Waiting for location…';
 navigator.geolocation.getCurrentPosition(p=>{
  dom.locate.disabled=false;if(isDemo)return;
  dom.lat.value=p.coords.latitude.toFixed(5);dom.lon.value=p.coords.longitude.toFixed(5);lookupLabel='My location';
  dom.status.textContent='Location ready. Tap Find a walk to request map data.';
 },()=>{dom.locate.disabled=false;if(!isDemo)dom.status.textContent='Location unavailable. Enter coordinates instead.'},{timeout:10000,maximumAge:0});
});
function relink(url,label){
 const a=document.createElement('a');a.className='map-link';a.href=url;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function draw() {
 if(!latest)return;
 const svg=renderMap(latest,graph?.mapWays||[],selected);
 dom.map.innerHTML=svg;dom.save.disabled=false;return svg;
}
function results(){
 dom.results.replaceChildren();if(!latest)return;
 latest.options.forEach((p,i)=>{
  const item=document.createElement('article');item.className='option';
  const btn=document.createElement('button');btn.className='choice';btn.type='button';btn.setAttribute('aria-pressed',latest.choices?p.cap===latest.minutes:i===selected);
  const n=document.createElement('span');n.className='number';n.textContent=i+1;btn.append(n);
  const tag=document.createElement('small');tag.textContent=bi(`${p.label} · ${p.kind==='loop'?'loop':'out & back'}`,p.kind==='loop'?'环线':'原路往返');btn.append(tag);
  const title=document.createElement('strong');title.textContent=localLabel(p,bilingual());btn.append(title);item.append(btn);
  btn.addEventListener('click',()=>{selected=selected===i?-1:i;if(latest.choices){latest.minutes=p.cap;dom.time.value=p.cap;time()}for(const [j,b] of [...dom.results.querySelectorAll('.choice')].entries())b.setAttribute('aria-pressed',latest.choices?latest.options[j].cap===latest.minutes:selected===j);draw()});
  const desc=document.createElement('p');desc.textContent=bi(`${p.total} min total: ${p.out+p.back} walking + ${p.stay} ${p.category==='coffee'?'coffee/queue':'at the stop'} + ${latest.buffer} buffer`,`总计${p.total}分钟：步行${p.out+p.back} + ${p.category==='coffee'?'咖啡和排队':'停留'}${p.stay} + 缓冲${latest.buffer}`);item.append(desc);
  if(p.checkpoints?.length){const order=document.createElement('ol');for(const checkpoint of p.checkpoints){const step=document.createElement('li');step.textContent=localLabel(checkpoint,bilingual())+(checkpoint.plannedStop?' ('+bi('planned stop','计划停留')+')':'');order.append(step)} item.append(order)}
  if(!latest.demo){
   if(p.source)item.append(relink(p.source,'Place details'));
   if(p.homepage)item.append(relink(p.homepage,'Website'));
   if(p.photo)item.append(relink(p.photo,'Wikidata / possible photos'));
   if(p.approxAccessMeters){const note=document.createElement('p');note.textContent='Dotted links to the mapped way are approximate; check their access.';item.append(note)}
  }
  dom.results.append(item);
 });
}
dom.form.addEventListener('submit',async e=>{
 e.preventDefault();controller?.abort();
 const live=!isDemo, minutes=Number(dom.time.value),interest=new FormData(dom.form).get('interest');
 const picked=[Number(dom.lat.value),Number(dom.lon.value)];
 if(live&&(!dom.lat.value.trim()||!dom.lon.value.trim()||!inRange(...picked))){dom.status.textContent='Enter latitude (−85 to 85) and longitude (−180 to 180).';return}
 const thisRun=new AbortController;controller=thisRun;selected=-1;dom.submit.setAttribute('aria-busy',live);dom.save.disabled=true;
 dom.status.textContent=live?'Looking for walkable paths and interesting places…':'';
 if(live){dom.map.replaceChildren();dom.results.replaceChildren();}
 try{
  const input=live?picked:demoOrigin;
  const data=live?await loadGraph(input,custom?minutes:60,{signal:thisRun.signal}):demo;
  if(thisRun.signal.aborted)return;
  latest=(custom?planWalk:planChoices)(data,{origin:input,minutes,interest,label:live?(lookupLabel||'Selected starting point'):'Alder & Main'});
  latest.demo=!live;latest.lang=lang;graph=data;draw();results();
  dom.status.textContent=latest.options.length?(latest.demo?'Sample neighborhood. The highlighted time changes which route stands out.':'Choose the route you want to take. Small map pins are things to see as you pass.'):
   ({'no-nearby-path':'No mapped walking path starts close enough. Try shifting the starting point.','no-fit':'No mapped stop fits your time and interest. Add time or choose Anything.'}[latest.reason]);
 }catch(err){
  if(!thisRun.signal.aborted)dom.status.textContent=String(err.message||'Could not load maps.')+' No route was invented.';
 }finally{if(controller===thisRun){dom.submit.removeAttribute('aria-busy');controller=null}}
});
const download=(blob,file)=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)};
dom.save.addEventListener('click',async()=>{
 const svg=draw();if(!svg)return;
 const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob);
 try{
  const image=new Image;image.src=url;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth*2;canvas.height=image.naturalHeight*2;
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  const encoded=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!encoded)throw new Error('No PNG output');
  download(encoded,'waitwalk-map.png');
 }catch{download(blob,'waitwalk-map.svg')}
 finally{URL.revokeObjectURL(url)}
});
const paramRaw=Number(params.get('minutes'));
const paramM=custom?paramRaw:choiceCaps.filter(x=>x<=paramRaw).at(-1);
if(Number.isInteger(paramM)&&paramM>=15&&paramM<=90)dom.time.value=paramM;
for(const radio of dom.form.querySelectorAll('input[name=interest]'))if(radio.value===params.get('interest'))radio.checked=true;
time();
if(params.get('lat')?.trim()&&params.get('lon')?.trim()&&inRange(Number(params.get('lat')),Number(params.get('lon')))){mode(false);dom.lat.value=params.get('lat');dom.lon.value=params.get('lon');dom.status.textContent='Starting point filled in. Tap Find a walk to request map data.';}
else dom.form.requestSubmit();
