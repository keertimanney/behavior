'use strict';
// A source-backed example, not a claim to expose unrecorded model reasoning.
const loopExample=[
  {key:'orientation',label:'Report the problem',detail:'Returned model summary',text:'“I’ve flipped the object upside down!”',evidence:()=>sources.orientation.excerpt.replace(/^\*\*.*?\*\*\s*/,'').split('!')[0]+'!'},
  {key:'ik2',label:'Compute candidate poses',detail:'Python · local_ik.solve',text:'Two calls test three candidates each.',evidence:()=>[sources.ik,sources.ik2].map(r=>pythonBody(r.raw.arguments.command)).join('\n\n')},
  {key:'correct',label:'Command the robot',detail:'Python · sim_client.act',text:'Send a computed left-arm joint target.',evidence:()=>pythonBody(sources.correct.raw.arguments.command)},
  {key:'correct',label:'Receive feedback',detail:'Tool result · image + telemetry',text:'A new camera image arrives; telemetry reports stalled motion.',evidence:()=>sources.correct.raw.result.content.filter(c=>c.type==='text').map(c=>c.text).join('\n').split('\n').find(line=>line.includes('status=stalled'))}
];
// Chart events (by source key) that belong to each step above, so the two sections stay in sync.
const loopChartKeys=[['orientation'],['ik','ik2'],['correct'],['correct']];
// The step highlight only extends the current selection (e.g. both IK calls), so the chart never lights
// up two unrelated records at once.
function highlightChart(){
  const ids=new Set(loopChartKeys[loopSelected].map(k=>sources[k].id)),on=ids.has(selected.id);
  document.querySelectorAll('#diagramBody .diagramEvent').forEach(n=>n.classList.toggle('loopHi',on&&ids.has(n.dataset.source)));
}
let loopSelected=0;
function showLoopStep(index,{select=false}={}){
  loopSelected=index;const item=loopExample[index],r=sources[item.key];
  document.querySelectorAll('.loopStep').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));highlightChart();
  el('loopEvidenceLabel').textContent=`${item.detail} · ${index===1?`${time(sources.ik.t)} and ${time(sources.ik2.t)}`:time(index===3?r.end:r.t)} wall · ${index===0?'verbatim excerpt':index===3?'verbatim result line':'recorded Python'}`;
  el('loopEvidenceText').textContent=item.evidence();
  if(select){chooseMoment(0,{source:r});}
}
loopExample.forEach((item,index)=>{
  const button=make('button',undefined,'loopStep');
  button.append(make('small',`0${index+1} | ${item.detail}`),make('strong',item.label));
  button.addEventListener('click',()=>showLoopStep(index,{select:true}));el('loopSteps').append(button);
});
function revealTarget(target){
  for(let node=target;node;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;
}
// Called by selectSource for every selection (chart, evidence list, explorer, back/forward, playback),
// so the steps above always match the selected record; re-renders keep the highlight.
function syncLoopToSource(r){
  if(!loopChartKeys[loopSelected].some(k=>sources[k].id===r.id)){
    const step=loopChartKeys.findIndex(keys=>keys.some(k=>sources[k].id===r.id));
    if(step>=0)showLoopStep(step);
  }
  highlightChart();
}
new MutationObserver(highlightChart).observe(el('diagramBody'),{childList:true});
// Reveal disclosure ancestors before existing source links scroll into view.
document.addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#"]');
  if(link){const target=document.getElementById(link.getAttribute('href').slice(1));if(target)revealTarget(target);}
  if(event.target.closest('#segmentQuote'))revealTarget(el('selectedSource'));
},true);
function revealHashTarget(){const target=document.getElementById(location.hash.slice(1));if(target)revealTarget(target);const params=new URLSearchParams(location.hash.slice(1));if(params.has('evidence')||params.has('event'))revealTarget(el('selectedSource'));}
window.addEventListener('hashchange',revealHashTarget);
showLoopStep(0);syncLoopToSource(selected);revealHashTarget();
