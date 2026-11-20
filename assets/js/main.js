(() => {
  "use strict";

  const robot = document.querySelector(".robot");
  const world = document.querySelector(".world");
  const hero = document.querySelector(".hero");
  const unit = document.querySelector(".hero__unit");
  const stateLabel = document.querySelector("#robot-state");
  const controls = Array.from(document.querySelectorAll("button[data-mood]"));

  if (!robot || !world || !hero || !unit || !stateLabel || controls.length === 0) {
    return;
  }

  const moods = {
    idle: "IDLE / READY",
    research: "CURIOUS / OBSERVING",
    education: "LEARNING / BUILDING",
    projects: "MAKING / TESTING",
    solutions: "SOLVING / TINKERING",
  };

  let pinnedMood = null;
  let hoverMood = null;
  let focusMood = null;

  function render() {
    const mood = hoverMood || pinnedMood || focusMood || "idle";

    robot.dataset.mood = mood;
    world.dataset.mood = mood;
    hero.dataset.mood = mood;
    stateLabel.textContent = moods[mood];

    controls.forEach((control) => {
      control.setAttribute("aria-pressed", String(control.dataset.mood === pinnedMood));
    });
  }

  controls.forEach((control) => {
    const mood = control.dataset.mood;

    control.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") {
        hoverMood = mood;
        render();
      }
    });

    control.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse") {
        hoverMood = null;
        render();
      }
    });

    control.addEventListener("focus", () => {
      focusMood = mood;
      render();
    });

    control.addEventListener("blur", () => {
      if (focusMood === mood) {
        focusMood = null;
      }
      render();
    });

    control.addEventListener("click", () => {
      pinnedMood = pinnedMood === mood ? null : mood;
      hoverMood = null;
      render();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    pinnedMood = null;
    hoverMood = null;
    focusMood = null;
    render();
  });

  render();

  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!finePointer || reduceMotion) {
    return;
  }

  const viewport = () => ({
    width: document.documentElement.clientWidth || window.innerWidth,
    height: document.documentElement.clientHeight || window.innerHeight,
  });

  let targetX = 0;
  let targetY = 0;
  let targetTilt = 0;
  let targetWorldX = 0;
  let targetWorldY = 0;
  let currentX = 0;
  let currentY = 0;
  let currentTilt = 0;
  let currentWorldX = 0;
  let currentWorldY = 0;
  let frameRequested = false;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function paint() {
    robot.style.setProperty("--look-x", `${currentX.toFixed(2)}px`);
    robot.style.setProperty("--look-y", `${currentY.toFixed(2)}px`);
    robot.style.setProperty("--head-tilt", `${currentTilt.toFixed(2)}deg`);
    world.style.setProperty("--world-x", `${currentWorldX.toFixed(2)}px`);
    world.style.setProperty("--world-y", `${currentWorldY.toFixed(2)}px`);
  }

  function tick() {
    currentX += (targetX - currentX) * 0.16;
    currentY += (targetY - currentY) * 0.16;
    currentTilt += (targetTilt - currentTilt) * 0.12;
    currentWorldX += (targetWorldX - currentWorldX) * 0.09;
    currentWorldY += (targetWorldY - currentWorldY) * 0.09;
    paint();

    const settled =
      Math.abs(targetX - currentX) < 0.02 &&
      Math.abs(targetY - currentY) < 0.02 &&
      Math.abs(targetTilt - currentTilt) < 0.02 &&
      Math.abs(targetWorldX - currentWorldX) < 0.03 &&
      Math.abs(targetWorldY - currentWorldY) < 0.03;

    if (settled) {
      currentX = targetX;
      currentY = targetY;
      currentTilt = targetTilt;
      currentWorldX = targetWorldX;
      currentWorldY = targetWorldY;
      paint();
      frameRequested = false;
      return;
    }

    window.requestAnimationFrame(tick);
  }

  function requestPaint() {
    if (!frameRequested) {
      frameRequested = true;
      window.requestAnimationFrame(tick);
    }
  }

  function resetMotion() {
    targetX = 0;
    targetY = 0;
    targetTilt = 0;
    targetWorldX = 0;
    targetWorldY = 0;
    requestPaint();
  }

  window.addEventListener(
    "pointermove",
    (event) => {
      const { width, height } = viewport();
      const bounds = unit.getBoundingClientRect();
      if (!width || !height || bounds.width === 0) {
        return;
      }

      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height * 0.43;
      const normalizedX = clamp((event.clientX - centerX) / (width * 0.56), -1, 1);
      const normalizedY = clamp((event.clientY - centerY) / (height * 0.55), -1, 1);

      targetX = normalizedX * 5.6;
      targetY = normalizedY * 3.6;
      targetTilt = normalizedX * 2.4;
      targetWorldX = clamp((event.clientX - width / 2) / (width / 2), -1, 1) * 7;
      targetWorldY = clamp((event.clientY - height / 2) / (height / 2), -1, 1) * 5;
      requestPaint();
    },
    { passive: true }
  );

  document.documentElement.addEventListener("pointerleave", resetMotion);
  window.addEventListener("blur", resetMotion);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      resetMotion();
    }
  });
})();
