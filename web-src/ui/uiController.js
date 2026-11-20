import { MAPS, UNITS, EDITOR_TOOLS, UNIT_SIZE_OPTIONS } from "../config/gameData.js";

export function createUiController({
  soundManager,
  onSelectUnitDef,
  onSelectUnitSize,
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
  const unitRosterBar = document.getElementById("unitRosterBar");
  const editorToolBar = document.getElementById("editorToolBar");
  const modeSandboxBtn = document.getElementById("modeSandboxBtn");
  const modePracticeBtn = document.getElementById("modePracticeBtn");
  const modeEditorBtn = document.getElementById("modeEditorBtn");
  const team1Btn = document.getElementById("team1Btn");
  const team2Btn = document.getElementById("team2Btn");
  const actionDeployBtn = document.getElementById("actionDeployBtn");
  const actionOrderBtn = document.getElementById("actionOrderBtn");
  const speedBtn = document.getElementById("speedBtn");
  const musicBtn = document.getElementById("musicBtn");
  const clearBtn = document.getElementById("clearBtn");
  const terrainHint = document.getElementById("terrainHint");
  const redCountEl = document.getElementById("redCount");
  const blueCountEl = document.getElementById("blueCount");

  MAPS.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m.path;
    opt.textContent = m.label;
    mapSelect.appendChild(opt);
  });
  mapSelect.value = MAPS[1].path;

  const sizeSelect = document.createElement("select");
  sizeSelect.id = "unitSizeSelect";
  sizeSelect.className = "bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium px-2.5 py-1.5 rounded border border-slate-600 focus:outline-none";
  UNIT_SIZE_OPTIONS.forEach((optDef) => {
    const opt = document.createElement("option");
    opt.value = String(optDef.soldiers);
    opt.textContent = optDef.label;
    sizeSelect.appendChild(opt);
  });
  sizeSelect.value = String(UNIT_SIZE_OPTIONS[0].soldiers);
  sizeSelect.addEventListener("change", () => {
    onSelectUnitSize?.(Number(sizeSelect.value));
    soundManager.playSfx(soundManager.sfx.select);
  });

  if (actionDeployBtn?.parentElement) {
    actionDeployBtn.parentElement.insertBefore(sizeSelect, actionDeployBtn);
  }

  let activeUnitBtn = null;
  UNITS.forEach((u, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "unit-btn flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 transition";
    btn.innerHTML = `<img src="${u.icon}" alt="${u.label}" class="w-4 h-4 object-contain" onerror="this.style.display='none'" /><span>${u.label}</span>`;
    btn.addEventListener("click", () => {
      if (activeUnitBtn) activeUnitBtn.classList.remove("ring-2", "ring-amber-400", "bg-slate-700");
      activeUnitBtn = btn;
      btn.classList.add("ring-2", "ring-amber-400", "bg-slate-700");
      onSelectUnitDef(u);
      soundManager.playSfx(soundManager.sfx.select);
    });
    if (idx === 0) {
      activeUnitBtn = btn;
      btn.classList.add("ring-2", "ring-amber-400", "bg-slate-700");
    }
    unitRosterBar.appendChild(btn);
  });

  let activeToolBtn = null;
  EDITOR_TOOLS.forEach((t, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "editor-tool-btn flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 transition";
    btn.innerHTML = `<img src="${t.icon}" alt="${t.label}" class="w-4 h-4 object-contain" onerror="this.style.display='none'" /><span>${t.label}</span>`;
    btn.addEventListener("click", () => {
      if (activeToolBtn) activeToolBtn.classList.remove("ring-2", "ring-amber-400", "bg-slate-700");
      activeToolBtn = btn;
      btn.classList.add("ring-2", "ring-amber-400", "bg-slate-700");
      onSelectEditorTool(t);
      soundManager.playSfx(soundManager.sfx.select);
    });
    if (idx === 1) {
      activeToolBtn = btn;
      btn.classList.add("ring-2", "ring-amber-400", "bg-slate-700");
    }
    editorToolBar.appendChild(btn);
  });

  const setActiveModeButton = (mode) => {
    for (const b of [modeSandboxBtn, modePracticeBtn, modeEditorBtn]) {
      b?.classList.remove("ring-2", "ring-amber-400", "bg-amber-600");
    }
    const target = mode === "sandbox" ? modeSandboxBtn : mode === "practice" ? modePracticeBtn : modeEditorBtn;
    target?.classList.add("ring-2", "ring-amber-400", "bg-amber-600");

    const isEditor = mode === "editor";
    editorToolBar?.classList.toggle("hidden", !isEditor);
    unitRosterBar?.classList.toggle("hidden", isEditor);
  };

  setActiveModeButton("sandbox");

  modeSandboxBtn?.addEventListener("click", () => {
    setActiveModeButton("sandbox");
    onSelectMode("sandbox");
    soundManager.playSfx(soundManager.sfx.select);
  });

  modePracticeBtn?.addEventListener("click", () => {
    setActiveModeButton("practice");
    onSelectMode("practice");
    soundManager.playSfx(soundManager.sfx.select);
  });

  modeEditorBtn?.addEventListener("click", () => {
    setActiveModeButton("editor");
    onSelectMode("editor");
    soundManager.playSfx(soundManager.sfx.select);
  });

  const setTeamSelection = (team) => {
    team1Btn?.classList.toggle("ring-2", team === 1);
    team1Btn?.classList.toggle("ring-red-300", team === 1);
    team2Btn?.classList.toggle("ring-2", team === 2);
    team2Btn?.classList.toggle("ring-blue-300", team === 2);
  };
  setTeamSelection(1);

  team1Btn?.addEventListener("click", () => {
    setTeamSelection(1);
    onSelectTeam(1);
    soundManager.playSfx(soundManager.sfx.select);
  });

  team2Btn?.addEventListener("click", () => {
    setTeamSelection(2);
    onSelectTeam(2);
    soundManager.playSfx(soundManager.sfx.select);
  });

  const syncActionButtons = (action) => {
    actionDeployBtn?.classList.toggle("ring-2", action === "deploy");
    actionDeployBtn?.classList.toggle("ring-amber-400", action === "deploy");
    actionOrderBtn?.classList.toggle("ring-2", action === "order");
    actionOrderBtn?.classList.toggle("ring-amber-400", action === "order");
  };
  syncActionButtons("deploy");

  actionDeployBtn?.addEventListener("click", () => {
    onSelectPointerAction("deploy");
    soundManager.playSfx(soundManager.sfx.select);
  });

  actionOrderBtn?.addEventListener("click", () => {
    onSelectPointerAction("order");
    soundManager.playSfx(soundManager.sfx.select);
  });

  speedBtn?.addEventListener("click", () => {
    const nextSpeed = onToggleSimSpeed();
    speedBtn.textContent = `Speed: ${nextSpeed}x`;
    soundManager.playSfx(soundManager.sfx.select);
  });

  let musicOn = false;
  musicBtn?.addEventListener("click", () => {
    musicOn = !musicOn;
    soundManager.setMusicEnabled(musicOn);
    musicBtn.textContent = `Music: ${musicOn ? "On" : "Off"}`;
  });

  clearBtn?.addEventListener("click", () => {
    onClearAll();
    soundManager.playSfx(soundManager.sfx.select);
  });

  mapSelect?.addEventListener("change", () => {
    onSelectMap(mapSelect.value);
    soundManager.playSfx(soundManager.sfx.select);
  });

  const orderButtons = document.querySelectorAll("[data-order]");
  orderButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      orderButtons.forEach((b) => b.classList.remove("ring-2", "ring-amber-400", "bg-amber-600", "text-white"));
      btn.classList.add("ring-2", "ring-amber-400", "bg-amber-600", "text-white");
      onIssueOrder(btn.dataset.order);
      soundManager.playSfx(soundManager.sfx.select);
    });
  });

  return {
    getSelectedMapPath: () => mapSelect.value,
    syncActionButtons,
    updateTerrainHint: (label) => {
      if (terrainHint) terrainHint.textContent = `Terrain: ${label}`;
    },
    updateAliveCounts: (redCount, blueCount) => {
      if (redCountEl) redCountEl.textContent = String(redCount);
      if (blueCountEl) blueCountEl.textContent = String(blueCount);
    }
  };
}
