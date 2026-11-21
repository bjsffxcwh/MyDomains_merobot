/* =========================================================================
   MEROBOT v6 — interaction layer
   -------------------------------------------------------------------------
   Principles
   1. The world never follows the pointer. Only MR—01's eyes and head do,
      within a dead zone, at a maximum of 4 SVG units. No camera motion.
   2. MR—01 has an idle director: a small stochastic state machine that
      composes glances, gestures, blinks and speech. It has memory, cooldowns
      and a context-aware voice, so it does not loop a script.
   3. Motion is opt-out at any time. Calm mode stops the director and all
      decorative animation; interactions still respond.
   4. No fixed phrase list is played in order. Lines are composed from
      context, observations and a small grammar, with anti-repetition.
   ========================================================================= */

(() => {
  "use strict";

  /* -----------------------------------------------------------------------
     Elements and guards
     ----------------------------------------------------------------------- */

  const root = document.documentElement;
  const robot = document.querySelector(".robot");
  const unit = document.querySelector("[data-robot]");
  const stage = document.querySelector(".stage");
  const voice = document.querySelector("[data-voice]");
  const voiceText = document.querySelector("[data-voice-text]");
  const voiceLive = document.querySelector("[data-voice-live]");
  const voiceTime = document.querySelector("[data-voice-time]");
  const stateLabel = document.querySelector("[data-state]");
  const motionToggle = document.querySelector("[data-motion-toggle]");
  const motionLabel = document.querySelector("[data-motion-label]");
  const notes = Array.from(document.querySelectorAll(".note[data-mood]"));
  const clockEls = Array.from(document.querySelectorAll("[data-clock]"));
  const notesSection = document.querySelector("#notes");

  if (!robot || !unit || !stage || !voice || !voiceText || !stateLabel) {
    return;
  }

  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const rand = (min, max) => min + Math.random() * (max - min);
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  function weighted(entries) {
    const total = entries.reduce((sum, entry) => sum + entry[1], 0);
    let roll = Math.random() * total;
    for (const [value, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return value;
    }
    return entries[entries.length - 1][0];
  }

  const storage = {
    read(key) {
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        return null;
      }
    },
    write(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        /* Private mode: behaviour still works, it just forgets. */
      }
    },
  };

  /* -----------------------------------------------------------------------
     Session context
     ----------------------------------------------------------------------- */

  const now = () => Date.now();
  const loadedAt = now();
  const previousVisitRaw = Number(storage.read("merobot.lastSeen") || 0);
  const previousVisits = Number(storage.read("merobot.visits") || 0);
  const isReturning = previousVisits > 0;
  const hoursAway = previousVisitRaw ? (loadedAt - previousVisitRaw) / 36e5 : 0;

  storage.write("merobot.visits", String(previousVisits + 1));
  storage.write("merobot.lastSeen", String(loadedAt));

  const state = {
    mood: "idle",
    face: "neutral",
    pinned: null,
    hover: null,
    focus: null,
    motion: "ambient",
    act: "",
    lastInteraction: now(),
    lastPointerAt: now(),
    lastSpokeAt: 0,
    lastLine: "",
    history: [],
    hasMoved: false,
    sawNotes: false,
    notesLineDone: false,
    robotClicks: 0,
    idleNoticeDone: false,
    inView: true,
    hidden: false,
    enabled: false,
    returning: isReturning,
    hoursAway,
  };

  const MOODS = {
    idle: { face: "neutral", label: "Idle / ready" },
    research: { face: "curious", label: "Curious / observing" },
    education: { face: "happy", label: "Learning / building" },
    projects: { face: "excited", label: "Making / testing" },
    solutions: { face: "wink", label: "Solving / tinkering" },
  };

  const ACT_LABELS = {
    glance: "Looking around",
    lookbird: "Watching the bird",
    wave: "Waving",
    stretch: "Stretching",
    lean: "Leaning in",
    nod: "Agreeing",
    doze: "Resting his eyes",
    muse: "Thinking",
  };

  /* -----------------------------------------------------------------------
     Face, mood, state
     ----------------------------------------------------------------------- */

  let faceToken = 0;
  let actToken = 0;

  function setFace(face, holdMs = 0) {
    const token = ++faceToken;
    const next = face || "neutral";
    state.face = next;
    robot.dataset.face = next;

    if (holdMs > 0) {
      window.setTimeout(() => {
        if (token !== faceToken || state.mood !== "idle") return;
        state.face = "neutral";
        robot.dataset.face = "neutral";
      }, holdMs);
    }
  }

  function setStateLabel(text) {
    stateLabel.textContent = text;
  }

  function clearAct() {
    actToken += 1;
    state.act = "";
    robot.dataset.act = "";
  }

  function renderMood() {
    const mood = state.hover || state.pinned || state.focus || "idle";
    if (mood === state.mood) {
      notes.forEach((note) => {
        note.setAttribute("aria-pressed", String(note.dataset.mood === state.pinned));
      });
      return;
    }

    state.mood = mood;
    const config = MOODS[mood] || MOODS.idle;
    robot.dataset.mood = mood;
    setStateLabel(config.label);
    clearAct();
    setPose(0, 0, 0);

    if (mood === "idle") {
      setFace("neutral");
      director.releaseIn(900);
    } else {
      setFace(config.face);
      director.pause();
    }

    notes.forEach((note) => {
      note.setAttribute("aria-pressed", String(note.dataset.mood === state.pinned));
    });
  }

  function setPinned(mood) {
    state.pinned = state.pinned === mood ? null : mood;
    renderMood();
  }

  /* -----------------------------------------------------------------------
     Pose: the only pointer-driven motion in the page
     ----------------------------------------------------------------------- */

  const pose = {
    x: 0,
    y: 0,
    tilt: 0,
    targetX: 0,
    targetY: 0,
    targetTilt: 0,
    raf: 0,
  };

  function paintPose() {
    robot.style.setProperty("--look-x", `${pose.x.toFixed(2)}px`);
    robot.style.setProperty("--look-y", `${pose.y.toFixed(2)}px`);
    robot.style.setProperty("--head-tilt", `${pose.tilt.toFixed(2)}deg`);
  }

  function stepPose() {
    pose.x += (pose.targetX - pose.x) * 0.08;
    pose.y += (pose.targetY - pose.y) * 0.08;
    pose.tilt += (pose.targetTilt - pose.tilt) * 0.07;
    paintPose();

    const settled =
      Math.abs(pose.targetX - pose.x) < 0.04 &&
      Math.abs(pose.targetY - pose.y) < 0.04 &&
      Math.abs(pose.targetTilt - pose.tilt) < 0.03;

    if (settled) {
      pose.x = pose.targetX;
      pose.y = pose.targetY;
      pose.tilt = pose.targetTilt;
      paintPose();
      pose.raf = 0;
      return;
    }

    pose.raf = window.requestAnimationFrame(stepPose);
  }

  function setPose(x, y, tilt) {
    if (state.motion !== "ambient") {
      return;
    }

    pose.targetX = clamp(x, -4.5, 4.5);
    pose.targetY = clamp(y, -3.5, 3.5);
    pose.targetTilt = clamp(tilt, -2.2, 2.2);

    if (!pose.raf) {
      pose.raf = window.requestAnimationFrame(stepPose);
    }
  }

  function resetPose() {
    pose.targetX = 0;
    pose.targetY = 0;
    pose.targetTilt = 0;
    if (!pose.raf) {
      pose.raf = window.requestAnimationFrame(stepPose);
    }
  }

  /* -----------------------------------------------------------------------
     Voice: typing, announcements, anti-repetition
     ----------------------------------------------------------------------- */

  let typeToken = 0;
  let typingTimer = 0;
  let currentLine = "";

  function finishTyping(text) {
    typeToken += 1;
    window.clearTimeout(typingTimer);
    voice.classList.remove("is-fading");
    voiceText.textContent = text;
  }

  function typeText(text, token) {
    if (state.motion === "calm" || reduceQuery.matches) {
      voiceText.textContent = text;
      return;
    }

    let index = 0;
    voiceText.textContent = "";
    voice.classList.remove("is-fading");

    const step = () => {
      if (token !== typeToken) return;
      index += 1;
      voiceText.textContent = text.slice(0, index);
      if (index < text.length) {
        typingTimer = window.setTimeout(step, text[index] === " " ? 8 : 14);
      }
    };

    step();
  }

  function speak(text, options = {}) {
    const { announce = false, force = false } = options;
    if (!text) return;
    if (!force && text === state.lastLine) return;

    state.lastLine = text;
    state.history.push(text);
    if (state.history.length > 9) state.history.shift();
    state.lastSpokeAt = now();
    currentLine = text;

    const token = ++typeToken;
    window.clearTimeout(typingTimer);

    if (voiceLive) {
      voiceLive.setAttribute("aria-live", announce ? "polite" : "off");
      voiceLive.textContent = text;
    }

    if (state.motion === "calm" || reduceQuery.matches) {
      voiceText.textContent = text;
      voice.classList.remove("is-fading");
      return;
    }

    voice.classList.add("is-fading");
    window.setTimeout(() => {
      if (token !== typeToken) return;
      voice.classList.remove("is-fading");
      typeText(text, token);
    }, 170);
  }

  /* -----------------------------------------------------------------------
     Muse: context-aware, combinatorial idle speech
     ----------------------------------------------------------------------- */

  const CLOSERS = [
    "I thought you should know.",
    "Just noting it.",
    "That is all.",
    "Nothing important.",
    "I will stop talking now.",
  ];

  const QUESTIONS = [
    "Do you think the house is empty?",
    "Where does the path actually go?",
    "Does the wind always come from that side?",
    "Have you noticed the turbine never stops?",
    "What do you think the grass is for?",
    "Is it later than I think?",
  ];

  const THINGS = [
    { subject: "the light", states: ["is leaning west", "is going soft at the edges", "has moved since I last looked"] },
    { subject: "the wind", states: ["has gone quiet", "is coming from the house today", "is back"] },
    { subject: "the cloud over the house", states: ["is doing that thing again", "has not moved in an hour", "looks heavier than it did"] },
    { subject: "the turbine", states: ["has not stopped all day", "is counting something I cannot see", "turns a little slower than yesterday"] },
    { subject: "the grass", states: ["is taller than it was yesterday", "is full of small noises", "is keeping its own time"] },
    { subject: "the path", states: ["is going somewhere I cannot see", "has almost disappeared", "is warmer than the field"] },
    { subject: "the house", states: ["looks smaller from here", "has one window open", "is quieter than usual"] },
    { subject: "the bird", states: ["has been on my shoulder for eleven minutes", "is asleep again", "thinks I am a tree"] },
    { subject: "the horizon", states: ["is holding its breath", "is further away than this morning", "has gone a little blue"] },
  ];

  const SELF_LINES = [
    () => `have been standing here for ${Math.max(1, Math.floor((now() - loadedAt) / 60000))} minutes`,
    () => `counted the grass again. I keep getting ${randInt(2800, 9400)}`,
    () => "like the way the light lands on the house",
    () => "am not sure the house is empty",
    () => "have decided the bird is in charge",
    () => "do not know what the path is for",
    () => "have been practising being still",
  ];

  const MOOD_LINES = {
    research: [
      "Look closer. That is most of the method.",
      "I borrowed the lens from the drawer. Do not tell the drawer.",
      "People move differently when they know a machine is watching. So I try not to stare.",
      "The interesting part is always the handover.",
    ],
    education: [
      "You learn a thing by breaking it gently.",
      "The cap is mostly ceremonial. The learning is not.",
      "I have been a student for four years. I am a slow reader.",
      "Ask the question that makes the room quiet.",
    ],
    projects: [
      "It flew. That is roughly ninety percent of the plan.",
      "Prototypes are arguments you can hold.",
      "I keep the failures in a box. It is a good box.",
      "First sketch, then solder, then apologies.",
    ],
    solutions: [
      "The lantern is for the part of the problem that has no diagram.",
      "Somebody has to sit with the messy version.",
      "Applied means it has to work on a Tuesday.",
      "I wink because the answer is usually simpler than the brief.",
    ],
  };

  const moodLineIndex = { research: 0, education: 0, projects: 0, solutions: 0 };

  function capitalise(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function partOfDay() {
    const hour = new Date().getHours();
    if (hour < 5) return "night";
    if (hour < 8) return "early morning";
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    if (hour < 21) return "evening";
    return "late evening";
  }

  function greeting() {
    const hour = new Date().getHours();
    const hello =
      hour < 5 ? "Still up?" : hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";

    if (!state.returning) {
      const hint = finePointer.matches
        ? "Move your cursor and I’ll follow, slowly. Hover a note and I’ll show you what I’m thinking."
        : "Tap a note and I’ll show you what I’m thinking. Tap me if you want to say hello.";
      return `${hello} I’m MR—01. I keep this field. ${hint}`;
    }

    if (state.hoursAway > 72) {
      return `${hello} Three days or so. The grass kept growing without me.`;
    }

    if (state.hoursAway > 6) {
      return `${hello} You’re back. The light has moved about a hand’s width.`;
    }

    return `${hello} You’re back. Nothing moved except the light.`;
  }

  function contextLine() {
    const idleFor = now() - state.lastInteraction;

    if (!state.hasMoved && finePointer.matches && now() - loadedAt > 20000) {
      return "You have been very still. The field does not mind.";
    }

    if (state.sawNotes && !state.notesLineDone && Math.random() < 0.6) {
      state.notesLineDone = true;
      return "You found the notes. Choose one. I’ll do the rest.";
    }

    if (idleFor > 70000 && !state.idleNoticeDone) {
      state.idleNoticeDone = true;
      return "Still there? I don’t mind either way. The field is good company.";
    }

    if (state.robotClicks >= 3) {
      return "Again? Fine. Hello.";
    }

    if (state.returning && state.hoursAway > 24) {
      return "You came back. The field held its shape.";
    }

    return null;
  }

  function observationsLine() {
    const thing = pick(THINGS);
    const observation = `${thing.subject} ${pick(thing.states)}`;
    const pattern = weighted([
      ["plain", 5],
      ["closer", 2],
      ["self", 3],
      ["question", 2],
      ["time", 2],
    ]);

    switch (pattern) {
      case "closer":
        return `${capitalise(observation)}. ${pick(CLOSERS)}`;
      case "self":
        return `I ${pick(SELF_LINES)()}.`;
      case "question":
        return pick(QUESTIONS);
      case "time":
        return `It is ${partOfDay()} here. ${capitalise(observation)}.`;
      default:
        return `${capitalise(observation)}.`;
    }
  }

  const muse = {
    next(options = {}) {
      const { preferContext = 0.45 } = options;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const line =
          Math.random() < preferContext
            ? contextLine() || observationsLine()
            : observationsLine() || contextLine();

        if (line && !state.history.includes(line)) {
          return line;
        }
      }

      return `The field is quiet. I am still here.`;
    },
    moodLine(mood) {
      const pool = MOOD_LINES[mood];
      if (!pool) return null;
      moodLineIndex[mood] = (moodLineIndex[mood] + 1) % pool.length;
      return pool[moodLineIndex[mood]];
    },
  };

  /* -----------------------------------------------------------------------
     Behaviour library
     ----------------------------------------------------------------------- */

  const POSES = {
    left: [-3.4, 0.4, -1.8],
    right: [3.4, 0.4, 1.8],
    up: [0.8, -3.2, -0.8],
    down: [-0.6, 2.6, -0.6],
    bird: [-3.2, 1.2, -2],
    sky: [1.2, -3, 1.2],
    house: [2.6, 0.8, 1.4],
  };

  const ACTS = {
    glance: {
      weight: 16,
      duration: 2400,
      modes: ["rest", "observe"],
      label: "Looking around",
      run() {
        const direction = pick(Object.values(POSES));
        setPose(direction[0], direction[1], direction[2]);
        if (Math.random() < 0.45) setFace("curious", 1500);
        window.setTimeout(() => {
          if (state.mood === "idle") resetPose();
        }, 1600);
      },
    },
    lookbird: {
      weight: 8,
      duration: 2800,
      modes: ["observe"],
      label: "Watching the bird",
      run() {
        setPose(...POSES.bird);
        window.setTimeout(() => {
          if (state.mood === "idle") resetPose();
        }, 2000);
      },
    },
    antenna: {
      weight: 7,
      duration: 980,
      modes: ["rest", "fidget"],
      label: "Listening",
      run() {
        robot.dataset.act = "antenna";
      },
    },
    scarf: {
      weight: 6,
      duration: 1900,
      modes: ["rest", "fidget"],
      label: "Adjusting his scarf",
      run() {
        robot.dataset.act = "scarf";
      },
    },
    sway: {
      weight: 8,
      duration: 2700,
      modes: ["rest", "fidget"],
      label: "Settling",
      run() {
        robot.dataset.act = "sway";
      },
    },
    tap: {
      weight: 5,
      duration: 1250,
      modes: ["fidget"],
      label: "Tapping a foot",
      run() {
        robot.dataset.act = "tap";
      },
    },
    stretch: {
      weight: 5,
      duration: 2100,
      modes: ["fidget", "rest"],
      face: "happy",
      label: "Stretching",
      speak: 0.22,
      run() {
        robot.dataset.act = "stretch";
      },
    },
    nod: {
      weight: 7,
      duration: 1600,
      modes: ["social", "observe"],
      label: "Agreeing",
      run() {
        robot.dataset.act = "nod";
      },
    },
    lean: {
      weight: 6,
      duration: 2500,
      modes: ["social", "observe"],
      face: "curious",
      label: "Leaning in",
      speak: 0.35,
      run() {
        robot.dataset.act = "lean";
        setPose(-1.5, 0.8, -1.6);
        window.setTimeout(() => {
          if (state.mood === "idle") resetPose();
        }, 1800);
      },
    },
    wave: {
      weight: 4,
      duration: 2300,
      modes: ["social"],
      face: "happy",
      label: "Waving",
      speak: 0.5,
      run() {
        robot.dataset.act = "wave";
      },
    },
    doze: {
      weight: 1,
      duration: 3400,
      modes: ["rest"],
      face: "sleepy",
      label: "Resting his eyes",
      run() {
        setPose(1.5, 2, 2.4);
      },
    },
    muse: {
      weight: 7,
      duration: 2200,
      modes: ["rest", "observe", "social"],
      label: "Thinking",
      speak: 1,
      run() {
        setPose(pick([[-2, -1, -1.4], [2, -1.4, 1.2], [0, 1, 0]]));
      },
    },
  };

  function scheduleActCleanup(token, act) {
    window.setTimeout(() => {
      if (token !== actToken) return;
      robot.dataset.act = "";
      state.act = "";
      setStateLabel(MOODS[state.mood].label);

      if (state.mood === "idle") {
        setFace("neutral");
        resetPose();
      }
    }, act.duration);
  }

  function performAct(act) {
    if (!act || state.act) return;
    if (state.mood !== "idle") return;
    if (state.motion !== "ambient") return;

    const token = ++actToken;
    state.act = "running";
    robot.dataset.act = "";

    if (act.face) setFace(act.face, act.duration + 240);
    if (act.label) setStateLabel(ACT_LABELS[act.id] || act.label);

    act.run();

    if (act.speak && Math.random() < act.speak && now() - state.lastSpokeAt > 11000) {
      window.setTimeout(() => {
        if (token === actToken) speak(muse.next(), { announce: false });
      }, Math.min(900, act.duration * 0.4));
    }

    scheduleActCleanup(token, act);
  }

  /* -----------------------------------------------------------------------
     Director: stochastic, contextual idle behaviour
     ----------------------------------------------------------------------- */

  const MODE_TRANSITIONS = {
    rest: [["observe", 0.4], ["fidget", 0.3], ["social", 0.3]],
    observe: [["rest", 0.35], ["fidget", 0.25], ["social", 0.4]],
    fidget: [["rest", 0.35], ["observe", 0.4], ["social", 0.25]],
    social: [["rest", 0.45], ["observe", 0.35], ["fidget", 0.2]],
  };

  const director = {
    mode: "rest",
    timer: 0,
    enabled: false,
    blockedUntil: 0,
    lastAct: "",

    start() {
      this.stop();
      if (!state.enabled) return;
      this.enabled = true;
      this.timer = window.setTimeout(() => this.tick(), rand(2600, 4200));
    },

    stop() {
      this.enabled = false;
      window.clearTimeout(this.timer);
      this.timer = 0;
    },

    pause() {
      this.blockedUntil = now() + 6000;
    },

    releaseIn(delay) {
      this.blockedUntil = Math.max(this.blockedUntil, now() + delay);
    },

    nextMode() {
      this.mode = weighted(MODE_TRANSITIONS[this.mode] || MODE_TRANSITIONS.rest);
      return this.mode;
    },

    chooseAct(mode) {
      let candidates = Object.entries(ACTS).filter(([, act]) => act.modes.includes(mode));
      if (!candidates.length) return null;

      if (this.lastAct && candidates.length > 2) {
        const fresh = candidates.filter(([id]) => id !== this.lastAct);
        if (fresh.length) candidates = fresh;
      }

      const total = candidates.reduce((sum, [, act]) => sum + act.weight, 0);
      let roll = Math.random() * total;
      let chosen = candidates[candidates.length - 1];
      for (const entry of candidates) {
        roll -= entry[1].weight;
        if (roll <= 0) {
          chosen = entry;
          break;
        }
      }

      this.lastAct = chosen[0];
      return chosen[1];
    },

    tick() {
      this.timer = 0;
      if (!this.enabled) return;

      if (state.hidden || !state.inView) {
        this.timer = window.setTimeout(() => this.tick(), 2000);
        return;
      }

      if (state.mood !== "idle" || state.act || now() < this.blockedUntil) {
        this.timer = window.setTimeout(() => this.tick(), 1600);
        return;
      }

      if (state.motion !== "ambient") {
        this.timer = window.setTimeout(() => this.tick(), 3000);
        return;
      }

      const idleFor = now() - state.lastInteraction;

      if (idleFor > 48000 && Math.random() < 0.3) {
        performAct(ACTS.doze);
      } else if (Math.random() < 0.18) {
        performAct(ACTS.muse);
      } else {
        const mode = this.nextMode();
        performAct(this.chooseAct(mode));
      }

      const quiet = Math.random() < 0.13;
      const delay = quiet ? rand(13000, 22000) : rand(3200, 7600);
      this.timer = window.setTimeout(() => this.tick(), delay);
    },
  };

  /* Blinking is autonomic: it continues during mood states and speech. */
  let blinkTimer = 0;

  function blink() {
    if (state.motion !== "ambient" || state.hidden) return;
    if (state.face === "sleepy") return;

    robot.dataset.blink = "true";
    window.setTimeout(() => {
      robot.dataset.blink = "";
    }, 210);

    if (Math.random() < 0.18) {
      window.setTimeout(() => {
        robot.dataset.blink = "true";
        window.setTimeout(() => {
          robot.dataset.blink = "";
        }, 180);
      }, 260);
    }
  }

  function blinkLoop() {
    window.clearTimeout(blinkTimer);
    blinkTimer = window.setTimeout(() => {
      blink();
      blinkLoop();
    }, rand(2800, 6800));
  }

  function syncDirector() {
    state.enabled = state.motion === "ambient" && !state.hidden && state.inView;
    if (state.enabled) {
      director.start();
      blinkLoop();
    } else {
      director.stop();
      window.clearTimeout(blinkTimer);
    }
  }

  /* -----------------------------------------------------------------------
     Ambient speech independent of gestures
     ----------------------------------------------------------------------- */

  let museTimer = 0;

  function museSchedule() {
    window.clearTimeout(museTimer);
    museTimer = window.setTimeout(() => {
      if (state.enabled && state.mood === "idle" && !state.hidden) {
        const sinceSpoke = now() - state.lastSpokeAt;
        if (sinceSpoke > 24000 && Math.random() < 0.55) {
          speak(muse.next({ preferContext: 0.55 }), { announce: false });
        }
      }
      museSchedule();
    }, rand(18000, 34000));
  }

  /* -----------------------------------------------------------------------
     Pointer gaze + motion preference
     ----------------------------------------------------------------------- */

  let lastPointerX = 0;
  let lastPointerY = 0;

  function handlePointerMove(event) {
    if (event.pointerType !== "mouse") return;
    if (!finePointer.matches) return;
    if (state.motion !== "ambient") return;
    if (state.pinned) return;

    const dxPointer = Math.abs(event.clientX - lastPointerX);
    const dyPointer = Math.abs(event.clientY - lastPointerY);
    if (dxPointer < 3 && dyPointer < 3) return;

    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    state.hasMoved = true;
    state.lastInteraction = now();
    state.lastPointerAt = now();

    const bounds = stage.getBoundingClientRect();
    if (!bounds.width) return;
    if (bounds.bottom < 0 || bounds.top > window.innerHeight) {
      resetPose();
      return;
    }

    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height * 0.44;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;

    if (Math.abs(dx) < 64 && Math.abs(dy) < 64) {
      resetPose();
      return;
    }

    setPose(clamp(dx / 130, -1, 1) * 4, clamp(dy / 180, -1, 1) * 3, clamp(dx / 260, -1, 1) * 1.8);
  }

  function applyMotion(mode, persist = true) {
    state.motion = mode === "calm" ? "calm" : "ambient";
    root.dataset.motion = state.motion;

    if (motionToggle) {
      const ambient = state.motion === "ambient";
      motionToggle.setAttribute("aria-pressed", String(ambient));
      motionToggle.setAttribute(
        "aria-label",
        ambient ? "Ambient motion is on. Turn on calm mode." : "Calm mode is on. Turn on ambient motion."
      );
      if (motionLabel) motionLabel.textContent = ambient ? "Ambient" : "Calm";
    }

    if (state.motion === "calm") {
      clearAct();
      resetPose();
      if (state.mood === "idle") setFace("neutral");
      finishTyping(currentLine || voiceText.textContent || "");
    }

    if (persist) storage.write("merobot.motion", state.motion);
    syncDirector();
    if (state.motion === "ambient" && !museTimer) museSchedule();
  }

  if (motionToggle) {
    motionToggle.addEventListener("click", () => {
      applyMotion(state.motion === "ambient" ? "calm" : "ambient");
      state.lastInteraction = now();
    });
  }

  /* -----------------------------------------------------------------------
     Notes interaction
     ----------------------------------------------------------------------- */

  function noteEnter(event, note) {
    if (event.pointerType && event.pointerType !== "mouse") return;
    state.hover = note.dataset.mood;
    renderMood();
    state.lastInteraction = now();
  }

  let pointerDown = false;

  document.addEventListener(
    "pointerdown",
    () => {
      pointerDown = true;
      window.setTimeout(() => {
        pointerDown = false;
      }, 0);
    },
    true
  );

  notes.forEach((note) => {
    note.addEventListener("pointerenter", (event) => noteEnter(event, note));
    note.addEventListener("pointerleave", (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      if (state.hover === note.dataset.mood) state.hover = null;
      renderMood();
    });

    note.addEventListener("focus", () => {
      if (pointerDown) return;
      state.focus = note.dataset.mood;
      renderMood();
    });

    note.addEventListener("blur", () => {
      if (state.focus === note.dataset.mood) state.focus = null;
      renderMood();
    });

    note.addEventListener("click", (event) => {
      if (event.detail > 0) state.focus = null;
      const mood = note.dataset.mood;
      setPinned(mood);
      state.lastInteraction = now();

      if (state.pinned) {
        const line = muse.moodLine(mood);
        if (line) speak(line, { announce: true });
        setFace(MOODS[mood].face);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !state.pinned) return;
    state.pinned = null;
    state.focus = null;
    if (document.activeElement && document.activeElement.classList.contains("note")) {
      document.activeElement.blur();
    }
    renderMood();
    speak("All yours.", { announce: true });
  });

  /* -----------------------------------------------------------------------
     Robot interaction
     ----------------------------------------------------------------------- */

  let lastClickAt = 0;

  function sayHello() {
    if (now() - lastClickAt < 1200) return;
    lastClickAt = now();
    state.robotClicks += 1;
    state.lastInteraction = now();

    if (state.motion === "ambient") {
      clearAct();
      performAct({
        id: "wave",
        duration: 2400,
        face: "happy",
        label: "Waving",
        run() {
          robot.dataset.act = "wave";
          setFace("happy");
        },
      });
    }

    let line;
    if (state.robotClicks === 1) {
      line = "Hello. You’re allowed to touch the robot. Nothing breaks.";
    } else if (state.robotClicks === 2) {
      line = "Still me. Still here.";
    } else {
      line = muse.next({ preferContext: 0.7 });
    }

    speak(line, { announce: true });
  }

  unit.addEventListener("click", sayHello);
  if (notesSection) {
    notesSection.addEventListener("pointerenter", () => {
      state.lastInteraction = now();
    }, { passive: true });
  }

  /* -----------------------------------------------------------------------
     Scroll, visibility, reduced motion
     ----------------------------------------------------------------------- */

  if ("IntersectionObserver" in window && notesSection) {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && !state.sawNotes) {
          state.sawNotes = true;
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(notesSection);
  }

  const unitObserver = "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          state.inView = entries[0] ? entries[0].isIntersecting : true;
          syncDirector();
        },
        { threshold: 0.05 }
      )
    : null;

  if (unitObserver) unitObserver.observe(unit);

  document.addEventListener("visibilitychange", () => {
    state.hidden = document.hidden;
    if (document.hidden) finishTyping(currentLine || voiceText.textContent || "");
    syncDirector();
  });

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("blur", resetPose);
  document.addEventListener("pointerleave", resetPose);

  if (reduceQuery.addEventListener) {
    reduceQuery.addEventListener("change", (event) => {
      if (!storage.read("merobot.motion")) {
        applyMotion(event.matches ? "calm" : "ambient", false);
      }
    });
  }

  /* -----------------------------------------------------------------------
     Clock and first contact
     ----------------------------------------------------------------------- */

  function updateClock() {
    const date = new Date();
    const formatted = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);

    clockEls.forEach((element) => {
      element.textContent = formatted;
      if (element.tagName === "TIME") {
        element.dateTime = date.toISOString();
      }
    });

    if (voiceTime) voiceTime.textContent = formatted;
  }

  updateClock();
  window.setInterval(updateClock, 30000);

  if (!finePointer.matches) {
    const lede = document.querySelector("[data-notes-lede]");
    const hint = document.querySelector("[data-notes-hint]");
    if (lede) {
      lede.textContent = "Tap a note and MR—01 will show you what he is thinking about. Tap again to keep him there.";
    }
    if (hint) {
      hint.textContent = "Tap the same note again to release him.";
    }
  }

  function firstContact() {
    speak(greeting(), { announce: true });

    window.setTimeout(() => {
      if (state.motion !== "ambient" || state.mood !== "idle") return;
      performAct({
        id: "greet",
        duration: 2200,
        face: "happy",
        label: "Waving",
        run() {
          robot.dataset.act = "greet";
          setFace("happy");
        },
      });
    }, 900);
  }

  window.setTimeout(firstContact, 650);

  /* -----------------------------------------------------------------------
     Boot
     ----------------------------------------------------------------------- */

  const storedMotion = storage.read("merobot.motion");
  applyMotion(storedMotion === "calm" || reduceQuery.matches ? "calm" : "ambient", false);
  museSchedule();
  renderMood();

  /* Expose a tiny debug surface for local QA only. */
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    window.__MR01__ = {
      state,
      director,
      speak,
      perform: (id) => performAct(ACTS[id]),
      motion: (mode) => applyMotion(mode, false),
      status: () => ({
        enabled: director.enabled,
        mode: director.mode,
        timer: director.timer,
        blockedUntil: director.blockedUntil,
        now: now(),
        inView: state.inView,
        hidden: state.hidden,
        act: state.act,
        mood: state.mood,
        motion: state.motion,
      }),
    };
  }
})();
