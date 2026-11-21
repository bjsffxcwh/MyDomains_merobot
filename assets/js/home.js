/* MR—01: one cancellable idle director; page context, finite speech memory.
   Marketing/topic text comes from the existing page. No fabricated observations. */
(() => {
  'use strict';
  const root = document.documentElement;
  const robot = document.querySelector('.robot');
  const unit = document.querySelector('[data-robot]');
  const voice = document.querySelector('[data-voice-text]');
  const live = document.querySelector('[data-voice-live]');
  const response = document.querySelector('[data-note-response]');
  const label = document.querySelector('[data-state]');
  const toggle = document.querySelector('[data-motion-toggle]');
  const notes = [...document.querySelectorAll('.note')];
  if (!robot || !unit || !voice || !toggle || !notes.length) return;
  root.dataset.enhanced = '';
  unit.disabled = false;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* Session still works. */ } }
  };
  const returning = Number(storage.get('merobot.visits')) > 0;
  const random = (min, max) => min + Math.random() * (max - min);
  const now = () => performance.now();
  const recentActs = [];
  const spoken = new Set();
  const topicFaces = { research: 'curious', education: 'happy', projects: 'excited', solutions: 'wink' };
  const topicLabels = { research: 'Curious / observing', education: 'Learning / building', projects: 'Making / testing', solutions: 'Solving / tinkering' };
  const topicLines = {
    research: ['Look closer. That is most of the method.', 'The interesting part is always the handover.'],
    education: ['The cap is mostly ceremonial. The learning is not.', 'You learn a thing by breaking it gently.'],
    projects: ['Prototypes are arguments you can hold.', 'I keep the failures in a box. It is a good box.'],
    solutions: ['The lantern is for the part of the problem that has no diagram.', 'Somebody has to sit with the messy version.']
  };
  const state = {
    pinned: null, hover: null, focus: null, dismissed: null, topic: null,
    inView: false, hidden: document.hidden, greeted: false, interacted: false,
    lastInteraction: now(), lastSpeech: -Infinity, nextAct: now() + 14000,
    motion: 'calm', act: '', lastTopic: null, sawNotes: false, robotClicks: 0, pinnedLine: null
  };
  let directorTimer = 0;
  let actTimer = 0;
  let gazeFrame = 0;
  let pointer = null;
  let gazeCenter = null;
  let lastRobotClick = -Infinity;

  function speak(text, announce = false) {
    if (!text) return;
    voice.textContent = text;
    state.lastSpeech = now();
    spoken.add(text);
    // Autonomous speech is visual only; announcements follow explicit actions.
    if (announce && live) live.textContent = text;
  }
  function freshLine(candidates) {
    const available = candidates.filter(line => !spoken.has(line));
    return available.length ? available[Math.floor(Math.random() * available.length)] : null;
  }
  function stopAct() {
    clearTimeout(actTimer);
    state.act = '';
    robot.dataset.act = '';
    robot.dataset.gaze = 'center';
    robot.dataset.face = topicFaces[state.topic] || 'neutral';
    label.textContent = topicLabels[state.topic] || 'Idle / ready';
  }
  function act(id, duration = 1800) {
    stopAct();
    if (state.motion !== 'motion' || state.hidden || !state.inView || state.topic) return;
    state.act = id;
    robot.dataset.act = id;
    const labels = { wave: 'Waving', blink: 'Idle / ready', listen: 'Listening', look: 'Looking around', rest: 'Resting his eyes' };
    label.textContent = labels[id];
    if (id === 'wave') robot.dataset.face = 'happy';
    if (id === 'look') robot.dataset.gaze = Math.random() > .5 ? 'left-up' : 'right-up';
    if (id === 'rest') robot.dataset.face = 'sleepy';
    actTimer = setTimeout(stopAct, duration);
  }
  function greet() {
    state.greeted = true;
    storage.set('merobot.visits', '1');
    if (state.interacted) return;
    const hour = new Date().getHours();
    const hello = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.';
    speak(returning ? `${hello} You’re back. I’m MR—01.` : `${hello} I’m MR—01. I keep this field.`, true);
    act('wave', 1600);
  }
  function idleSpeech() {
    // Pools depend on actions that actually occurred, not invented weather/history.
    const candidates = [];
    if (state.lastTopic) {
      candidates.push(...topicLines[state.lastTopic]);
      const note = notes.find(item => item.dataset.mood === state.lastTopic);
      if (note) candidates.push(note.querySelector('.note__desc').textContent);
    }
    if (state.sawNotes && !state.lastTopic) candidates.push('You found the notes. Choose one. I’ll do the rest.');
    if (now() - state.lastInteraction > 70000) candidates.push('I have been practising being still.');
    if (state.robotClicks) candidates.push('Still me. Still here.');
    candidates.push('The field is quiet. I am still here.');
    const line = freshLine(candidates);
    if (line) speak(line);
    // Exhaustion means silence. There is no repeating fallback or fixed loop.
  }
  function tick() {
    directorTimer = 0;
    if (state.hidden || !state.inView) return;
    if (!state.greeted) greet();
    if (state.motion !== 'motion') return;
    const idleFor = now() - state.lastInteraction;
    if (!state.topic && !state.act && idleFor > 12000 && now() >= state.nextAct) {
      let pool = idleFor > 60000 ? ['rest', 'look', 'blink'] : ['look', 'blink', 'listen'];
      pool = pool.filter(id => !recentActs.includes(id));
      const chosen = pool[Math.floor(Math.random() * pool.length)] || 'blink';
      recentActs.push(chosen);
      if (recentActs.length > 2) recentActs.shift();
      act(chosen, chosen === 'rest' ? 3200 : chosen === 'blink' ? 240 : 1800);
      state.nextAct = now() + random(12000, 24000);
    }
    if (!state.topic && idleFor > 24000 && now() - state.lastSpeech > 45000) idleSpeech();
    directorTimer = setTimeout(tick, 1000);
  }
  function syncDirector() {
    clearTimeout(directorTimer);
    directorTimer = 0;
    if (state.hidden || !state.inView) {
      root.dataset.paused = '';
      stopAct();
      return;
    }
    delete root.dataset.paused;
    if (!state.greeted || state.motion === 'motion') directorTimer = setTimeout(tick, 800);
  }
  function interaction() {
    state.interacted = true;
    state.lastInteraction = now();
    state.nextAct = now() + random(14000, 24000);
    stopAct();
  }
  function applyMotion() {
    const saved = storage.get('merobot.motion');
    state.motion = reduced.matches || saved === 'calm' ? 'calm' : 'motion';
    root.dataset.motion = state.motion;
    toggle.hidden = false;
    toggle.disabled = reduced.matches;
    toggle.setAttribute('aria-pressed', String(state.motion === 'calm'));
    toggle.setAttribute('aria-label', reduced.matches ? 'Calm mode, system preference' : state.motion === 'calm' ? 'Calm mode' : 'Motion mode');
    toggle.querySelector('[data-motion-label]').textContent = reduced.matches ? 'Calm · system' : state.motion === 'calm' ? 'Calm' : 'Motion';
    toggle.querySelector('.motion__icon').textContent = state.motion === 'calm' ? 'II' : '◦';
    stopAct();
    syncDirector();
  }
  toggle.addEventListener('click', () => {
    storage.set('merobot.motion', state.motion === 'calm' ? 'motion' : 'calm');
    interaction();
    applyMotion();
  });
  reduced.addEventListener('change', applyMotion);

  function renderTopic() {
    // A pin owns the robot. Keyboard focus owns previews before mouse hover.
    const preview = state.focus || state.hover;
    const topic = state.pinned || (preview !== state.dismissed ? preview : null);
    state.topic = topic;
    robot.dataset.mood = topic || 'idle';
    stopAct();
    notes.forEach(note => {
      const pinned = state.pinned === note.dataset.mood;
      note.setAttribute('aria-pressed', String(pinned));
      note.dataset.preview = String(!state.pinned && topic === note.dataset.mood);
      note.querySelector('.note__pin').textContent = pinned ? 'Pinned' : 'Pin';
      note.querySelector('.note__mark').textContent = pinned ? '−' : '+';
    });
    const selected = notes.find(note => note.dataset.mood === topic);
    response.textContent = state.pinned && state.pinnedLine ? state.pinnedLine : selected ? selected.querySelector('.note__response').textContent : 'Hello. I’m MR—01. I keep this field.';
  }
  notes.forEach(note => {
    note.disabled = false;
    const topic = note.dataset.mood;
    note.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' || !fine.matches) return;
      state.hover = topic;
      state.dismissed = null;
      interaction();
      renderTopic();
    });
    note.addEventListener('pointerleave', event => {
      if (event.pointerType !== 'mouse') return;
      if (state.hover === topic) state.hover = null;
      renderTopic();
    });
    note.addEventListener('focus', () => {
      if (!note.matches(':focus-visible')) return;
      state.focus = topic;
      state.dismissed = null;
      interaction();
      renderTopic();
    });
    note.addEventListener('blur', () => {
      if (state.focus === topic) state.focus = null;
      renderTopic();
    });
    note.addEventListener('click', () => {
      interaction();
      const releasing = state.pinned === topic;
      state.pinned = releasing ? null : topic;
      state.pinnedLine = releasing ? null : freshLine(topicLines[topic]) || note.querySelector('.note__desc').textContent;
      state.dismissed = releasing ? topic : null;
      state.lastTopic = topic;
      renderTopic();
      if (releasing) speak('All yours.', true);
      else {
        const line = state.pinnedLine;
        speak(line, true);
        response.textContent = line;
      }
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !state.topic) return;
    interaction();
    state.dismissed = state.focus || state.hover;
    state.pinned = null;
    renderTopic();
    speak('All yours.', true);
    // Keep focus where the keyboard user left it.
  });
  unit.addEventListener('click', () => {
    if (now() - lastRobotClick < 800) return;
    lastRobotClick = now();
    interaction();
    state.robotClicks++;
    const candidates = state.topic ? topicLines[state.topic] : ['Hello. I’m MR—01. I keep this field.', 'Still me. Still here.', 'I have been practising being still.'];
    speak(freshLine(candidates), true);
    act('wave', 1600);
  });

  function measureGaze() {
    const bounds = robot.getBoundingClientRect();
    gazeCenter = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height * .414 };
  }
  function paintGaze() {
    gazeFrame = 0;
    if (!pointer || state.motion !== 'motion' || !state.inView || state.hidden || state.topic || state.act || !fine.matches) return;
    if (!gazeCenter) measureGaze();
    const dx = pointer.x - gazeCenter.x;
    const dy = pointer.y - gazeCenter.y;
    const x = Math.abs(dx) <= 48 ? 'center' : dx < 0 ? 'left' : 'right';
    const y = Math.abs(dy) <= 48 ? 'center' : dy < 0 ? 'up' : 'down';
    robot.dataset.gaze = `${x}-${y}`;
  }
  window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !fine.matches) return;
    pointer = { x: event.clientX, y: event.clientY };
    state.lastInteraction = now();
    if (!gazeFrame) gazeFrame = requestAnimationFrame(paintGaze);
  }, { passive: true });
  function resetGaze() {
    pointer = null;
    cancelAnimationFrame(gazeFrame);
    gazeFrame = 0;
    robot.dataset.gaze = 'center';
  }
  window.addEventListener('scroll', () => { gazeCenter = null; resetGaze(); }, { passive: true });
  window.addEventListener('resize', () => { gazeCenter = null; resetGaze(); });
  window.addEventListener('blur', resetGaze);
  document.documentElement.addEventListener('pointerleave', resetGaze);
  document.addEventListener('visibilitychange', () => {
    state.hidden = document.hidden;
    state.nextAct = now() + random(14000, 24000);
    resetGaze();
    syncDirector();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      state.inView = entries[0].isIntersecting;
      gazeCenter = null;
      state.nextAct = now() + random(14000, 24000);
      syncDirector();
    }, { threshold: .15 }).observe(document.querySelector('.stage'));
    new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) state.sawNotes = true;
    }, { threshold: .1 }).observe(document.querySelector('#notes'));
  } else state.inView = true;

  function clock() {
    const date = new Date();
    const element = document.querySelector('[data-clock]');
    element.textContent = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
    element.dateTime = date.toISOString();
  }
  clock();
  setInterval(clock, 30000);
  renderTopic();
  applyMotion();
})();
