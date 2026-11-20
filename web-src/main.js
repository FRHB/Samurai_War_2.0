import * as BABYLON from "babylonjs";
import { MAPS, UNITS, DEFAULT_ORDER, SIM_SPEEDS } from "./config/gameData.js";
import { createBabylonWorld } from "./scene/babylonWorld.js";
import { createTerrainSystem } from "./terrain/terrainSystem.js";
import { createUnitSystem } from "./units/unitSystem.js";
import { UIController } from "./ui/uiController.js";
import { createAudioManager } from "./audio/audioManager.js";

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

const world = createBabylonWorld(canvas, engine);
const { scene, camera, shadowGenerator, groundMaterial, getGroundPointAtPointer, setCameraTargetBounds } = world;

const audioManager = createAudioManager();
const terrainSystem = createTerrainSystem(scene, shadowGenerator, groundMaterial);
const unitSystem = createUnitSystem(scene, shadowGenerator, terrainSystem);

let currentMode = "sandbox";
let activeTeam = 1;
let pointerAction = "deploy";
let selectedUnitDef = UNITS[0];
let formationSize = 1;
let currentOrder = DEFAULT_ORDER;
let speedIndex = 0;
let musicEnabled = false;
let isDragging = false;
let dragStart = null;
let dragCurrent = null;
let pointerDownPos = null;
let activeEditorToolId = "paint";

const selectionBox = document.createElement("div");
selectionBox.style.cssText =
  "position:fixed;border:1.5px dashed #fbbf24;background:rgba(251,191,36,0.14);pointer-events:none;display:none;z-index:25;";
document.body.appendChild(selectionBox);

const ui = new UIController({
  unitTypes: UNITS,
  onMapChange: async (mapPath) => {
    await loadMapByPath(mapPath);
  },
  onModeChange: (mode) => {
    currentMode = mode;
    terrainSystem.setEditorMode(mode === "editor");
    if (mode === "practice") {
      unitSystem.spawnPracticeTarget(2);
      ui.setStatusMessage("Practice mode: target dummy squad spawned.");
    } else if (mode === "editor") {
      ui.setStatusMessage("Map Editor active: click or drag on the map to paint terrain.");
    } else {
      ui.setStatusMessage("Sandbox mode active.");
    }
  },
  onTeamChange: (team) => {
    activeTeam = team === 1 || team === "red" ? 1 : 2;
    ui.setStatusMessage(`Active team: ${activeTeam === 1 ? "Team 1 (Red)" : "Team 2 (Blue)"}`);
  },
  onToolChange: (tool) => {
    pointerAction = tool === "select" || tool === "order" ? "order" : "deploy";
    ui.setStatusMessage(
      pointerAction === "deploy"
        ? `Deploy tool active (${selectedUnitDef.label} x${formationSize}). Click map to deploy.`
        : "Move / Select tool active: click/drag to select units, or click/right-click to issue orders."
    );
  },
  onUnitTypeChange: (unitId) => {
    const found = UNITS.find((u) => u.id === unitId || u.kind === unitId);
    if (found) {
      selectedUnitDef = found;
      pointerAction = "deploy";
      ui.setActiveTool("deploy");
      ui.setStatusMessage(`Selected ${selectedUnitDef.label} (Formation: ${formationSize}).`);
    }
  },
  onFormationSizeChange: (count) => {
    formationSize = Math.max(1, Number(count) || 1);
    ui.setStatusMessage(`Formation size set to ${formationSize}.`);
  },
  onEditorToolChange: (tool) => {
    activeEditorToolId = tool?.id || "paint";
    ui.setStatusMessage(`Editor tool: ${tool?.label || activeEditorToolId}`);
  },
  onOrderChange: (order) => {
    currentOrder = order;
    unitSystem.issueOrderToSelected(order);
    ui.setStatusMessage(`Order issued: ${order.toUpperCase()}`);
  },
  onSpeedToggle: () => {
    speedIndex = (speedIndex + 1) % SIM_SPEEDS.length;
    const nextSpeed = SIM_SPEEDS[speedIndex];
    ui.setSpeedLabel(nextSpeed);
    ui.setStatusMessage(`Simulation speed: ${nextSpeed}x`);
  },
  onMusicToggle: () => {
    musicEnabled = !musicEnabled;
    audioManager.setMusicEnabled(musicEnabled);
    ui.setMusicLabel(musicEnabled);
    ui.setStatusMessage(musicEnabled ? "Battlefield music: On" : "Battlefield music: Off");
  },
  onClearUnits: () => {
    unitSystem.clearAllUnits();
    ui.setStatusMessage("Cleared all units from the battlefield.");
  }
});

async function loadMapByPath(mapPath) {
  const mapDef = MAPS.find((m) => m.path === mapPath) || MAPS[0];
  unitSystem.clearAllUnits();
  const bounds = await terrainSystem.loadMap(mapDef);
  if (bounds && setCameraTargetBounds) {
    setCameraTargetBounds(bounds);
  }
  ui.setStatusMessage(`Loaded map: ${mapDef.label}`);
}

