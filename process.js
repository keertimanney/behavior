'use strict';
// Process overlay. The video only advances while the robot moves; between moves the
// frame stands still while Astra looks, thinks and writes code. During playback this
// holds each such frame and replays the recorded computation in compressed form:
// Observe → Think → Code → Act. Every card is built from a trace record.
const PROCESS_STAGES=[['observe','Observe'],['think','Think'],['code','Code'],['act','Act']];
const STEP_SECONDS={observe:1.1,think:1.3,code:1.3,act:1.1,skip:.8};
const actIntent=c=>(/intent=(['"])(.*?)\1/.exec(c||'')||[])[2];
const isActCall=r=>/\bs\.act\(/.test(r.raw.arguments?.command||'');
const firstSentence=s=>{const t=s.replace(/\s+/g,' ').trim();const m=/^(.{20,180}?[.!?])(\s|$)/.exec(t);return m?m[1]:t.length>180?t.slice(0,177)+'…':t;};
function statusLine(r){
  const text=(r.raw.result?.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('\n');
  const line=text.split('\n').find(l=>/status=\w+/.test(l));return line?/status=(\w+)/.exec(line)[1]:null;
}
function codeLines(r){
  if(r.raw.arguments?.path)return [`# read ${r.raw.arguments.path}`];
  return pythonBody(r.raw.arguments?.command||'').split('\n').filter(l=>l.trim()&&!/^\s*(import|from)\s/.test(l)).slice(0,6);
}
function buildHolds(){
  const byFrame=new Map();
  for(const r of TRACE.records){if(!['model','summary','tool','robot'].includes(r.kind))continue;if(!byFrame.has(r.frame))byFrame.set(r.frame,[]);byFrame.get(r.frame).push(r);}
  const observations=TRACE.records.filter(r=>r.kind==='tool'&&r.images.length&&r.end!==null).sort((a,b)=>a.end-b.end);
  const holds=[];
  for(const [frame,records] of [...byFrame].sort((a,b)=>a[0]-b[0])){
    const interval=intervals[frame];if(!interval)continue;
    records.sort((a,b)=>a.t-b.t);
    const obs=observations.filter(r=>r.end<=records[0].t+.05).at(-1),middle=[];let act=null;
    for(const r of records){
      if(r.kind==='model'||r.kind==='summary'){
        const prev=middle.at(-1),summary=r.kind==='summary'?r.excerpt:'';
        if(prev?.stage==='think'){prev.tokens+=r.raw.usage?.output||0;if(summary&&!prev.summary)Object.assign(prev,{summary,source:r});continue;}
        middle.push({stage:'think',t:r.t,source:r,summary,tokens:r.raw.usage?.output||0});
      }else if(r.kind==='tool'){
        middle.push({stage:'code',t:r.t,source:r,lines:codeLines(r)});
        if(isActCall(r))act={stage:'act',t:r.t,source:r,intent:actIntent(r.raw.arguments.command)};
      }else if(r.kind==='robot'&&act)act.robot=r;
    }
    // Long stretches (the alignment chapter has 13 records on one frame) keep their shape but not every round.
    let shown=middle;
    if(middle.length>5)shown=[...middle.slice(0,2),{stage:'skip',t:middle[2].t,count:middle.length-4},...middle.slice(-2)];
    const steps=[];
    if(obs)steps.push({stage:'observe',t:records[0].t,source:obs,image:obs.images[0],status:statusLine(obs)});
    steps.push(...shown);if(act)steps.push(act);
    // Each step advances the wall clock to the next step's real start time.
    steps.forEach((s,i)=>{s.wallFrom=i===0?interval.start:Math.max(interval.start,s.t);});
    steps.forEach((s,i)=>{s.wallTo=i<steps.length-1?steps[i+1].wallFrom:interval.end;});
    holds.push({frame,interval,steps,act});
  }
  return holds;
}
const holds=buildHolds();
const holdAt=new Map(holds.map(h=>[h.frame,h]));
const frameOf=t=>Math.min(2788,Math.max(0,Math.floor(t*30+.0001)));

// Overlay DOM, layered over the video.
const procRoot=make('div',undefined,'procOverlay');procRoot.setAttribute('aria-hidden','true');
const procStages=make('ol',undefined,'procStages');
for(const [key,label] of PROCESS_STAGES){const li=make('li',label);li.dataset.stage=key;procStages.append(li);}
const procFreeze=make('div',undefined,'procFreeze');procFreeze.append(make('span','Frame held','procFreezeTag'),make('strong'),make('i',undefined,'procFreezeBar'));
const procCard=make('div',undefined,'procCard');
const procCaption=make('p',undefined,'procCaption');
procRoot.append(procStages,procFreeze,procCard,procCaption);
el('rollout').closest('.screen').append(procRoot);
const procLive=make('p',undefined,'sr-only');procLive.setAttribute('aria-live','polite');el('rollout').closest('.screen').append(procLive);

let holding=null,armedFrom=frameOf(video.currentTime),internalSeek=false,tickHandle=0,shownStep=-1;
let processOn=true;try{processOn=localStorage.getItem('astra-process')!=='off';}catch{}
el('processToggle').checked=processOn;
function processHolding(){return !!holding;}

function setStage(stage){procStages.querySelectorAll('li').forEach(li=>li.classList.toggle('on',li.dataset.stage===stage));procRoot.dataset.stage=stage||'';}
function renderCard(step,hold){
  procCard.replaceChildren();procCard.dataset.stage=step.stage;
  const head=make('p',undefined,'procCardHead');head.append(make('b',{observe:'Observe',think:'Think',code:'Code',act:'Act',skip:'Think ⇄ Code'}[step.stage]),make('span',`${time(step.wallFrom)} wall`));procCard.append(head);
  if(step.stage==='observe'){
    const img=make('img');img.src=step.image;img.alt='';procCard.append(img);
    procCard.append(make('p',step.status?`New camera image and telemetry. Last motion: ${step.status}.`:'New camera image and telemetry arrive.'));
  }else if(step.stage==='think'){
    if(step.summary){const title=/^\*\*(.*?)\*\*/.exec(step.summary)?.[1];if(title)procCard.append(make('strong',title));procCard.append(make('p',`“${firstSentence(step.summary.replace(/^\*\*.*?\*\*\s*/,''))}”`,'procQuote'));}
    else procCard.append(make('p',`The model reasons about what it saw${step.tokens?` (${step.tokens} output tokens)`:''}. Its text was not returned.`));
  }else if(step.stage==='code'){
    const pre=make('pre');pre.textContent=step.lines.join('\n');procCard.append(pre);
    procCard.append(make('p',isActCall(step.source)?'Python that sends a robot command':step.source.raw.arguments?.path?'Reads a reference file':'Python run in the sandbox: geometry, IK or inspection','procNote'));
  }else if(step.stage==='skip'){
    procCard.append(make('p',`${step.count} more rounds of reasoning and code at this frame.`));
  }else{
    procCard.append(make('strong',step.intent||'Robot command'),make('p','The robot moves: the video resumes.','procNote'));
  }
  procLive.textContent=`${head.firstChild.textContent}: ${procCard.textContent.slice(head.textContent.length)}`;
}
function captionFor(frame){
  const h=holdAt.get(frame);
  if(h&&video.paused)return `The robot stood here for ${(h.interval.end-h.interval.start).toFixed(0)} s of wall time while Astra worked. Press play to see how.`;
  const last=holds.filter(x=>x.frame<=frame).at(-1);
  return last?.act?.intent?`Executing: ${last.act.intent}`:'';
}
function paintIdle(){
  if(holding)return;
  procRoot.classList.toggle('off',!processOn);procRoot.classList.remove('holding');
  if(!processOn)return;
  const f=frameOf(video.currentTime);procCaption.textContent=captionFor(f);
  setStage(video.paused&&holdAt.has(f)?null:procCaption.textContent?'act':null);
}

function startHold(h){
  holding={hold:h,start:performance.now(),rate:video.playbackRate||1};shownStep=-1;
  procRoot.classList.add('holding');
  video.pause();
  if(frameOf(video.currentTime)!==h.frame){internalSeek=true;video.currentTime=(h.frame+.5)/30;}
  cancelAnimationFrame(tickHandle);tickHandle=requestAnimationFrame(animateHold);
}
function stopHold(){if(!holding)return;holding=null;cancelAnimationFrame(tickHandle);paintIdle();refreshClock();updatePlayButton();}
function animateHold(now){
  if(!holding)return;
  const {hold,start,rate}=holding,elapsed=(now-start)/1000*rate;
  let acc=0,i=0;for(;i<hold.steps.length;i++){const d=STEP_SECONDS[hold.steps[i].stage];if(elapsed<acc+d)break;acc+=d;}
  if(i>=hold.steps.length){
    holding=null;armedFrom=hold.frame+1;paintIdle();
    video.play().catch(()=>paintIdle());return;
  }
  const step=hold.steps[i],within=Math.min(1,(elapsed-acc)/STEP_SECONDS[step.stage]);
  if(i!==shownStep){shownStep=i;renderCard(step,hold);setStage(step.stage==='skip'?'think':step.stage);procCaption.textContent='';}
  const wall=step.wallFrom+(step.wallTo-step.wallFrom)*within;
  el('wallClock').textContent=time(wall);
  procFreeze.querySelector('strong').textContent=`+${(wall-hold.interval.start).toFixed(1)} s wall · video stopped`;
  procFreeze.querySelector('.procFreezeBar').style.setProperty('--p',`${(wall-hold.interval.start)/(hold.interval.end-hold.interval.start)*100}%`);
  tickHandle=requestAnimationFrame(animateHold);
}
// While playing, poll every animation frame so a hold lands on its exact frame.
function watchPlayback(){
  if(video.paused||holding)return;
  const f=frameOf(video.currentTime);
  if(processOn){
    const segmentEnd=playingMoment?moments[active].endFrame:Infinity;
    const next=holds.find(h=>h.frame>=armedFrom&&h.frame<=f&&h.frame<segmentEnd);
    if(next){startHold(next);return;}
  }
  armedFrom=Math.max(armedFrom,f+1);
  procCaption.textContent=processOn?captionFor(f):'';
  tickHandle=requestAnimationFrame(watchPlayback);
}
video.addEventListener('play',()=>{if(holding)stopHold();paintIdle();cancelAnimationFrame(tickHandle);tickHandle=requestAnimationFrame(watchPlayback);});
video.addEventListener('pause',()=>{if(!holding)paintIdle();});
// Any seek the overlay did not make (scrubber, chapter, evidence, replay) ends a hold and re-arms from the new frame.
video.addEventListener('seeking',()=>{if(internalSeek)return;stopHold();armedFrom=frameOf(video.currentTime);paintIdle();});
video.addEventListener('seeked',()=>{if(internalSeek){internalSeek=false;if(holding)el('wallClock').textContent=time(holding.hold.interval.start);return;}paintIdle();});
video.addEventListener('ended',stopHold);
el('processToggle').addEventListener('change',e=>{processOn=e.target.checked;try{localStorage.setItem('astra-process',processOn?'on':'off');}catch{}
  if(!processOn&&holding){const h=holding.hold;stopHold();armedFrom=h.frame+1;video.play().catch(()=>{});}else paintIdle();});
// Pressing pause during a hold stops there; pressing play again replays that hold.
el('togglePlayback').addEventListener('click',e=>{if(!holding)return;e.stopImmediatePropagation();armedFrom=holding.hold.frame;stopHold();},true);
paintIdle();
