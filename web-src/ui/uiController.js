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
  const topBar = document.querySelector(".hud-top-bar") || mapSelect?.closest("div") || document.body;
  let unitRosterBar = document.getElementById("unitRosterBar");
  let editorToolBar = document.getElementById("editorToolBar");
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

  if (!unitRosterBar && topBar) {
    unitRosterBar = document.createElement("div");
    unitRosterBar.id = "unitRosterBar";
    unitRosterBar.style.cssText =
      "display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;padding:6px 8px;background:rgba(15,23,42,0.92);border-radius:8px;border:1px solid rgba(148,163,184,0.35);position:relative;z-index:20;pointer-events:auto;";
    topBar.insertAdjacentElement("afterend", unitRosterBar);
  } else if (unitRosterBar) {
    unitRosterBar.style.cssText =
      "display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;padding:6px 8px;background:rgba(15,23,42,0.92);border-radius:8px;border:1px solid rgba(148,163,184,0.35);position:relative;z-index:20;pointer-events:auto;";
  }

  if (!editorToolBar && topBar) {
    editorToolBar = document.createElement("div");
    editorToolBar.id = "editorToolBar";
    editorToolBar.style.cssText =
      "display:none;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;padding:6px 8px;background:rgba(15,23,42,0.92);border-radius:8px;border:1px solid rgba(148,163,184,0.35);position:relative;z-index:20;pointer-events:auto;";
    (unitRosterBar || topBar).insertAdjacentElement("afterend", editorToolBar);
  } else if (editorToolBar) {
    editorToolBar.style.cssText =
      "flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;padding:6px 8px;background:rgba(15,23,42,0.92);border-radius:8px;border:1px solid rgba(148,163,184,0.35);position:relative;z-index:20;pointer-events:auto;";
  }

  let selectedUnit = UNITS[0];
  let selectedSizeOption = UNIT_SIZE_OPTIONS[0];

  if (mapSelect) {
    mapSelect.innerHTML = "";
    MAPS.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.path;
      opt.textContent = m.label;
      mapSelect.appendChild(opt);
    });
    mapSelect.value = MAPS[1]?.path || MAPS[0]?.path || "";
  }

  // Deployment bar directly below the unit roster showing selected unit type + squad size selector
  const deploySubBar = document.createElement("div");
  deploySubBar.id = "deployFormationSubBar";
  deploySubBar.style.cssText =
    "display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px;padding:6px 10px;background:rgba(15,23,42,0.92);color:#f8fafc;font-size:12px;border-radius:8px;border:1px solid rgba(148,163,184,0.35);width:fit-content;position:relative;z-index:20;pointer-events:auto;";

  const unitBadge = document.createElement("span");
  unitBadge.id = "selectedUnitKindLabel";
  unitBadge.style.cssText = "font-weight:600;color:#fcd34d;";

  const sizeLabel = document.createElement("label");
  sizeLabel.htmlFor = "unitSizeSelect";
  sizeLabel.style.cssText = "color:#cbd5e1;font-weight:500;";
  sizeLabel.textContent = "Formation Size:";

  const sizeSelect = document.createElement("select");
  sizeSelect.id = "unitSizeSelect";
  sizeSelect.style.cssText =
    "background:#1e293b;color:#f8fafc;font-size:12px;font-weight:500;padding:4px 8px;border-radius:6px;border:1px solid #475569;cursor:pointer;pointer-events:auto;";
  UNIT_SIZE_OPTIONS.forEach((optDef) => {
    const opt = document.createElement("option");
    opt.value = String(optDef.soldiers);
    opt.textContent = optDef.label;
    sizeSelect.appendChild(opt);
  });
  sizeSelect.value = String(selectedSizeOption.soldiers);

  const syncDeploySubBar = () => {
    unitBadge.textContent = `Unit: ${selectedUnit?.label || "Ashigaru"}`;
  };
  syncDeploySubBar();

  sizeSelect.addEventListener("change", () => {
    const count = Number(sizeSelect.value) || 10;
    selectedSizeOption = UNIT_SIZE_OPTIONS.find((o) => o.soldiers === count) || {
      id: "custom",
      label: `Size (${count})`,
      soldiers: count
    };
    syncDeploySubBar();
    onSelectUnitSize?.(count);
    soundManager.playSfx(soundManager.sfx.select);
  });

  deploySubBar.appendChild(unitBadge);
  deploySubBar.appendChild(sizeLabel);
  deploySubBar.appendChild(sizeSelect);

  if (unitRosterBar) {
    unitRosterBar.insertAdjacentElement("afterend", deploySubBar);
  } else if (actionDeployBtn?.parentElement) {
    actionDeployBtn.parentElement.insertBefore(sizeSelect, actionDeployBtn);
  }

  let activeUnitBtn = null;
  if (unitRosterBar) {
    unitRosterBar.innerHTML = "";
    UNITS.forEach((u, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.style.cssText =
        "display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:500;background:#1e293b;color:#f8fafc;border:1px solid #475569;cursor:pointer;pointer-events:auto;position:relative;z-index:21;";
      btn.innerHTML = `<img src="${u.icon}" alt="${u.label}" style="width:16px;height:16px;object-fit:contain;pointer-events:none;" onerror="this.style.display='none'" /><span style="pointer-events:none;">${u.label}</span>`;

      const selectThisUnit = () => {
        if (activeUnitBtn) {
          activeUnitBtn.style.background = "#1e293b";
          activeUnitBtn.style.borderColor = "#475569";
          activeUnitBtn.style.boxShadow = "none";
        }
        activeUnitBtn = btn;
        btn.style.background = "#b91c1c";
        btn.style.borderColor = "#fca5a5";
        btn.style.boxShadow = "0 0 0 2px rgba(251,191,36,0.75)";
        selectedUnit = u;
        syncDeploySubBar();
        onSelectUnitDef(u);
        soundManager.playSfx(soundManager.sfx.select);
      };

      btn.addEventListener("click", selectThisUnit);
      btn.onpointerdown = (e) => {
        e.stopPropagation();
      };

      if (idx === 0) {
        activeUnitBtn = btn;
        btn.style.background = "#b91c1c";
        btn.style.borderColor = "#fca5a5";
        btn.style.boxShadow = "0 0 0 2px rgba(251,191,36,0.75)";
      }
      unitRosterBar.appendChild(btn);
    });
  }

  let activeToolBtn = null;
  if (editorToolBar) {
    editorToolBar.innerHTML = "";
    EDITOR_TOOLS.forEach((t, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.style.cssText =
        "display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:500;background:#1e293b;color:#f8fafc;border:1px solid #475569;cursor:pointer;pointer-events:auto;position:relative;z-index:21;";
      btn.innerHTML = `<img src="${t.icon}" alt="${t.label}" style="width:16px;height:16px;object-fit:contain;pointer-events:none;" onerror="this.style.display='none'" /><span style="pointer-events:none;">${t.label}</span>`;
      btn.addEventListener("click", () => {
        if (activeToolBtn) {
          activeToolBtn.style.background = "#1e293b";
          activeToolBtn.style.borderColor = "#475569";
          activeToolBtn.style.boxShadow = "none";
        }
        activeToolBtn = btn;
        btn.style.background = "#334155";
        btn.style.borderColor = "#fbbf24";
        btn.style.boxShadow = "0 0 0 2px rgba(251,191,36,0.75)";
        onSelectEditorTool(t);
        soundManager.playSfx(soundManager.sfx.select);
      });
      if (idx === 1) {
        activeToolBtn = btn;
        btn.style.background = "#334155";
        btn.style.borderColor = "#fbbf24";
        btn.style.boxShadow = "0 0 0 2px rgba(251,191,36,0.75)";
      }
      editorToolBar.appendChild(btn);
    });
  }

  const setActiveModeButton = (mode) => {
    for (const b of [modeSandboxBtn, modePracticeBtn, modeEditorBtn]) {
      b?.classList.remove("ring-2", "ring-amber-400", "bg-amber-600");
    }
    const target = mode === "sandbox" ? modeSandboxBtn : mode === "practice" ? modePracticeBtn : modeEditorBtn;
    target?.classList.add("ring-2", "ring-amber-400", "bg-amber-600");

    const isEditor = mode === "editor";
    if (editorToolBar) editorToolBar.style.display = isEditor ? "flex" : "none";
    if (unitRosterBar) unitRosterBar.style.display = isEditor ? "none" : "flex";
    if (deploySubBar) deploySubBar.style.display = isEditor ? "none" : "flex";
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
    getSelectedMapPath: () => mapSelect?.value || MAPS[1]?.path || MAPS[0]?.path || "",
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