function updateSelectionBoxVisual() {
  if (!isDragging || !dragStart || !dragCurrent) {
    selectionBox.style.display = "none";
    return;
  }
  const left = Math.min(dragStart.x, dragCurrent.x);
  const top = Math.min(dragStart.y, dragCurrent.y);
  const width = Math.abs(dragCurrent.x - dragStart.x);
  const height = Math.abs(dragCurrent.y - dragStart.y);
  selectionBox.style.display = "block";
  selectionBox.style.left = `${left}px`;
  selectionBox.style.top = `${top}px`;
  selectionBox.style.width = `${width}px`;
  selectionBox.style.height = `${height}px`;
}

canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

canvas.addEventListener("pointerdown", (e) => {
  if (e.button === 2) {
    const pt = getGroundPointAtPointer(e.clientX, e.clientY);
    if (pt) {
      unitSystem.commandSelectedMoveOrAttack(pt, currentOrder);
      ui.setStatusMessage(`Issued ${currentOrder.toUpperCase()} order toward target point.`);
    }
    return;
  }

  if (e.button !== 0) return;

  pointerDownPos = { x: e.clientX, y: e.clientY };

  if (currentMode === "editor") {
    const pt = getGroundPointAtPointer(e.clientX, e.clientY);
    if (pt) {
      terrainSystem.applyEditorBrush(pt, activeEditorToolId);
      isDragging = true;
    }
    return;
  }

  if (pointerAction === "deploy") {
    const pt = getGroundPointAtPointer(e.clientX, e.clientY);
    if (pt) {
      const spawned = unitSystem.deployFormation({
        team: activeTeam,
        unitDef: selectedUnitDef,
        count: formationSize,
        center: pt,
        defaultOrder: currentOrder
      });
      ui.setStatusMessage(
        `Deployed ${spawned}x ${selectedUnitDef.label} for ${activeTeam === 1 ? "Red" : "Blue"}.`
      );
    }
    return;
  }

  isDragging = true;
  dragStart = { x: e.clientX, y: e.clientY };
  dragCurrent = { x: e.clientX, y: e.clientY };
  updateSelectionBoxVisual();
});

window.addEventListener("pointermove", (e) => {
  const pt = getGroundPointAtPointer(e.clientX, e.clientY);
  if (pt) {
    const label = terrainSystem.getTerrainLabelAt(pt.x, pt.z);
    ui.updateHud({
      redCount: unitSystem.getAliveCount(1),
      blueCount: unitSystem.getAliveCount(2),
      terrainLabel: label
    });
  }

  if (!isDragging) return;

  if (currentMode === "editor") {
    if (pt) terrainSystem.applyEditorBrush(pt, activeEditorToolId);
    return;
  }

  dragCurrent = { x: e.clientX, y: e.clientY };
  updateSelectionBoxVisual();
});

window.addEventListener("pointerup", (e) => {
  if (!isDragging) return;

  if (currentMode === "editor") {
    isDragging = false;
    pointerDownPos = null;
    return;
  }

  const endPos = { x: e.clientX, y: e.clientY };
  const movedDist = dragStart
    ? Math.hypot(endPos.x - dragStart.x, endPos.y - dragStart.y)
    : 0;

  isDragging = false;
  selectionBox.style.display = "none";

  if (movedDist < 6) {
    const pt = getGroundPointAtPointer(endPos.x, endPos.y);
    if (pt) {
      const picked = unitSystem.pickUnitAtPoint(pt);
      if (picked && picked.team === activeTeam) {
        unitSystem.selectSingleUnit(picked);
        ui.setStatusMessage(`Selected ${picked.label} (Team ${picked.team}).`);
      } else if (unitSystem.hasSelection()) {
        unitSystem.commandSelectedMoveOrAttack(pt, currentOrder);
        ui.setStatusMessage(`Ordered selected units to move (${currentOrder.toUpperCase()}).`);
      } else if (picked) {
        unitSystem.commandSelectedMoveOrAttack(pt, currentOrder, picked);
        ui.setStatusMessage(`Ordered attack on ${picked.label}.`);
      }
    }
  } else if (dragStart) {
    const minX = Math.min(dragStart.x, endPos.x);
    const maxX = Math.max(dragStart.x, endPos.x);
    const minY = Math.min(dragStart.y, endPos.y);
    const maxY = Math.max(dragStart.y, endPos.y);
    const count = unitSystem.selectUnitsInScreenRect(minX, minY, maxX, maxY, scene, camera);
    ui.setStatusMessage(`Selected ${count} unit${count === 1 ? "" : "s"}.`);
  }

  dragStart = null;
  dragCurrent = null;
  pointerDownPos = null;
});

scene.registerBeforeRender(() => {
  const rawDt = engine.getDeltaTime() / 1000;
  const dt = Math.min(rawDt, 0.05) * SIM_SPEEDS[speedIndex];
  unitSystem.update(dt, currentMode);
  ui.updateHud({
    redCount: unitSystem.getAliveCount(1),
    blueCount: unitSystem.getAliveCount(2)
  });
});

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});

(async () => {
  const initialMap = ui.getSelectedMapPath() || MAPS[0]?.path;
  await loadMapByPath(initialMap);
  ui.setStatusMessage("Ready. Select Deploy or Move / Select to command forces.");
})();
