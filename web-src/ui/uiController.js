import * as BABYLON from "@babylonjs/core";
import { MAPS, UNITS, EDITOR_TOOLS, UNIT_SIZE_OPTIONS } from "../config/gameData.js";
import { createSoundManager } from "../audio/audioManager.js";
import { createBabylonWorld } from "../scene/babylonWorld.js";
import { createTerrainSystem } from "../terrain/terrainSystem.js";
import { createUnitSystem } from "../units/unitSystem.js";

const UNIT_ICONS = {
  ashigaru: "▲",
  bow: "🏹",
  cannon: "💣",
  cavalry: "🐎",
  general: "★",
  katana: "⚔",
  matchlock: "🔥",
  naginata: "🔱",
  samurai: "🛡",
  yari: "🗡"
};

export class UIController {
  constructor({
    unitTypes,
    onMapChange,
    onModeChange,
    onTeamChange,
    onUnitTypeChange,
    onFormationSizeChange,
    onEditorToolChange,
    onOrderChange,
    onSpeedToggle,
    onMusicToggle,
    onClearUnits
  }) {
    this.unitTypes = Array.isArray(unitTypes) && unitTypes.length > 0 ? unitTypes : UNITS;
    this.onMapChange = onMapChange;
    this.onModeChange = onModeChange;
    this.onTeamChange = onTeamChange;
    this.onUnitTypeChange = onUnitTypeChange;
    this.onFormationSizeChange = onFormationSizeChange;
    this.onEditorToolChange = onEditorToolChange;
    this.onOrderChange = onOrderChange;
    this.onSpeedToggle = onSpeedToggle;
    this.onMusicToggle = onMusicToggle;
    this.onClearUnits = onClearUnits;

    this.mapSelect = document.getElementById("map-select");
    this.formationSelect = document.getElementById("formation-size");
    this.editorToolsEl = document.getElementById("editor-tools");
    this.redCountEl = document.getElementById("red-count");
    this.blueCountEl = document.getElementById("blue-count");
    this.terrainInfoEl = document.getElementById("terrain-info");
    this.statusLineEl = document.getElementById("status-line");
    this.speedBtn = document.getElementById("speed-toggle");
    this.musicBtn = document.getElementById("music-toggle");
    this.sidebarEl = document.getElementById("sidebar");
    this.sidebarToggleBtn = document.getElementById("sidebar-toggle");

    this.modeButtons = {
      sandbox: document.getElementById("mode-sandbox"),
      practice: document.getElementById("mode-practice"),
      editor: document.getElementById("mode-editor")
    };

    this.teamButtons = {
      red: document.getElementById("team-red"),
      blue: document.getElementById("team-blue")
    };

    this.orderButtons = {
      halt: document.getElementById("order-halt"),
      walk: document.getElementById("order-walk"),
      run: document.getElementById("order-run"),
      hold: document.getElementById("order-hold"),
      fire: document.getElementById("order-fire")
    };

    this.unitButtons = new Map();
    this.editorToolButtons = new Map();

    this._populateMapSelect();
    this._populateFormationSelect();
    this._buildUnitButtons();
    this._buildEditorTools();
    this._bindEvents();
  }

