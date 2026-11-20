(() => {
  "use strict";

  const robot = document.querySelector(".robot");
  const robotStage = document.querySelector(".robot-stage");
  const stage = document.querySelector(".stage");
  const stateLabel = document.querySelector("#robot-state");
  const controls = Array.from(document.querySelectorAll("button[data-mood]"));

  if (!robot || !robotStage || !stage || !stateLabel || controls.length === 0) {
    return;
  }

  const moods = {
    idle: "IDLE / READY",
    research: "CURIOUS / RESEARCH",
    education: "LEARNING / EDUCATION",
    projects: "BUILDING / PROJECTS",
    solutions: "SOLVING / SOLUTIONS",
  };

  let pinnedMood = null;
  let hoverMood = null;
  let focusMood = null;

  function render() {
    const mood = hoverMood || pinnedMood || focusMood || "idle";

    robot.dataset.mood = mood;
    robotStage.dataset.mood = mood;
    stage.dataset.mood = mood;
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

  let targetX = 0;
  let targetY = 0;
  let targetTilt = 0;
  let currentX = 0;
  let currentY = 0;
  let currentTilt = 0;
  let frameRequested = false;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function paint() {
    robot.style.setProperty("--look-x", `${currentX.toFixed(2)}px`);
    robot.style.setProperty("--look-y", `${currentY.toFixed(2)}px`);
    robot.style.setProperty("--head-tilt", `${currentTilt.toFixed(2)}deg`);
  }

  function tick() {
    currentX += (targetX - currentX) * 0.16;
    currentY += (targetY - currentY) * 0.16;
    currentTilt += (targetTilt - currentTilt) * 0.12;
    paint();

    const settled =
      Math.abs(targetX - currentX) < 0.02 &&
      Math.abs(targetY - currentY) < 0.02 &&
      Math.abs(targetTilt - currentTilt) < 0.02;

    if (settled) {
      currentX = targetX;
      currentY = targetY;
      currentTilt = targetTilt;
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

  function resetGaze() {
    targetX = 0;
    targetY = 0;
    targetTilt = 0;
    requestPaint();
  }

  window.addEventListener(
    "pointermove",
    (event) => {
      const bounds = robotStage.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) {
        return;
      }

      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height * 0.44;
      const normalizedX = clamp((event.clientX - centerX) / (bounds.width * 0.7), -1, 1);
      const normalizedY = clamp((event.clientY - centerY) / (bounds.height * 0.7), -1, 1);

      targetX = normalizedX * 5.2;
      targetY = normalizedY * 3.4;
      targetTilt = normalizedX * 2.2;
      requestPaint();
    },
    { passive: true }
  );

  document.documentElement.addEventListener("pointerleave", resetGaze);
  window.addEventListener("blur", resetGaze);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      resetGaze();
    }
  });
})();
