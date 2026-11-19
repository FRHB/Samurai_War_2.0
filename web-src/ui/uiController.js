import { EDITOR_TOOLS, MAPS, UNITS } from "../config/gameData.js";

export function createUiController({
  soundManager,
  onSelectUnitDef,
  onSelectEditorTool,
  onSelectTeam,
  onSelectPointerAction,
  onToggleSimSpeed,
  onIssueOrder,
  onSelectMode,
  onSelectMap,
  onClearAll
}) {
  const mapSelect = document.getElementById("mapSelect");
  const unitBar = document.getElementById("unitBar");
  const editorBar = document.getElementById("editorBar");
  const hintEl = document.getElementById("terrainHint");
  const redAliveEl = document.getElementById("redAlive");
  const blueAliveEl = document.getElementById("blueAlive");

  MAPS.forEach((m, idx) => {
    const opt = document.createElement("option");
    opt.value = m.path;
    opt.textContent = m.label;
    if (idx === 1) opt.selected = true;
    mapSelect.appendChild(opt);
  });

  const syncActionButtons = (pointerAction) => {
    document.getElementById("actionDeploy").classList.toggle("active", pointerAction === "deploy");
    document.getElementById("actionOrder").classList.toggle("active", pointerAction === "order");
  };

  const unitButtons = [];
  UNITS.forEach((u, idx) => {
    const btn = document.createElement("button");
    btn.className = "tool-btn" + (idx === 0 ? " active" : "");
    btn.innerHTML = `<img src="${u.icon}" alt="${u.label}" /><span>${u.label}</span>`;
    btn.addEventListener("click", () => {
      unitButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      onSelectUnitDef(u);
      soundManager.playSfx(soundManager.sfx.select);
    });
    unitBar.appendChild(btn);
    unitButtons.push(btn);
  });

  const editorButtons = [];
  EDITOR_TOOLS.forEach((tool, idx) => {
    const btn = document.createElement("button");
    btn.className = "tool-btn" + (idx === 1 ? " active" : "");
    btn.innerHTML = `<img src="${tool.icon}" alt="${tool.label}" /><span>${tool.label}</span>`;
    btn.addEventListener("click", () => {
      editorButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      onSelectEditorTool(tool);
      soundManager.playSfx(soundManager.sfx.select);
    });
    editorBar.appendChild(btn);
    editorButtons.push(btn);
  });

  document.getElementById("teamRed").addEventListener("click", () => {
    document.getElementById("teamRed").classList.add("active");
    document.getElementById("teamBlue").classList.remove("active");
    onSelectTeam(1);
    soundManager.playSfx(soundManager.sfx.select);
  });

  document.getElementById("teamBlue").addEventListener("click", () => {
    document.getElementById("teamBlue").classList.add("active");
    document.getElementById("teamRed").classList.remove("active");
    onSelectTeam(2);
    soundManager.playSfx(soundManager.sfx.select);
  });

  document.getElementById("actionDeploy").addEventListener("click", () => {
    onSelectPointerAction("deploy");
    soundManager.playSfx(soundManager.sfx.select);
  });

  document.getElementById("actionOrder").addEventListener("click", () => {
    onSelectPointerAction("order");
    soundManager.playSfx(soundManager.sfx.select);
  });

  document.getElementById("speedToggle").addEventListener("click", (e) => {
    const nextSpeed = onToggleSimSpeed();
    e.currentTarget.textContent = `Speed: ${nextSpeed}x`;
    soundManager.playSfx(soundManager.sfx.select);
  });

  document.getElementById("musicToggle").addEventListener("click", (e) => {
    const enabled = soundManager.toggleMusic();
    e.currentTarget.textContent = `Music: ${enabled ? "On" : "Off"}`;
  });

  document.querySelectorAll(".order-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".order-btn").forEach((b) => b.classList.toggle("active", b === btn));
      onIssueOrder(btn.dataset.order);
      soundManager.playSfx(soundManager.sfx.move);
    });
  });

  const setModeUi = (mode) => {
    ["sandbox", "practice", "editor"].forEach((m) => {
      document.getElementById("mode" + m[0].toUpperCase() + m.slice(1)).classList.toggle("active", m === mode);
    });
    unitBar.style.display = mode === "editor" ? "none" : "flex";
    editorBar.style.display = mode === "editor" ? "flex" : "none";
  };

  document.getElementById("modeSandbox").addEventListener("click", () => {
    setModeUi("sandbox");
    onSelectMode("sandbox");
    soundManager.playSfx(soundManager.sfx.select);
  });

  document.getElementById("modePractice").addEventListener("click", () => {
    setModeUi("practice");
    mapSelect.value = "assets/Maps/Practice.png";
    onSelectMode("practice");
    soundManager.playSfx(soundManager.sfx.select);
  });

  document.getElementById("modeEditor").addEventListener("click", () => {
    setModeUi("editor");
    onSelectMode("editor");
    soundManager.playSfx(soundManager.sfx.select);
  });

  mapSelect.addEventListener("change", () => onSelectMap(mapSelect.value));

  document.getElementById("clearAll").addEventListener("click", () => {
    onClearAll();
    soundManager.playSfx(soundManager.sfx.select);
  });

  const updateTerrainHint = (label) => {
    hintEl.textContent = `Terrain: ${label}`;
  };

  const updateAliveCounts = (redCount, blueCount) => {
    redAliveEl.textContent = String(redCount);
    blueAliveEl.textContent = String(blueCount);
  };

  return {
    getSelectedMapPath: () => mapSelect.value,
    syncActionButtons,
    updateTerrainHint,
    updateAliveCounts
  };
}