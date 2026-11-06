'use strict';
const $ = id => document.getElementById(id);
const clock = seconds => {const n=Math.round(Math.max(0,seconds)*10);return `${Math.floor(n/600).toString().padStart(2,'0')}:${((n%600)/10).toFixed(1).padStart(4,'0')}`;};
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const states=TRACE.states;
const stateMap=new Map(states.map(s=>[s.step,s]));
const stateEvents=EPISODE.states.map(s=>({...s,raw:stateMap.get(s.step).raw,id:`state-${s.step}`,kind:'state',title:s.goal===true?'Attachment goal satisfied':s.left&&s.right?'Both grippers hold poster':s.right?'Right gripper holds poster':s.left?'Left gripper holds poster':s.goal===null?'Goal not yet evaluated':'Goal not yet satisfied'}));
const records=TRACE.records.map(e=>({...e,title:e.kind==='summary'?(e.excerpt.match(/^\*\*(.*?)\*\*/)?.[1]||e.title):e.title}));
const events=[...records,...stateEvents].sort((a,b)=>a.t-b.t);
const eventMap=new Map(events.map(e=>[e.id,e]));
records.filter(e=>e.kind==='robot').forEach((e,i)=>eventMap.set(`robot-${i+1}`,e));
eventMap.set('context-update',records.find(e=>e.kind==='context'));
const frameIntervals=[];
for(const s of states){if(!frameIntervals[s.frame])frameIntervals[s.frame]={start:s.t,end:TRACE.duration};}
for(let i=0;i<frameIntervals.length-1;i++)frameIntervals[i].end=frameIntervals[i+1].start;
let selection,chapterIndex=0,mediaURL,mediaReady=false,diagramVisible=true,playbackChapter=null,chainAction=null;
const origins={summary:'RETURNED SUMMARY',model:'MODEL REQUEST',tool:'TOOL RECORD',robot:'ROBOT RECORD',context:'CONTEXT COMPACTION',state:'EVALUATOR ONLY · NOT AN AGENT INPUT'};
function chapterBounds(i){const c=EPISODE.chapters[i],next=EPISODE.chapters[i+1];return {start:i===0?0:c.t,end:next?.t??TRACE.duration,startFrame:i===0?0:c.frame,endFrame:next?.frame??(EPISODE.lastFrame+1)};}
function chapterRecords(i){const b=chapterBounds(i);return events.filter(e=>e.t>=b.start&&e.t<b.end);}
function visibleRecords(){const pool=$('scope').value==='chapter'?chapterRecords(chapterIndex):events;const q=$('searchRecords')?.value.trim().toLowerCase()||'';return pool.filter(e=>($('filter').value==='all'||e.kind===$('filter').value)&&(!q||`${e.id} ${e.title} ${e.excerpt||''} ${JSON.stringify(e.raw?.arguments||'')}`.toLowerCase().includes(q)));}
function stateAt(t){let lo=0,hi=states.length;while(lo<hi){const mid=(lo+hi)>>1;if(states[mid].t<=t)lo=mid+1;else hi=mid;}return states[Math.max(0,lo-1)];}
function setDiagram(s){for(const side of ['left','right']){$(`${side}Line`).classList.toggle('on',s[side]);$(`${side}Node`).classList.toggle('on',s[side]);$(`${side}Text`).textContent=s[side]?'HOLDING POSTER':'NO GRASP';}$('goalLine').classList.toggle('on',s.goal===true);$('goalText').textContent=s.goal===null?'GOAL NOT YET EVALUATED':s.goal?'ATTACHMENT SATISFIED':'ATTACHMENT NOT YET SATISFIED';}
function detail(label,value){$('sourceDetails').append(node('dt',label),node('dd',value));}
const pretty=value=>value===undefined||value===null?'No payload recorded.':typeof value==='string'?value:JSON.stringify(value,null,2);
function imagesInto(container,record){container.replaceChildren();for(const [i,src] of (record?.images||[]).entries()){const a=node('a');a.href=src;a.target='_blank';a.rel='noreferrer';const img=node('img');img.src=src;img.loading='lazy';img.alt=`Recorded observation ${i+1}, returned at wall ${clock(record.end??record.t)}`;a.append(img);container.append(a);}}
function renderChain(event){
  let action=null,relation='Selected source record';
  if(event.kind==='tool'||event.kind==='robot')action=event;
  else if(event.kind==='model'||event.kind==='summary'){action=records.find(e=>e.kind==='tool'&&e.t>=(event.end??event.t)-.001);relation='Next tool in recorded order · temporal association';}
  else if(event.kind==='state'){action=records.find(e=>e.kind==='robot'&&e.t<=event.t&&(e.end??TRACE.duration)>=event.t);relation=action?'Robot span overlapping evaluator timestamp':'Evaluator evidence; no overlapping robot span';}
  else relation='Context record; no action association inferred';
  chainAction=action;
  const cutoff=action?.t??event.t;
  const previous=records.filter(e=>e.kind==='tool'&&e.images.length&&e.end!==null&&e.end<=cutoff).sort((a,b)=>b.end-a.end)[0];
  $('chainRelation').textContent=relation;
  imagesInto($('beforeImages'),previous);imagesInto($('afterImages'),action);
  $('beforeCaption').textContent=previous?`Most recent image-bearing tool result before this action: wall ${clock(previous.end)}. It is ${(cutoff-previous.end).toFixed(2)} s earlier. No claim is made that this was the model’s only visual context.`:'No earlier image-bearing tool result is present in the recorded trace.';
  $('actionHeading').textContent=action?`${action.kind==='robot'?'Robot':'Tool'} · ${action.title}`:'Recorded action';
  $('actionCaption').textContent=action?`${clock(action.t)} wall · frame ${action.frame} · ${action.id}`:'This record does not identify an associated action.';
  $('actionPayload').textContent=pretty(action?.raw?.arguments);
  $('resultCaption').textContent=action?`Status: ${action.status}. ${action.end===null?'No end timestamp recorded.':`Returned at wall ${clock(action.end)}.`} ${action.images.length?'Images below belong to this record.':''}`:'No result associated.';
  $('resultPayload').textContent=pretty(action?.raw?.result);
  $('inspectAction').disabled=!action||action.id===event.id;
}
function renderList(){const pool=visibleRecords();$('events').replaceChildren();$('eventCount').textContent=`${pool.length} records${$('scope').value==='chapter'?' in this chapter':''}`;for(const e of pool){const b=node('button',undefined,'event');b.dataset.event=e.id;b.setAttribute('aria-current',String(selection?.id===e.id));b.append(node('time',clock(e.t)),node('span',e.title),node('em',`${e.kind} · frame ${e.frame}`));b.addEventListener('click',()=>selectEvent(e));$('events').append(b);}const i=pool.findIndex(e=>e.id===selection?.id);$('previousRecord').disabled=i<=0;$('nextRecord').disabled=i<0||i>=pool.length-1;$('recordPosition').textContent=i<0?'Selected record is outside this filter':`Record ${i+1} of ${pool.length}`;}
function selectEvent(e,opts={}){
  if(!e)return;selection=e;chapterIndex=Math.max(0,EPISODE.chapters.findLastIndex(c=>c.t<=e.t));
  const c=EPISODE.chapters[chapterIndex],bounds=chapterBounds(chapterIndex),s=stateAt(e.t);
  const final=e.id==='state-2789'||e.id==='robot:1924634d-2fd6-47ae-b9d2-a3c874963e68';
  $('chapterNum').textContent=`${String(chapterIndex+1).padStart(2,'0')} / 7 · EDITORIAL NOTE`;$('chapterTitle').textContent=c.headline;$('chapterNote').textContent=c.note;
  $('chapterWindow').textContent=`${c.title} · video ${clock(bounds.startFrame/30)}–${clock(bounds.endFrame/30)} · wall ${clock(bounds.start)}–${clock(bounds.end)}`;
  $('previous').disabled=chapterIndex===0;$('next').disabled=chapterIndex===6;
  $('origin').textContent=origins[e.kind];$('origin').className=`origin ${e.kind}`;$('eventTitle').textContent=e.title;
  let body,note;
  if(e.kind==='summary'){body=e.excerpt;note='Full returned summary. This is a partial API record, not complete internal reasoning. Treat its descriptions as model claims.';}
  else if(e.kind==='model'){body='No readable summary was returned for this model request.';note=`Recorded duration ${((e.end??e.t)-e.t).toFixed(2)} s; status ${e.status}. Missing text does not mean no reasoning occurred.`;}
  else if(e.kind==='state'){body=`Left grasp: ${s.left?'poster.n.01_1':'none'}\nRight grasp: ${s.right?'poster.n.01_1':'none'}\nGoal: ${s.goal===null?'not evaluated':s.goal?'satisfied':'unsatisfied'}`;note='Evaluator-only evidence; not supplied to the agent.';}
  else if(e.kind==='context'){body='A context compaction is recorded here.';note='The source has no result payload for this span. Its contents are not inferred.';}
  else{body=final?'Rollout closed/reset; terminal action acknowledgement unknown':`${e.title} · status ${e.status}\n${e.end===null?'End time unavailable':`Duration ${(e.end-e.t).toFixed(2)} s wall time`}\nStart frame ${e.frame}`;note='Original arguments and returned results are available below. A completed call does not establish task success.';}
  $('evidence').textContent=body;$('evidenceNote').textContent=note;$('missingEvidence').textContent='Original source fields are retained below; observation/action associations are explicitly labeled.';$('terminal').hidden=!final;
  $('rawRecord').textContent=pretty(e.raw);$('wallClock').textContent=clock(e.t);$('simClock').textContent=clock(e.frame/30);$('alignment').textContent=opts.fromVideo?'nearest recorded event':'recorded anchor';$('frameLabel').textContent=`FRAME ${e.frame} / ${EPISODE.lastFrame}`;
  setDiagram(s);$('sourceDetails').replaceChildren();detail('Original record ID',e.id);detail('Wall start',`${e.t.toFixed(6)} s`);detail('Video anchor',`frame ${e.frame}; ${(e.frame/30).toFixed(3)} s`);detail('Evaluator snapshot',`step ${s.step}, wall ${s.t.toFixed(6)} s; most recent state at or before this event`);detail('Source','Full prepared review/agent export. 246 spans, 2790 evaluator states, 108 observation images. Nanosecond integers are stored as strings to preserve precision.');
  $('permalink').href=`#event=${encodeURIComponent(e.id)}`;
  document.querySelectorAll('.chapter').forEach((b,i)=>b.setAttribute('aria-current',String(i===chapterIndex)));
  document.querySelectorAll('[data-event]').forEach(b=>{const yes=b.dataset.event===e.id;b.setAttribute('aria-current',String(yes));b.classList.toggle('selected',yes);});
  document.querySelectorAll('.cursor').forEach(cur=>cur.style.left=`${e.t/TRACE.duration*100}%`);
  if(!opts.fromVideo&&mediaReady){$('video').pause();$('video').currentTime=Math.min(e.frame/30,$('video').duration);}
  if(!opts.fromHistory&&!opts.fromVideo)history.pushState(null,'',`#event=${encodeURIComponent(e.id)}`);
  renderChain(e);renderList();
}
function chooseChapter(i){const c=EPISODE.chapters[i];if(c){$('scope').value='chapter';selectEvent(eventMap.get(c.event));}}
EPISODE.chapters.forEach((c,i)=>{const b=node('button',undefined,'chapter');b.append(node('span',`${String(i+1).padStart(2,'0')} `),document.createTextNode(c.title));b.addEventListener('click',()=>chooseChapter(i));$('chapters').append(b);});
$('previous').addEventListener('click',()=>chooseChapter(chapterIndex-1));$('next').addEventListener('click',()=>chooseChapter(chapterIndex+1));$('portal').href=EPISODE.portal;
$('inspectAction').addEventListener('click',()=>selectEvent(chainAction));
for(const [kind,title] of [['model','Model · 90'],['tool','Tools · 102'],['robot','Robot · 53'],['context','Context · 1'],['state','Evaluator · 6']]){const lane=node('div',undefined,'lane'),track=node('div',undefined,'track');lane.append(node('span',title,'lanename'),track);events.filter(e=>e.kind===kind||(kind==='model'&&e.kind==='summary')).forEach(e=>{const b=node('button',undefined,`span ${e.kind}`);b.dataset.event=e.id;b.style.left=`${e.t/TRACE.duration*100}%`;if(e.kind!=='state')b.style.width=`${((e.end??TRACE.duration)-e.t)/TRACE.duration*100}%`;b.setAttribute('aria-label',`${e.title}, ${clock(e.t)} wall time`);b.title=`${e.title} · ${clock(e.t)} · ${e.status||'state'}`;b.addEventListener('click',()=>selectEvent(e));track.append(b);});track.append(node('div',undefined,'cursor'));$('lanes').append(lane);}
for(const id of ['filter','scope'])$(id).addEventListener('change',renderList);
$('searchRecords')?.addEventListener('input',renderList);
for(const [id,direction] of [['previousRecord',-1],['nextRecord',1]])$(id).addEventListener('click',()=>{const p=visibleRecords(),i=p.findIndex(e=>e.id===selection.id);if(i>=0)selectEvent(p[i+direction]);});
function showDiagram(show){diagramVisible=show;$('schematic').hidden=!show;$('video').hidden=show;$('visualLabel').textContent=show?'EVALUATOR STATE · SCHEMATIC':'ORIGINAL EPISODE VIDEO';$('showState').textContent=show?'Show video':'Show diagram';if(show)$('video').pause();}
$('showState').addEventListener('click',()=>showDiagram(!diagramVisible));
$('videoFile').addEventListener('change',()=>{const f=$('videoFile').files[0];if(!f)return;if(mediaURL)URL.revokeObjectURL(mediaURL);mediaReady=false;mediaURL=URL.createObjectURL(f);$('video').src=mediaURL;$('mediaTitle').textContent='Checking video…';$('video').load();});
$('video').addEventListener('loadedmetadata',()=>{const v=$('video'),expected=(EPISODE.lastFrame+1)/30;if(!Number.isFinite(v.duration)||Math.abs(v.duration-expected)>.25){mediaReady=false;$('mediaTitle').textContent='Video duration does not match';$('mediaNote').textContent=`Expected ${expected.toFixed(2)} s; this file is ${v.duration.toFixed(2)} s. Synchronization is disabled.`;$('showState').hidden=true;showDiagram(true);return;}mediaReady=true;$('mediaTitle').textContent=mediaURL?'Local replacement attached':'Original rollout connected';$('mediaNote').textContent='92.97 s at 30 fps. Selecting a record seeks to its frame. Playback uses the recorded evaluator frame intervals.';$('showState').hidden=false;showDiagram(false);v.currentTime=selection.frame/30;});
$('video').addEventListener('error',()=>{mediaReady=false;$('mediaTitle').textContent='Video unavailable';$('mediaNote').textContent='Keep the media folder beside this page, or attach the matching episode video.';$('showState').hidden=true;showDiagram(true);});
$('video').addEventListener('play',()=>{playbackChapter=$('chapterOnly').checked?chapterIndex:null;if(playbackChapter!==null){const b=chapterBounds(playbackChapter),v=$('video');if(v.currentTime<b.startFrame/30||v.currentTime>=b.endFrame/30)v.currentTime=b.startFrame/30;}});
$('chapterOnly').addEventListener('change',()=>playbackChapter=$('chapterOnly').checked?chapterIndex:null);
$('video').addEventListener('timeupdate',()=>{const v=$('video');if(!mediaReady||v.paused)return;const b=playbackChapter===null?null:chapterBounds(playbackChapter);if(b&&v.currentTime>=b.endFrame/30){v.pause();v.currentTime=(b.endFrame-1)/30;}else if(b&&v.currentTime<b.startFrame/30)v.currentTime=b.startFrame/30;const frame=Math.min(EPISODE.lastFrame,Math.floor(v.currentTime*30)),pool=playbackChapter===null?events:chapterRecords(playbackChapter);const nearest=pool.filter(e=>e.frame<=frame).sort((a,b)=>b.frame-a.frame||a.t-b.t)[0];if(nearest&&nearest.id!==selection.id)selectEvent(nearest,{fromVideo:true});const interval=frameIntervals[frame];$('frameLabel').textContent=`VIDEO FRAME ${frame} · SELECTED EVENT ANCHOR ${selection.frame}`;$('simClock').textContent=clock(frame/30);$('alignment').textContent='recorded frame interval';$('wallClock').textContent=`${clock(interval.start)}–${clock(interval.end)}`;setDiagram(stateAt(interval.start));});
function restore(){const id=new URLSearchParams(location.hash.slice(1)).get('event');if(id||!selection)selectEvent(eventMap.get(id)||eventMap.get(EPISODE.chapters[0].event),{fromHistory:true});}
window.addEventListener('popstate',restore);window.addEventListener('hashchange',restore);restore();
$('video').src='media/episode.mp4';$('video').load();
