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

  let selectedUnit = UNITS[0];
  let selectedSizeOption = UNIT_SIZE_OPTIONS[0];
  let currentMode = "sandbox";
  let activeTeam = 1;
  let pointerAction = "deploy";
  let musicOn = false;

  const prepButton = (el) => {
    if (!el) return;
    el.disabled = false;
    el.style.pointerEvents = "auto";
    el.style.cursor = "pointer";
    el.style.userSelect = "none";
    if (!el.style.position) {
      el.style.position = "relative";
    }
    el.style.zIndex = "50";
  };

  if (!unitRosterBar && topBar) {
    unitRosterBar = document.createElement("div");
    unitRosterBar.id = "unitRosterBar";
    unitRosterBar.style.cssText =
      "display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;padding:6px 8px;background:rgba(15,23,42,0.92);border-radius:8px;border:1px solid rgba(148,163,184,0.35);position:relative;z-index:40;pointer-events:auto;";
    topBar.insertAdjacentElement("afterend", unitRosterBar);
  } else if (unitRosterBar) {
    unitRosterBar.style.cssText =
      "display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;padding:6px 8px;background:rgba(15,23,42,0.92);border-radius:8px;border:1px solid rgba(148,163,184,0.35);position:relative;z-index:40;pointer-events:auto;";
  }

  if (!editorToolBar && topBar) {
    editorToolBar = document.createElement("div");
    editorToolBar.id = "editorToolBar";
    editorToolBar.style.cssText =
      "display:none;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;padding:6px 8px;background:rgba(15,23,42,0.92);border-radius:8px;border:1px solid rgba(148,163,184,0.35);position:relative;z-index:40;pointer-events:auto;";
    (unitRosterBar || topBar).insertAdjacentElement("afterend", editorToolBar);
  } else if (editorToolBar) {
    editorToolBar.style.cssText =
      "flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;padding:6px 8px;background:rgba(15,23,42,0.92);border-radius:8px;border:1px solid rgba(148,163,184,0.35);position:relative;z-index:40;pointer-events:auto;";
  }

  if (mapSelect) {
    mapSelect.disabled = false;
    mapSelect.style.pointerEvents = "auto";
    mapSelect.style.position = "relative";
    mapSelect.style.zIndex = "50";
    mapSelect.innerHTML = "";
    MAPS.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.path;
      opt.textContent = m.label;
      mapSelect.appendChild(opt);
    });
    mapSelect.value = MAPS[1]?.path || MAPS[0]?.path || "";
  }

  const deploySubBar = document.createElement("div");
  deploySubBar.id = "deployFormationSubBar";
  deploySubBar.style.cssText =
    "display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px;padding:6px 10px;background:rgba(15,23,42,0.92);color:#f8fafc;font-size:12px;border-radius:8px;border:1px solid rgba(148,163,184,0.35);width:fit-content;position:relative;z-index:40;pointer-events:auto;";

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
    "background:#1e293b;color:#f8fafc;font-size:12px;font-weight:500;padding:4px 8px;border-radius:6px;border:1px solid #475569;cursor:pointer;pointer-events:auto;position:relative;z-index:50;";
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
    soundManager?.playSfx?.(soundManager?.sfx?.select);
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
        "display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:500;background:#1e293b;color:#f8fafc;border:1px solid #475569;cursor:pointer;pointer-events:auto;position:relative;z-index:50;";
      btn.innerHTML = `<img src="${u.icon}" alt="${u.label}" style="width:16px;height:16px;object-fit:contain;pointer-events:none;" onerror="this.style.display='none'" /><span style="pointer-events:none;">${u.label}</span>`;

      btn.addEventListener("click", () => {
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
        onSelectUnitDef?.(u);
        soundManager?.playSfx?.(soundManager?.sfx?.select);
      });

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
        "display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:500;background:#1e293b;color:#f8fafc;border:1px solid #475569;cursor:pointer;pointer-events:auto;position:relative;z-index:50;";
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
        onSelectEditorTool?.(t);
        soundManager?.playSfx?.(soundManager?.sfx?.select);
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

  const syncModeVisuals = () => {
    const modeButtons = [
      { btn: modeSandboxBtn, mode: "sandbox" },
      { btn: modePracticeBtn, mode: "practice" },
      { btn: modeEditorBtn, mode: "editor" }
    ];
    for (const { btn, mode } of modeButtons) {
      if (!btn) continue;
      const isSelected = currentMode === mode;
      btn.classList.toggle("ring-2", isSelected);
      btn.classList.toggle("ring-amber-400", isSelected);
      btn.classList.toggle("bg-amber-600", isSelected);
      btn.style.backgroundColor = isSelected ? "#d97706" : "";
      btn.style.outline = isSelected ? "2px solid #fbbf24" : "none";
      btn.style.boxShadow = isSelected ? "0 0 0 2px rgba(251,191,36,0.85)" : "none";
    }

    const isEditor = currentMode === "editor";
    if (editorToolBar) editorToolBar.style.display = isEditor ? "flex" : "none";
    if (unitRosterBar) unitRosterBar.style.display = isEditor ? "none" : "flex";
    if (deploySubBar) deploySubBar.style.display = isEditor ? "none" : "flex";
  };

  const handleModeChange = (mode) => {
    currentMode = mode;
    syncModeVisuals();
    onSelectMode?.(mode);
    soundManager?.playSfx?.(soundManager?.sfx?.select);
  };

  syncModeVisuals();

  const handleTeamChange = (team) => {
    activeTeam = team;
    if (team1Btn) {
      const isRed = team === 1;
      team1Btn.classList.toggle("ring-2", isRed);
      team1Btn.classList.toggle("ring-red-300", isRed);
      team1Btn.style.outline = isRed ? "2px solid #fecaca" : "none";
      team1Btn.style.boxShadow = isRed ? "0 0 0 2px rgba(254,202,202,0.85)" : "none";
    }
    if (team2Btn) {
      const isBlue = team === 2;
      team2Btn.classList.toggle("ring-2", isBlue);
      team2Btn.classList.toggle("ring-blue-300", isBlue);
      team2Btn.style.backgroundColor = isBlue ? "#2563eb" : "";
      team2Btn.style.outline = isBlue ? "2px solid #bfdbfe" : "none";
      team2Btn.style.boxShadow = isBlue ? "0 0 0 2px rgba(191,219,254,0.85)" : "none";
    }
    onSelectTeam?.(team);
    soundManager?.playSfx?.(soundManager?.sfx?.select);
  };
  handleTeamChange(activeTeam);

  const syncActionButtons = (action) => {
    pointerAction = action;
    if (actionDeployBtn) {
      const isDeploy = action === "deploy";
      actionDeployBtn.classList.toggle("ring-2", isDeploy);
      actionDeployBtn.classList.toggle("ring-amber-400", isDeploy);
      actionDeployBtn.style.backgroundColor = isDeploy ? "#dc2626" : "";
      actionDeployBtn.style.outline = isDeploy ? "2px solid #fbbf24" : "none";
      actionDeployBtn.style.boxShadow = isDeploy ? "0 0 0 2px rgba(251,191,36,0.85)" : "none";
    }
    if (actionOrderBtn) {
      const isOrder = action === "order";
      actionOrderBtn.classList.toggle("ring-2", isOrder);
      actionOrderBtn.classList.toggle("ring-amber-400", isOrder);
      actionOrderBtn.style.backgroundColor = isOrder ? "#d97706" : "";
      actionOrderBtn.style.outline = isOrder ? "2px solid #fbbf24" : "none";
      actionOrderBtn.style.boxShadow = isOrder ? "0 0 0 2px rgba(251,191,36,0.85)" : "none";
    }
  };
  syncActionButtons(pointerAction);

  const handleActionChange = (action) => {
    syncActionButtons(action);
    onSelectPointerAction?.(action);
    soundManager?.playSfx?.(soundManager?.sfx?.select);
  };

  const handleSpeedToggle = () => {
    const nextSpeed = onToggleSimSpeed?.();
    if (speedBtn && typeof nextSpeed === "number") {
      speedBtn.textContent = `Speed: ${nextSpeed}x`;
    }
    soundManager?.playSfx?.(soundManager?.sfx?.select);
  };

  const handleMusicToggle = () => {
    musicOn = !musicOn;
    soundManager?.setMusicEnabled?.(musicOn);
    if (musicBtn) musicBtn.textContent = `Music: ${musicOn ? "On" : "Off"}`;
  };

  const handleClear = () => {
    onClearAll?.();
    soundManager?.playSfx?.(soundManager?.sfx?.select);
  };

  const topControlActions = new Map([
    [modeSandboxBtn, () => handleModeChange("sandbox")],
    [modePracticeBtn, () => handleModeChange("practice")],
    [modeEditorBtn, () => handleModeChange("editor")],
    [team1Btn, () => handleTeamChange(1)],
    [team2Btn, () => handleTeamChange(2)],
    [actionDeployBtn, () => handleActionChange("deploy")],
    [actionOrderBtn, () => handleActionChange("order")],
    [speedBtn, handleSpeedToggle],
    [musicBtn, handleMusicToggle],
    [clearBtn, handleClear]
  ]);

  for (const [btn, fn] of topControlActions.entries()) {
    if (!btn) continue;
    prepButton(btn);
    btn.addEventListener("click", fn);
  }

  mapSelect?.addEventListener("change", () => {
    onSelectMap?.(mapSelect.value);
    soundManager?.playSfx?.(soundManager?.sfx?.select);
  });

  const orderButtons = document.querySelectorAll("[data-order]");
  orderButtons.forEach((btn) => {
    prepButton(btn);
    btn.addEventListener("click", () => {
      orderButtons.forEach((b) => {
        b.classList.remove("ring-2", "ring-amber-400", "bg-amber-600", "text-white");
        b.style.outline = "none";
        b.style.boxShadow = "none";
      });
      btn.classList.add("ring-2", "ring-amber-400", "bg-amber-600", "text-white");
      btn.style.outline = "2px solid #fbbf24";
      btn.style.boxShadow = "0 0 0 2px rgba(251,191,36,0.8)";
      onIssueOrder?.(btn.dataset.order);
      soundManager?.playSfx?.(soundManager?.sfx?.select);
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