  _populateMapSelect() {
    if (!this.mapSelect) return;
    this.mapSelect.innerHTML = "";
    MAPS.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.path;
      opt.textContent = m.label;
      this.mapSelect.appendChild(opt);
    });
    if (MAPS.length > 0) {
      this.mapSelect.value = MAPS[1]?.path || MAPS[0]?.path || "";
    }
  }

  _populateFormationSelect() {
    if (!this.formationSelect) return;
    this.formationSelect.innerHTML = "";
    UNIT_SIZE_OPTIONS.forEach((optDef) => {
      const opt = document.createElement("option");
      opt.value = String(optDef.soldiers);
      opt.textContent = optDef.label;
      this.formationSelect.appendChild(opt);
    });
    if (UNIT_SIZE_OPTIONS.length > 0) {
      this.formationSelect.value = String(UNIT_SIZE_OPTIONS[0].soldiers);
    }
  }

  _buildUnitButtons() {
    const container = document.getElementById("unit-buttons");
    if (!container) return;
    container.innerHTML = "";

    this.unitTypes.forEach((u, index) => {
      const unitId = u.id || u.kind;
      const unitName = u.name || u.label || unitId;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "unit-btn";
      btn.title = `${unitName} (${u.role || "Unit"})`;
      if (index === 0) btn.classList.add("active");

      if (u.icon) {
        const img = document.createElement("img");
        img.src = u.icon;
        img.alt = unitName;
        img.onerror = () => {
          img.remove();
        };
        btn.appendChild(img);
      }

      const labelSpan = document.createElement("span");
      const fallbackIcon = u.icon ? "" : `${UNIT_ICONS[unitId] || "•"} `;
      labelSpan.textContent = `${fallbackIcon}${unitName}`;
      btn.appendChild(labelSpan);

      btn.addEventListener("click", () => {
        this.setActiveUnitType(unitId);
        this.onUnitTypeChange?.(unitId);
      });
      container.appendChild(btn);
      this.unitButtons.set(unitId, btn);
    });
  }

  _buildEditorTools() {
    if (!this.editorToolsEl) return;
    this.editorToolsEl.innerHTML = "";
    EDITOR_TOOLS.forEach((tool, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "unit-btn";
      btn.title = tool.label;
      if (idx === 1) btn.classList.add("active");

      if (tool.icon) {
        const img = document.createElement("img");
        img.src = tool.icon;
        img.alt = tool.label;
        img.onerror = () => {
          img.remove();
        };
        btn.appendChild(img);
      }

      const span = document.createElement("span");
      span.textContent = tool.label;
      btn.appendChild(span);

      btn.addEventListener("click", () => {
        this.setActiveEditorTool(tool.id);
        this.onEditorToolChange?.(tool);
      });
      this.editorToolsEl.appendChild(btn);
      this.editorToolButtons.set(tool.id, btn);
    });
  }

  _bindEvents() {
    this.sidebarToggleBtn?.addEventListener("click", () => {
      this.sidebarEl?.classList.toggle("collapsed");
      window.dispatchEvent(new Event("resize"));
    });

    this.mapSelect?.addEventListener("change", (e) => {
      this.onMapChange?.(e.target.value);
    });

    Object.entries(this.modeButtons).forEach(([mode, btn]) => {
      btn?.addEventListener("click", () => {
        this.setActiveMode(mode);
        this.onModeChange?.(mode);
      });
    });

    Object.entries(this.teamButtons).forEach(([team, btn]) => {
      btn?.addEventListener("click", () => {
        this.setActiveTeam(team);
        this.onTeamChange?.(team);
      });
    });

    this.formationSelect?.addEventListener("change", (e) => {
      this.onFormationSizeChange?.(Number(e.target.value));
    });

    Object.entries(this.orderButtons).forEach(([order, btn]) => {
      btn?.addEventListener("click", () => {
        this.setActiveOrder(order);
        this.onOrderChange?.(order);
      });
    });

    this.speedBtn?.addEventListener("click", () => {
      this.onSpeedToggle?.();
    });

    this.musicBtn?.addEventListener("click", () => {
      this.onMusicToggle?.();
    });

    document.getElementById("clear-units")?.addEventListener("click", () => {
      this.onClearUnits?.();
    });
  }

  getSelectedMapPath() {
    return this.mapSelect?.value || MAPS[1]?.path || MAPS[0]?.path || "";
  }

  setActiveMode(mode) {
    Object.entries(this.modeButtons).forEach(([key, btn]) => {
      btn?.classList.toggle("active", key === mode);
    });
    if (this.editorToolsEl) {
      this.editorToolsEl.style.display = mode === "editor" ? "grid" : "none";
    }
  }

  setActiveEditorTool(toolId) {
    this.editorToolButtons.forEach((btn, id) => {
      btn.classList.toggle("active", id === toolId);
    });
  }

  setActiveTeam(team) {
    const teamKey = team === 1 || team === "red" ? "red" : "blue";
    Object.entries(this.teamButtons).forEach(([key, btn]) => {
      btn?.classList.toggle("active", key === teamKey);
    });
  }

  setActiveUnitType(unitId) {
    this.unitButtons.forEach((btn, id) => {
      btn.classList.toggle("active", id === unitId);
    });
  }

  setActiveOrder(order) {
    Object.entries(this.orderButtons).forEach(([key, btn]) => {
      btn?.classList.toggle("active", key === order);
    });
  }

  setSpeedLabel(speed) {
    if (this.speedBtn) {
      this.speedBtn.textContent = `Speed: ${speed}x`;
    }
  }

  setMusicLabel(isPlaying) {
    if (this.musicBtn) {
      this.musicBtn.textContent = isPlaying ? "Music: On" : "Music: Off";
      this.musicBtn.classList.toggle("active", Boolean(isPlaying));
    }
  }

  setStatusMessage(msg) {
    if (this.statusLineEl) {
      this.statusLineEl.textContent = msg || "";
    }
  }

  updateHud({ redCount, blueCount, terrainLabel }) {
    if (this.redCountEl) {
      const spans = this.redCountEl.querySelectorAll("span");
      if (spans.length >= 2) spans[1].textContent = String(redCount);
      else this.redCountEl.textContent = `Red: ${redCount}`;
    }

    if (this.blueCountEl) {
      const spans = this.blueCountEl.querySelectorAll("span");
      if (spans.length >= 2) spans[1].textContent = String(blueCount);
      else this.blueCountEl.textContent = `Blue: ${blueCount}`;
    }

    if (this.terrainInfoEl && terrainLabel) {
      this.terrainInfoEl.textContent = `Terrain: ${terrainLabel}`;
    }
  }
}

