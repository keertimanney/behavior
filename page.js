'use strict';
// One rollout, three views: the video with a per-move panel, a two-clock chart, and a table.
// Everything is derived from TRACE (full-data.js); only the phase names and captions are written by hand.
(() => {
  const FPS = 30;
  const $ = id => document.getElementById(id);
  const make = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const SVG = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs = {}, text) => {
    const n = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text != null) n.textContent = text;
    return n;
  };
  const clock = (s, round = Math.floor) => {
    s = Math.max(0, round(s));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const span = s => {
    s = Math.round(s);
    if (s < 60) return `${s} s`;
    const m = Math.floor(s / 60), r = s % 60;
    return r ? `${m} min ${r} s` : `${m} min`;
  };

  // ---- Data -------------------------------------------------------------
  const records = TRACE.records;
  const states = TRACE.states;
  const DURATION = TRACE.duration;
  const LAST = states.at(-1).frame;
  const VIDEO_TOTAL = clock((LAST + 1) / FPS, Math.round), WALL_TOTAL = clock(DURATION, Math.round);

  // Wall time when each frame first appeared, and the evaluator state last recorded on it.
  const frameWall = [], frameState = [];
  for (const s of states) {
    if (frameWall[s.frame] === undefined) frameWall[s.frame] = s.t;
    frameState[s.frame] = s;
  }
  for (let f = 1; f <= LAST; f++) {
    if (frameWall[f] === undefined) frameWall[f] = frameWall[f - 1];
    if (frameState[f] === undefined) frameState[f] = frameState[f - 1];
  }
  const robotCalls = records.filter(r => r.kind === 'robot').sort((a, b) => a.t - b.t);
  const acts = robotCalls.filter(r => /act/i.test(r.title));

  // Each robot command: when it was issued, where its clip starts, the controller's verdict,
  // when Astra started working on it (the end of the previous command), its stated intent,
  // and any reasoning summaries returned while it was being worked out.
  const intentOf = robot => {
    const tool = records.filter(r => r.kind === 'tool' && r.t <= robot.t + .01 && robot.t - r.t < 1
      && /\bs\.act\(/.test(r.raw.arguments?.command || '')).at(-1);
    return (/intent=(['"])(.*?)\1/.exec(tool?.raw.arguments?.command || '') || [])[2] || '';
  };
  let prevEnd = 0;
  const moves = acts.map(robot => {
    const move = {
      from: prevEnd, start: robot.t, startFrame: robot.frame,
      reason: robot.raw.result?.act_result?.reason || '',
      intent: intentOf(robot),
      summaries: records.filter(r => r.kind === 'summary' && r.t >= prevEnd && r.t < robot.t),
    };
    prevEnd = robot.end ?? DURATION;
    return move;
  });

  // Phases start at the first move issued after these wall times (seconds).
  const PHASES = [
    { at: 0, name: 'Find the poster', short: 'Find poster' },
    { at: 450, name: 'Pick it up', short: 'Pick up' },
    { at: 670, name: 'Turn it right way up', short: 'Turn upright' },
    { at: 1000, name: 'Hand it over', short: 'Hand over' },
    { at: 1130, name: 'Find the nail', short: 'Find nail' },
    { at: 1420, name: 'Hang it', short: 'Hang it' },
  ];
  // The narration: a handful of beats, each anchored to the first frame of one move, written from
  // Astra's stated intents and the evaluator states. Playback stops on each so it can be read.
  const BEATS = [
    [0, 'Astra starts facing the living room. Its first move turns the robot to survey the kitchen behind it.'],
    [240, 'It finds the poster lying flat on the counter. Several turns stall on the way, and each time Astra re-plans from a fresh camera image instead of repeating the command.'],
    [431, 'It squares up to the poster’s long edge and raises the open left hand beside it.'],
    [652, 'The fingers slide in behind the near edge of the poster, staying clear of the counter.'],
    [698, 'The left hand closes on the edge. Astra then lifts and backs away to check that the grasp holds.'],
    [807, 'The print is upside down. Astra tries to turn the poster upright, but the wrist move stalls.'],
    [1065, 'It tries a different arm pose. This stalls too, and the next combined wrist turn times out.'],
    [1234, 'Splitting the rotation into separate roll and yaw moves works. The poster is now the right way up.'],
    [1302, 'Astra passes the poster to the right hand. The right gripper reaches the far edge and closes first…'],
    [1452, '…and only then does the left hand let go. For a moment the evaluator records both hands holding it.'],
    [1474, 'With the poster in its right hand, Astra stows the empty arm and surveys the walls for the nail.'],
    [1993, 'It has found the nail, on the wall right of the glass door. Before moving, it read alignment notes saved during practice. Now it squares up and drives to a stand-off.'],
    [2341, 'At the wall, it raises the poster to nail height and brings it close, keeping about six centimetres of clearance.'],
    [2513, 'It edges the poster toward the nail in small pushes, checking after each one. Seven of these probes time out without the poster catching.'],
    [2709, 'Astra backs off and lowers the poster to expose the nail, then recomputes the alignment from a fresh depth image.'],
    [2765, 'The final move hooks the poster on the nail, and the evaluator marks the task complete.'],
  ].map(([frame, text], k) => ({ frame, text, k }));
  for (const b of BEATS) if (!moves.some(m => m.startFrame === b.frame)) console.warn(`Beat at frame ${b.frame} is not on a move start`);
  const beatAtFrame = f => BEATS.findLast(b => f >= b.frame) || BEATS[0];

  PHASES.forEach((p, k) => {
    p.n = k + 1;
    p.moves = moves.filter(m => m.start >= p.at && (k === PHASES.length - 1 || m.start < PHASES[k + 1].at));
  });
  PHASES.forEach((p, k) => {
    const next = PHASES[k + 1];
    p.startFrame = k === 0 ? 0 : p.moves[0].startFrame;
    p.endFrame = next ? next.moves[0].startFrame : LAST;
    p.wallStart = k === 0 ? 0 : p.moves[0].from;
    p.wallEnd = next ? next.moves[0].from : DURATION;
    p.stalled = p.moves.filter(m => m.reason === 'stalled').length;
    p.timeouts = p.moves.filter(m => m.reason === 'timeout').length;
  });
  for (const p of PHASES) if (!BEATS.some(b => b.frame === p.startFrame)) console.warn(`Phase ${p.n} has no caption at its start`);
  const moveAtFrame = f => {
    let found = 0;
    moves.forEach((m, i) => { if (m.startFrame <= f) found = i; });
    return found;
  };
  const phaseAtFrame = f => PHASES.findLast(p => f >= p.startFrame) || PHASES[0];

  // Headline numbers.
  $('summaryCount').textContent = records.filter(r => r.kind === 'summary').length;
  $('modelCount').textContent = records.filter(r => r.kind === 'model' || r.kind === 'summary').length;
  const movingSeconds = robotCalls.reduce((sum, r) => sum + ((r.end ?? DURATION) - r.t), 0);
  $('statVideo').textContent = VIDEO_TOTAL;
  $('statWall').textContent = `${Math.round(DURATION / 60)} min`;
  $('statStill').textContent = `${Math.round((1 - movingSeconds / DURATION) * 100)}%`;

  // ---- Player -----------------------------------------------------------
  // One channel: the video, a subtitle for the current beat, and the phase timeline.
  const video = $('video');
  const strip = $('strip');
  const caption = $('caption');
  let shownPhase = -1, shownBeat = -1, shownMove = -1, holdTimer = null;
  let dragging = false, resume = false;

  const segs = PHASES.map(p => {
    const b = make('button', 'seg');
    b.type = 'button';
    b.style.flex = `${p.endFrame - p.startFrame} 1 0`;
    b.append(make('b', null, p.n), make('span', null, p.short));
    b.setAttribute('aria-label', `Phase ${p.n}: ${p.name}`);
    for (const m of p.moves) {
      if (m.startFrame === p.startFrame) continue;
      const tick = make('i');
      tick.style.left = `${(m.startFrame - p.startFrame) / (p.endFrame - p.startFrame) * 100}%`;
      b.append(tick);
    }
    b.addEventListener('click', e => { if (e.detail === 0) playFrom(p.startFrame); });
    strip.append(b);
    return b;
  });
  const fitStrip = () => segs.forEach(b => {
    b.classList.remove('tight');
    if (b.scrollWidth > b.clientWidth + 1) b.classList.add('tight');
  });

  const seekFrame = f => { video.currentTime = Math.min(LAST, Math.max(0, f)) / FPS + .001; };
  const clearLink = () => { if (location.hash) history.replaceState(null, '', location.pathname + location.search); };

  // When playback crosses into a new beat, hold the frame long enough to read the caption.
  function showBeat(b) {
    shownBeat = b.k;
    const p = phaseAtFrame(b.frame);
    $('captionPhase').textContent = `${p.n} · ${p.name}`;
    $('captionText').textContent = b.text;
  }
  function stopHold() {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
    caption.classList.remove('holding');
  }
  function hold(b) {
    const ms = Math.min(9000, 2000 + b.text.length * 40);
    holdTimer = -1; // marks the hold before pause() fires its event
    video.pause();
    seekFrame(b.frame);
    const bar = $('holdBar');
    bar.style.transition = 'none';
    bar.style.width = '0';
    void bar.offsetWidth;
    bar.style.transition = `width ${ms}ms linear`;
    bar.style.width = '100%';
    caption.classList.add('holding');
    holdTimer = setTimeout(() => { stopHold(); video.play().catch(() => {}); }, ms);
  }

  function playFrom(frame) {
    stopHold();
    clearLink();
    seekFrame(frame);
    video.play().catch(() => {});
  }
  function goBeat(k) {
    k = Math.max(0, Math.min(BEATS.length - 1, k));
    stopHold();
    clearLink();
    video.pause();
    seekFrame(BEATS[k].frame);
    update();
  }

  // Drag or click anywhere on the timeline to scrub.
  const stripFrame = e => {
    const r = strip.getBoundingClientRect();
    return Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * LAST);
  };
  strip.addEventListener('pointerdown', e => {
    resume = !video.paused || !!holdTimer;
    stopHold();
    dragging = true;
    video.pause();
    strip.setPointerCapture(e.pointerId);
    seekFrame(stripFrame(e));
    update();
  });
  strip.addEventListener('pointermove', e => { if (dragging) { seekFrame(stripFrame(e)); update(); } });
  const endDrag = () => { if (!dragging) return; dragging = false; if (resume) video.play().catch(() => {}); };
  strip.addEventListener('pointerup', endDrag);
  strip.addEventListener('pointercancel', endDrag);

  const toggle = () => {
    if (holdTimer) { stopHold(); update(); return; }
    if (video.paused) {
      clearLink();
      if (video.ended || video.currentTime >= LAST / FPS - .05) seekFrame(0);
      video.play().catch(() => {});
    } else video.pause();
  };
  $('play').addEventListener('click', toggle);
  $('bigPlay').addEventListener('click', toggle);
  video.addEventListener('click', toggle);
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    const r = $('rollout').getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); goBeat(frameNow() > BEATS[shownBeat].frame + 15 ? shownBeat : shownBeat - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goBeat(shownBeat + 1); }
  });

  // ---- Command card -----------------------------------------------------
  // Always the one command behind what is on screen; the arrows step through them and pause there.
  const OUTCOME = { reached: ['✓ reached', ''], stalled: ['‖ stalled', 'stalled'], timeout: ['⧗ timed out', 'timeout'] };
  function showCommand(i) {
    const m = moves[i];
    const thinks = $('cmdThinks');
    thinks.replaceChildren();
    for (const s of m.summaries) {
      // Only the title shows; the verbatim body is often garbled, so it stays one click away.
      const text = (s.raw.summary || s.excerpt || '').trim();
      const head = /^\*\*(.+?)\*\*\s*/.exec(text);
      const d = make('details', 'think');
      d.append(make('summary', null, head ? head[1] : 'Reasoning summary'));
      const body = make('div');
      for (const para of text.slice(head ? head[0].length : 0).split(/\n\s*\n/)) if (para.trim()) body.append(make('p', null, para.trim()));
      d.append(body);
      thinks.append(d);
    }
    $('cmdText').textContent = m.intent || '(no stated intent)';
    const [label, cls] = OUTCOME[m.reason] || (i === moves.length - 1 ? ['✓ goal met', ''] : [m.reason || 'no result', '']);
    $('cmdMeta').replaceChildren(`Astra’s command ${i + 1} of ${moves.length} · thought ${span(m.start - m.from)} · `, make('span', cls, label));
    $('cmdPrev').disabled = i === 0;
    $('cmdNext').disabled = i === moves.length - 1;
  }
  const goMove = i => {
    stopHold();
    clearLink();
    video.pause();
    seekFrame(moves[Math.max(0, Math.min(moves.length - 1, i))].startFrame);
    update();
  };
  $('cmdPrev').addEventListener('click', () => goMove(shownMove - 1));
  $('cmdNext').addEventListener('click', () => goMove(shownMove + 1));

  const frameNow = () => Math.min(LAST, Math.max(0, Math.floor(video.currentTime * FPS + 1e-4)));
  function update() {
    const f = frameNow();
    $('playhead').style.left = `${f / LAST * 100}%`;
    $('videoClock').textContent = `${clock(video.currentTime)} / ${VIDEO_TOTAL}`;
    $('wallClock').textContent = clock(frameWall[f]);

    const p = phaseAtFrame(f);
    if (p.n !== shownPhase) {
      shownPhase = p.n;
      segs.forEach((b, k) => { b.classList.toggle('active', k === p.n - 1); b.setAttribute('aria-current', String(k === p.n - 1)); });
      document.querySelectorAll('#chart .phase').forEach((g, k) => g.classList.toggle('active', k === p.n - 1));
    }
    const moving = !video.paused && !video.ended;
    const beat = beatAtFrame(f);
    if (beat.k !== shownBeat) {
      showBeat(beat);
      // Stop only when playback reaches a caption, not after a jump into the middle of one.
      if (moving && !dragging && f - beat.frame < 20) hold(beat);
    }

    const mi = moveAtFrame(f);
    if (mi !== shownMove) { shownMove = mi; showCommand(mi); }

    const playing = moving || !!holdTimer;
    $('play').textContent = playing ? '❚❚' : '▶';
    $('play').setAttribute('aria-label', playing ? 'Pause' : 'Play');
    video.closest('.screen').classList.toggle('playing', playing);
  }
  const tick = () => {
    update();
    if (!video.paused) requestAnimationFrame(tick);
  };
  video.addEventListener('play', () => requestAnimationFrame(tick));
  for (const ev of ['pause', 'seeked', 'loadedmetadata', 'ended']) video.addEventListener(ev, update);

  // ---- Two-clock chart --------------------------------------------------
  const chart = $('chart'), tip = $('tooltip');
  const describe = p => `<b>${p.n} · ${p.name}</b>${span((p.endFrame - p.startFrame) / FPS)} of video · ${span(p.wallEnd - p.wallStart)} of real time<br>${p.moves.length} moves · ${p.stalled} stalled · ${p.timeouts} timed out`;
  function drawChart() {
    const W = chart.clientWidth;
    if (!W) return;
    const narrow = W < 560;
    const L = narrow ? 0 : 92, R = W - 2;
    const topY = narrow ? 22 : 4, barH = 26, botY = topY + barH + 64, H = botY + barH + (narrow ? 46 : 26);
    const xv = f => L + f / LAST * (R - L);
    const xw = t => L + t / DURATION * (R - L);
    const root = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Video time and real time for each phase. See the table for values.' });

    if (narrow) {
      root.append(svg('text', { x: 0, y: 14, class: 'rowLabel' }, `Video · ${VIDEO_TOTAL}`));
      root.append(svg('text', { x: 0, y: H - 4, class: 'rowLabel' }, `Real time · ${WALL_TOTAL}`));
    } else {
      root.append(svg('text', { x: 0, y: topY + 12, class: 'rowLabel' }, 'Video'));
      root.append(svg('text', { x: 0, y: topY + 27, class: 'rowSub' }, VIDEO_TOTAL));
      root.append(svg('text', { x: 0, y: botY + 12, class: 'rowLabel' }, 'Real time'));
      root.append(svg('text', { x: 0, y: botY + 27, class: 'rowSub' }, WALL_TOTAL));
    }

    const clipId = 'wallclip';
    const defs = svg('defs');
    root.append(defs);

    PHASES.forEach((p, k) => {
      const g = svg('g', { class: 'phase', tabindex: 0, role: 'button', 'aria-label': `Play phase ${p.n}, ${p.name}` });
      const a0 = xv(p.startFrame) + (k ? 1 : 0), a1 = xv(p.endFrame) - (k < PHASES.length - 1 ? 1 : 0);
      const b0 = xw(p.wallStart) + (k ? 1 : 0), b1 = xw(p.wallEnd) - (k < PHASES.length - 1 ? 1 : 0);
      g.append(svg('path', { class: 'band', d: `M${a0},${topY + barH} L${a1},${topY + barH} L${b1},${botY} L${b0},${botY} Z` }));
      g.append(svg('rect', { class: 'moving', x: a0, y: topY, width: Math.max(1, a1 - a0), height: barH, rx: 4 }));
      if (a1 - a0 > 16) g.append(svg('text', { x: (a0 + a1) / 2, y: topY + 17, 'text-anchor': 'middle', class: 'num', style: 'fill: var(--on-moving)' }, p.n));

      // Real-time bar: still background with robot motion slivers, clipped to rounded ends.
      const cid = `${clipId}${k}`;
      const cp = svg('clipPath', { id: cid });
      cp.append(svg('rect', { x: b0, y: botY, width: Math.max(1, b1 - b0), height: barH, rx: 4 }));
      defs.append(cp);
      const wall = svg('g', { 'clip-path': `url(#${cid})` });
      wall.append(svg('rect', { class: 'still', x: b0, y: botY, width: Math.max(1, b1 - b0), height: barH }));
      for (const r of robotCalls) {
        const t0 = Math.max(r.t, p.wallStart), t1 = Math.min(r.end ?? DURATION, p.wallEnd);
        if (t1 > t0) wall.append(svg('rect', { class: 'moving', x: xw(t0), y: botY, width: Math.max(1, xw(t1) - xw(t0)), height: barH }));
      }
      g.append(wall);
      const name = `${p.n} ${p.short}`;
      const room = b1 - b0;
      g.append(svg('text', { x: (b0 + b1) / 2, y: botY + barH + 17, 'text-anchor': 'middle', class: room > name.length * 7 + 6 ? '' : 'num' }, room > name.length * 7 + 6 ? name : p.n));
      g.append(svg('rect', { class: 'hit', x: Math.min(a0, b0), y: topY, width: Math.max(a1, b1) - Math.min(a0, b0), height: botY + barH - topY }));

      const show = e => {
        tip.innerHTML = describe(p);
        tip.hidden = false;
        const box = e.clientX != null ? { x: e.clientX, y: e.clientY } : (() => { const r = g.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top }; })();
        const w = tip.offsetWidth;
        tip.style.left = `${Math.min(window.innerWidth - w - 8, Math.max(8, box.x - w / 2))}px`;
        tip.style.top = `${box.y - tip.offsetHeight - 12}px`;
      };
      g.addEventListener('pointermove', show);
      g.addEventListener('focus', show);
      g.addEventListener('pointerleave', () => { tip.hidden = true; });
      g.addEventListener('blur', () => { tip.hidden = true; });
      const go = () => {
        tip.hidden = true;
        $('rollout').scrollIntoView({ behavior: 'smooth', block: 'start' });
        playFrom(p.startFrame);
      };
      g.addEventListener('click', go);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      g.classList.toggle('active', p.n === shownPhase);
      root.append(g);
    });
    chart.replaceChildren(root);
  }

  const body = document.querySelector('#phaseTable tbody');
  for (const p of PHASES) {
    const tr = make('tr');
    for (const v of [`${p.n} · ${p.name}`, span((p.endFrame - p.startFrame) / FPS), span(p.wallEnd - p.wallStart), p.moves.length, p.stalled, p.timeouts]) tr.append(make('td', null, v));
    body.append(tr);
  }

  // ---- Start ------------------------------------------------------------
  const layout = () => { fitStrip(); drawChart(); };
  new ResizeObserver(layout).observe(document.body);
  update();
  layout();
})();
