/* Two presentations of the same source records: essay and focused explorer. */
const svgNS='http://www.w3.org/2000/svg';
function svgNode(tag,attrs,text){const e=document.createElementNS(svgNS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e;}
const traceSvg=svgNode('svg',{viewBox:'0 0 560 630',role:'group','aria-label':'Every mark is a recorded activity span. Wall time increases down the page.'});
const columns={model:110,summary:110,tool:235,robot:360,context:485};
for(const [label,x] of [['Model',110],['Tools',235],['Robot',360],['Context',485]]){
  traceSvg.append(svgNode('text',{x,y:24,'text-anchor':'middle',fill:'#babac4','font-size':12,'font-family':'system-ui'},label));
  traceSvg.append(svgNode('line',{x1:x,x2:x,y1:43,y2:590,stroke:'#24262e','stroke-width':1}));
}
for(const t of [0,600,1200,TRACE.duration]){const y=48+t/TRACE.duration*530;traceSvg.append(svgNode('line',{x1:56,x2:530,y1:y,y2:y,stroke:'#22232a','stroke-dasharray':'2 6'}));traceSvg.append(svgNode('text',{x:43,y:y+4,'text-anchor':'end',fill:'#85858f','font-size':10,'font-family':'monospace'},clock(t)));}
for(const record of records){const mark=svgNode('rect',{x:columns[record.kind]-25,y:48+record.t/TRACE.duration*530,width:50,height:Math.max(2,((record.end??TRACE.duration)-record.t)/TRACE.duration*530),rx:1,class:`mapspan ${record.kind}`,'data-event':record.id,tabindex:0,role:'button','aria-label':`${record.title} at ${clock(record.t)} wall time`});mark.append(svgNode('title',{},`${record.title} · ${clock(record.t)} · ${record.status}`));mark.addEventListener('click',()=>selectEvent(record));mark.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectEvent(record);}});traceSvg.append(mark);}
traceSvg.append(svgNode('text',{x:285,y:620,'text-anchor':'middle',fill:'#8c8d97','font-size':11,'font-family':'system-ui'},'One mark per span · wall time runs downward'));
$('traceMap').append(traceSvg);
function setMode(explore,updateURL=true){document.body.classList.toggle('explore-mode',explore);$('storyMode').setAttribute('aria-pressed',String(!explore));$('explorerMode').setAttribute('aria-pressed',String(explore));if(updateURL){const u=new URL(location.href);if(explore)u.searchParams.set('view','explorer');else u.searchParams.delete('view');history.replaceState(null,'',u);window.scrollTo({top:0,behavior:'auto'});}document.querySelectorAll('.mapspan').forEach(m=>m.classList.toggle('selected',m.dataset.event===selection.id));}
$('storyMode').addEventListener('click',()=>setMode(false));$('explorerMode').addEventListener('click',()=>setMode(true));$('inlineExplore').addEventListener('click',()=>setMode(true));
document.querySelectorAll('[data-story-event]').forEach(b=>b.addEventListener('click',()=>{selectEvent(eventMap.get(b.dataset.storyEvent));$('walkthrough').scrollIntoView({behavior:'auto',block:'start'});}));
document.querySelectorAll('[data-chapter]').forEach(b=>b.addEventListener('click',()=>{chooseChapter(Number(b.dataset.chapter));$('walkthrough').scrollIntoView({behavior:'auto',block:'start'});}));
window.addEventListener('popstate',()=>setMode(new URL(location.href).searchParams.get('view')==='explorer',false));
setMode(new URL(location.href).searchParams.get('view')==='explorer',false);