export function bootstrapGame() {
  const canvas = document.getElementById("renderCanvas");
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

  const toCanvasLocalCoords = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      rect
    };
  };

  const world = createBabylonWorld(canvas);
  const {
    scene,
    camera,
    ground,
    groundMat,
    createSpritePlane,
    setSpriteCell,
    cursorRing,
    updateOrderArrow,
    hideOrderArrow
  } = world;

  const soundManager = createSoundManager();

  const state = {
    mode: "sandbox",
    activeTeam: 1,
    activeOrder: "walk",
    simSpeed: 1,
    selectedUnitDef: UNITS[0],
    selectedUnitSize: UNIT_SIZE_OPTIONS[0]?.soldiers ?? 10,
    selectedEditorTool: EDITOR_TOOLS[1] || EDITOR_TOOLS[0]
  };

  let unitSystem = null;
  let ui = null;
  let lastPointerClientPos = null;

  const terrainSystem = createTerrainSystem({
    scene,
    groundMat,
    createSpritePlane,
    onTerrainChanged: () => {
      unitSystem?.refreshTerrainPositions?.();
    }
  });

  unitSystem = createUnitSystem({
    scene,
    soundManager,
    getGroundHeightAt: terrainSystem.getGroundHeightAt,
    getTerrainInfoAt: terrainSystem.getTerrainInfoAt,
    createSpritePlane,
    setSpriteCell
  });

  ui = new UIController({
    unitTypes: UNITS,
    onMapChange: (mapPath) => {
      unitSystem.clearAllUnits();
      terrainSystem.buildTerrainFromMap(mapPath);
      soundManager?.playSfx?.(soundManager?.sfx?.select);
      ui.setStatusMessage(`Loaded map: ${mapPath}`);
    },
    onModeChange: (mode) => {
      state.mode = mode;
      if (mode === "practice") {
        const practiceMap = MAPS.find((m) => m.path.toLowerCase().includes("practice"));
        if (practiceMap && ui.mapSelect) {
          ui.mapSelect.value = practiceMap.path;
          terrainSystem.buildTerrainFromMap(practiceMap.path);
        }
        unitSystem.clearAllUnits();
        unitSystem.spawnUnit(
          new BABYLON.Vector3(10, 0, 0),
          UNITS[0],
          2,
          "hold",
          state.selectedUnitSize
        );
        ui.setStatusMessage("Practice mode: target squad placed on the field.");
      } else if (mode === "editor") {
        ui.setStatusMessage("Map Editor active: click or drag on the map to place or erase terrain.");
      } else {
        ui.setStatusMessage("Sandbox mode active.");
      }
      soundManager?.playSfx?.(soundManager?.sfx?.select);
    },
    onTeamChange: (team) => {
      state.activeTeam = team === 1 || team === "red" ? 1 : 2;
      soundManager?.playSfx?.(soundManager?.sfx?.select);
      ui.setStatusMessage(`Active team: ${state.activeTeam === 1 ? "Team 1 (Red)" : "Team 2 (Blue)"}`);
    },
    onUnitTypeChange: (unitId) => {
      const found = UNITS.find((u) => u.id === unitId || u.kind === unitId);
      if (found) {
        state.selectedUnitDef = found;
        soundManager?.playSfx?.(soundManager?.sfx?.select);
        ui.setStatusMessage(`Selected ${found.label} (Formation: ${state.selectedUnitSize}). Press D to deploy.`);
      }
    },
    onFormationSizeChange: (count) => {
      state.selectedUnitSize = Math.max(1, Number(count) || 10);
      soundManager?.playSfx?.(soundManager?.sfx?.select);
      ui.setStatusMessage(`Formation size set to ${state.selectedUnitSize}. Press D to deploy.`);
    },
    onEditorToolChange: (tool) => {
      state.selectedEditorTool = tool;
      soundManager?.playSfx?.(soundManager?.sfx?.select);
      ui.setStatusMessage(`Editor tool: ${tool.label}`);
    },
    onOrderChange: (order) => {
      state.activeOrder = order;
      unitSystem.issueOrderToSelected(order);
      soundManager?.playSfx?.(soundManager?.sfx?.move);
      ui.setStatusMessage(`Order: ${order.toUpperCase()}`);
    },
    onSpeedToggle: () => {
      const speeds = [1, 2, 4];
      const idx = speeds.indexOf(state.simSpeed);
      state.simSpeed = speeds[(idx + 1) % speeds.length];
      ui.setSpeedLabel(state.simSpeed);
      soundManager?.playSfx?.(soundManager?.sfx?.select);
      return state.simSpeed;
    },
    onMusicToggle: () => {
      const enabled = soundManager.toggleMusic();
      ui.setMusicLabel(enabled);
      return enabled;
    },
    onClearUnits: () => {
      unitSystem.clearAllUnits();
      soundManager?.playSfx?.(soundManager?.sfx?.select);
      ui.setStatusMessage("Cleared all units.");
    }
  });

  const selectionBox = document.createElement("div");
  selectionBox.style.cssText =
    "position:fixed;border:1.5px dashed #fbbf24;background:rgba(251,191,36,0.14);pointer-events:none;display:none;z-index:25;";
  document.body.appendChild(selectionBox);

  const pickGround = (clientX, clientY) => {
    const local = toCanvasLocalCoords(clientX, clientY);
    const pick = scene.pick(local.x, local.y, (mesh) => mesh === ground);
    if (pick?.hit && pick.pickedPoint) {
      return pick.pickedPoint;
    }
    return null;
  };

  // Resolve parent formation unit across soldier billboard meshes, selection rings, health bars, and range cones
  const resolveUnitFromNode = (node) => {
    let cur = node;
    while (cur) {
      if (cur.metadata?.unit) {
        return cur.metadata.unit;
      }
      if (typeof cur.name === "string" && cur.name.startsWith("soldier_node_")) {
        for (const u of unitSystem.units || []) {
          if (u.entities?.some((e) => e.node === cur || e.mesh === cur)) {
            return u;
          }
        }
      }
      cur = cur.parent;
    }
    return null;
  };

  const pickUnitAtClientCoords = (clientX, clientY) => {
    const local = toCanvasLocalCoords(clientX, clientY);
    const picks = scene.multiPick(local.x, local.y, (mesh) => Boolean(mesh?.isPickable));
    if (Array.isArray(picks)) {
      for (const hit of picks) {
        if (!hit?.hit) continue;
        const unitFromMesh = resolveUnitFromNode(hit.pickedMesh);
        if (unitFromMesh && unitFromMesh.hp > 0) {
          return unitFromMesh;
        }
      }
    }

    const fallbackPick = scene.pick(local.x, local.y, (mesh) => Boolean(mesh?.isPickable));
    if (fallbackPick?.hit) {
      const unitFromMesh = resolveUnitFromNode(fallbackPick.pickedMesh);
      if (unitFromMesh && unitFromMesh.hp > 0) {
        return unitFromMesh;
      }
    }

    // Fallback proximity check against formation centers in screen space so clicking near a formation always selects it
    const rect = canvas.getBoundingClientRect();
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const scaleX = width > 0 && rect.width > 0 ? rect.width / width : 1;
    const scaleY = height > 0 && rect.height > 0 ? rect.height / height : 1;
    const transformMatrix = scene.getTransformMatrix();

    let bestUnit = null;
    let bestDist = 36;
    for (const u of unitSystem.units || []) {
      if (u.hp <= 0) continue;
      const proj = BABYLON.Vector3.Project(u.pos, BABYLON.Matrix.Identity(), transformMatrix, {
        x: 0,
        y: 0,
        width,
        height
      });
      const sx = rect.left + proj.x * scaleX;
      const sy = rect.top + proj.y * scaleY;
      const d = Math.hypot(clientX - sx, clientY - sy);
      if (d <= bestDist) {
        bestDist = d;
        bestUnit = u;
      }
    }
    return bestUnit;
  };

  let isRightBoxSelecting = false;
  let isEditorPainting = false;
  let dragStart = null;
  let dragCurrent = null;
  let moveAimStart = null;
  let savedCameraPanSensibility = camera.panningSensibility;

  const setCameraPanningEnabled = (enabled) => {
    if (!camera) return;
    if (!enabled) {
      if (camera.panningSensibility > 0) {
        savedCameraPanSensibility = camera.panningSensibility;
      }
      camera.panningSensibility = 0;
    } else {
      camera.panningSensibility = savedCameraPanSensibility > 0 ? savedCameraPanSensibility : 1000;
    }
  };

  const deployAtClientCoords = (clientX, clientY) => {
    const pt = pickGround(clientX, clientY);
    if (!pt) return false;
    unitSystem.spawnUnit(
      pt,
      state.selectedUnitDef,
      state.activeTeam,
      state.activeOrder,
      state.selectedUnitSize
    );
    ui.setStatusMessage(
      `Deployed ${state.selectedUnitSize}x ${state.selectedUnitDef.label} for ${state.activeTeam === 1 ? "Red" : "Blue"}.`
    );
    return true;
  };

  window.addEventListener("keydown", (e) => {
    const tag = e.target?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (e.key === "d" || e.key === "D") {
      if (state.mode === "editor") return;
      const pos = lastPointerClientPos || {
        x: canvas.getBoundingClientRect().left + canvas.getBoundingClientRect().width * 0.5,
        y: canvas.getBoundingClientRect().top + canvas.getBoundingClientRect().height * 0.5
      };
      deployAtClientCoords(pos.x, pos.y);
    }
  });

  const updateBox = () => {
    if (!isRightBoxSelecting || !dragStart || !dragCurrent) {
      selectionBox.style.display = "none";
      return;
    }
    selectionBox.style.display = "block";
    selectionBox.style.left = `${Math.min(dragStart.x, dragCurrent.x)}px`;
    selectionBox.style.top = `${Math.min(dragStart.y, dragCurrent.y)}px`;
    selectionBox.style.width = `${Math.abs(dragCurrent.x - dragStart.x)}px`;
    selectionBox.style.height = `${Math.abs(dragCurrent.y - dragStart.y)}px`;
  };

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  canvas.addEventListener("pointerdown", (e) => {
    lastPointerClientPos = { x: e.clientX, y: e.clientY };
    const pt = pickGround(e.clientX, e.clientY);

    // Right-click: select unit on a unit, deselect on empty space, or Shift+Right-Click drag for multi-group selection (without camera panning)
    if (e.button === 2) {
      if (e.shiftKey) {
        setCameraPanningEnabled(false);
        isRightBoxSelecting = true;
        dragStart = { x: e.clientX, y: e.clientY };
        dragCurrent = { x: e.clientX, y: e.clientY };
        updateBox();
        return;
      }

      const pickedUnit = pickUnitAtClientCoords(e.clientX, e.clientY);
      if (pickedUnit && pickedUnit.hp > 0) {
        unitSystem.clearSelection();
        unitSystem.setUnitSelected(pickedUnit, true);
        soundManager?.playSfx?.(soundManager?.sfx?.select);
        ui.setStatusMessage(`Selected ${pickedUnit.def.label} (Team ${pickedUnit.team}).`);
      } else {
        unitSystem.clearSelection();
        soundManager?.playSfx?.(soundManager?.sfx?.select);
        ui.setStatusMessage("Selection cleared.");
      }
      return;
    }

    if (e.button !== 0) return;

    if (state.mode === "editor") {
      if (pt && state.selectedEditorTool) {
        if (state.selectedEditorTool.id === "erase") {
          const local = toCanvasLocalCoords(e.clientX, e.clientY);
          const hit = scene.pick(local.x, local.y);
          if (hit?.pickedMesh) terrainSystem.eraseTerrainFeatureAtMesh(hit.pickedMesh);
        } else {
          terrainSystem.spawnTerrainFeature(pt, state.selectedEditorTool);
        }
        isEditorPainting = true;
      }
      return;
    }

    // Left-click: move currently selected unit(s) to clicked map location
    if (unitSystem.getSelectedAliveUnits().length > 0 && pt) {
      moveAimStart = pt.clone();
      updateOrderArrow?.(moveAimStart, pt);
    }
  });

  window.addEventListener("pointermove", (e) => {
    lastPointerClientPos = { x: e.clientX, y: e.clientY };
    const pt = pickGround(e.clientX, e.clientY);
    if (pt) {
      cursorRing?.setEnabled?.(true);
      cursorRing?.position?.set?.(pt.x, terrainSystem.getGroundHeightAt(pt.x, pt.z) + 0.06, pt.z);
      const tInfo = terrainSystem.getTerrainInfoAt(pt.x, pt.z);
      ui.updateHud({
        redCount: unitSystem.getAliveCount(1),
        blueCount: unitSystem.getAliveCount(2),
        terrainLabel: tInfo.label
      });
    } else {
      cursorRing?.setEnabled?.(false);
    }

    if (moveAimStart && pt) {
      updateOrderArrow?.(moveAimStart, pt);
      return;
    }

    if (isEditorPainting) {
      if (pt && state.selectedEditorTool && state.selectedEditorTool.id !== "erase") {
        terrainSystem.spawnTerrainFeature(pt, state.selectedEditorTool);
      }
      return;
    }

    if (isRightBoxSelecting) {
      if (!e.shiftKey) {
        setCameraPanningEnabled(true);
      }
      dragCurrent = { x: e.clientX, y: e.clientY };
      updateBox();
    }
  });

  window.addEventListener("pointerup", (e) => {
    if (moveAimStart) {
      const endPt = pickGround(e.clientX, e.clientY) || moveAimStart;
      const dx = endPt.x - moveAimStart.x;
      const dz = endPt.z - moveAimStart.z;
      const aimAngle = Math.hypot(dx, dz) > 0.6 ? Math.atan2(dx, dz) : null;
      unitSystem.commandSelectedMoveTo(moveAimStart, aimAngle);
      soundManager?.playSfx?.(soundManager?.sfx?.move);
      ui.setStatusMessage("Selected unit(s) ordered to move to target location.");
      moveAimStart = null;
      hideOrderArrow?.();
      return;
    }

    if (isEditorPainting) {
      isEditorPainting = false;
      return;
    }

    if (isRightBoxSelecting) {
      isRightBoxSelecting = false;
      setCameraPanningEnabled(true);
      selectionBox.style.display = "none";

      if (dragStart) {
        const minX = Math.min(dragStart.x, e.clientX);
        const maxX = Math.max(dragStart.x, e.clientX);
        const minY = Math.min(dragStart.y, e.clientY);
        const maxY = Math.max(dragStart.y, e.clientY);

        const rect = canvas.getBoundingClientRect();
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const scaleX = width > 0 && rect.width > 0 ? rect.width / width : 1;
        const scaleY = height > 0 && rect.height > 0 ? rect.height / height : 1;
        const transformMatrix = scene.getTransformMatrix();

        let selectedCount = 0;
        for (const u of unitSystem.units || []) {
          if (u.hp <= 0) continue;
          const proj = BABYLON.Vector3.Project(u.pos, BABYLON.Matrix.Identity(), transformMatrix, {
            x: 0,
            y: 0,
            width,
            height
          });
          const sx = rect.left + proj.x * scaleX;
          const sy = rect.top + proj.y * scaleY;
          const inRect = sx >= minX && sx <= maxX && sy >= minY && sy <= maxY;
          if (inRect) {
            unitSystem.setUnitSelected(u, true);
            selectedCount++;
          }
        }
        soundManager?.playSfx?.(soundManager?.sfx?.select);
        ui.setStatusMessage(
          selectedCount > 0
            ? `Multi-selected ${selectedCount} unit${selectedCount === 1 ? "" : "s"}.`
            : "No units in multi-select box."
        );
      }

      dragStart = null;
      dragCurrent = null;
    }
  });

  let lastTime = performance.now();
  engine.runRenderLoop(() => {
    const now = performance.now();
    const rawDt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    const simDt = rawDt * state.simSpeed;

    const counts = unitSystem.updateSimulation(rawDt, simDt);
    ui.updateHud({
      redCount: counts?.redCount ?? unitSystem.getAliveCount(1),
      blueCount: counts?.blueCount ?? unitSystem.getAliveCount(2)
    });

    scene.render();
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });

  terrainSystem.buildTerrainFromMap(ui.getSelectedMapPath());
  ui.setStatusMessage("Right-click unit to select, click empty space to deselect, Shift+Right-Click for multi-select, D to deploy, left-click map to move.");
}
