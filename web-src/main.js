import * as BABYLON from "@babylonjs/core";
import { EDITOR_TOOLS, UNITS, UNIT_SIZE_OPTIONS } from "./config/gameData.js";
import { createSoundManager } from "./audio/audioManager.js";
import { createBabylonWorld } from "./scene/babylonWorld.js";
import { createTerrainSystem } from "./terrain/terrainSystem.js";
import { createUnitSystem } from "./units/unitSystem.js";
import { createUiController } from "./ui/uiController.js";

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("renderCanvas");
  const soundManager = createSoundManager();
  const world = createBabylonWorld(canvas);

  const state = {
    currentMode: "sandbox",
    activeTeam: 1, // 1 = Red, 2 = Blue
    pointerAction: "deploy", // "deploy" | "order"
    activeOrder: "walk", // "halt" | "walk" | "run" | "hold" | "fire"
    simSpeed: 1,
    selectedUnitDef: UNITS[0],
    selectedUnitSize: UNIT_SIZE_OPTIONS[0].soldiers,
    selectedEditorTool: EDITOR_TOOLS[1]
  };

  let ui = null;

  const terrainSystem = createTerrainSystem({
    scene: world.scene,
    groundMat: world.groundMat,
    createSpritePlane: world.createSpritePlane,
    onTerrainChanged: () => {
      for (const u of unitSystem.units) {
        u.pos.y = terrainSystem.getGroundHeightAt(u.pos.x, u.pos.z);
        u.root.position.copyFrom(u.pos);
      }
    }
  });

  const unitSystem = createUnitSystem({
    scene: world.scene,
    createSpritePlane: world.createSpritePlane,
    setSpriteCell: world.setSpriteCell,
    getGroundHeightAt: terrainSystem.getGroundHeightAt,
    getTerrainInfoAt: terrainSystem.getTerrainInfoAt,
    soundManager
  });

  ui = createUiController({
    soundManager,
    onSelectUnitDef: (unitDef) => {
      state.selectedUnitDef = unitDef;
      state.pointerAction = "deploy";
      ui.syncActionButtons(state.pointerAction);
    },
    onSelectUnitSize: (soldierCount) => {
      state.selectedUnitSize = Number(soldierCount) || 10;
      state.pointerAction = "deploy";
      ui.syncActionButtons(state.pointerAction);
    },
    onSelectEditorTool: (tool) => {
      state.selectedEditorTool = tool;
    },
    onSelectTeam: (team) => {
      state.activeTeam = team;
    },
    onSelectPointerAction: (action) => {
      state.pointerAction = action;
      ui.syncActionButtons(state.pointerAction);
    },
    onToggleSimSpeed: () => {
      state.simSpeed = state.simSpeed === 1 ? 2 : 1;
      return state.simSpeed;
    },
    onIssueOrder: (order) => {
      state.activeOrder = order;
      unitSystem.applyOrderToSelected(order);
    },
    onSelectMode: (mode) => {
      state.currentMode = mode;
      if (mode === "practice") {
        terrainSystem.buildTerrainFromMap("assets/Maps/Practice.png");
      }
    },
    onSelectMap: (mapPath) => {
      terrainSystem.buildTerrainFromMap(mapPath);
    },
    onClearAll: () => {
      unitSystem.clearAllUnits();
      terrainSystem.clearTerrainZones();
      world.hideOrderArrow();
    }
  });

  // Pointer & camera/order input coordination
  let pointerDownPos = null;
  let dragStartWorld = null;
  let isDraggingOrder = false;

  world.scene.onPointerObservable.add((pointerInfo) => {
    const pick = world.scene.pick(
      world.scene.pointerX,
      world.scene.pointerY,
      (m) => m === world.ground || m === world.backdrop
    );

    if (pick && pick.hit && pick.pickedPoint) {
      world.cursorRing.setEnabled(true);
      world.cursorRing.position.set(
        pick.pickedPoint.x,
        terrainSystem.getGroundHeightAt(pick.pickedPoint.x, pick.pickedPoint.z) + 0.08,
        pick.pickedPoint.z
      );
      ui.updateTerrainHint(terrainSystem.getTerrainInfoAt(pick.pickedPoint.x, pick.pickedPoint.z).label);
    } else {
      world.cursorRing.setEnabled(false);
    }

    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
      pointerDownPos = { x: world.scene.pointerX, y: world.scene.pointerY };
      const selectedList = unitSystem.getSelectedAliveUnits();
      if (state.currentMode !== "editor" && state.pointerAction === "order" && selectedList.length && pick?.hit) {
        dragStartWorld = pick.pickedPoint.clone();
        isDraggingOrder = false;
      }
    }

    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE && pointerDownPos && dragStartWorld && pick?.hit) {
      if (Math.hypot(world.scene.pointerX - pointerDownPos.x, world.scene.pointerY - pointerDownPos.y) > 8) {
        isDraggingOrder = true;
        world.camera.detachControl();
        world.updateOrderArrow(dragStartWorld, pick.pickedPoint);
      }
    }

    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERUP && pointerDownPos) {
      world.camera.attachControl(canvas, true);
      const dx = world.scene.pointerX - pointerDownPos.x;
      const dy = world.scene.pointerY - pointerDownPos.y;
      const movedDist = Math.hypot(dx, dy);
      pointerDownPos = null;

      if (isDraggingOrder && dragStartWorld && pick?.hit) {
        const aimAngle = Math.atan2(pick.pickedPoint.x - dragStartWorld.x, pick.pickedPoint.z - dragStartWorld.z);
        unitSystem.issueMoveOrderToSelected(pick.pickedPoint, state.activeOrder, aimAngle);
        soundManager.playSfx(soundManager.sfx.move);
        dragStartWorld = null;
        isDraggingOrder = false;
        world.hideOrderArrow();
        return;
      }

      dragStartWorld = null;
      isDraggingOrder = false;
      world.hideOrderArrow();
      if (movedDist >= 6) return;

      if (state.currentMode === "editor") {
        if (state.selectedEditorTool.id === "hand") return;
        if (state.selectedEditorTool.id === "erase") {
          const objPick = world.scene.pick(
            world.scene.pointerX,
            world.scene.pointerY,
            (m) => terrainSystem.terrainZones.some((z) => z.mesh === m)
          );
          if (objPick?.hit && objPick.pickedMesh && terrainSystem.eraseTerrainFeatureAtMesh(objPick.pickedMesh)) {
            soundManager.playSfx(soundManager.sfx.select);
          }
          return;
        }
        if (pick?.hit && pick.pickedPoint) {
          terrainSystem.spawnTerrainFeature(pick.pickedPoint, state.selectedEditorTool);
          soundManager.playSfx(soundManager.sfx.place);
        }
        return;
      }

      if (state.pointerAction === "deploy") {
        if (pick?.hit && pick.pickedPoint) {
          unitSystem.spawnUnit(
            pick.pickedPoint,
            state.selectedUnitDef,
            state.activeTeam,
            state.activeOrder,
            state.selectedUnitSize
          );
        }
      } else {
        const unitPick = world.scene.pick(
          world.scene.pointerX,
          world.scene.pointerY,
          (m) => Boolean(m.metadata?.unit)
        );
        if (unitPick?.hit && unitPick.pickedMesh?.metadata?.unit) {
          unitSystem.toggleUnitSelection(unitPick.pickedMesh.metadata.unit);
          soundManager.playSfx(soundManager.sfx.select);
          return;
        }

        if (unitSystem.getSelectedAliveUnits().length && pick?.hit && pick.pickedPoint) {
          unitSystem.issueMoveOrderToSelected(pick.pickedPoint, state.activeOrder);
          soundManager.playSfx(soundManager.sfx.move);
        }
      }
    }
  });

  // Main simulation & render loop
  world.scene.onBeforeRenderObservable.add(() => {
    const rawDt = Math.min(world.engine.getDeltaTime() / 1000, 0.05);
    const dt = rawDt * state.simSpeed;
    if (dt <= 0) return;

    const { redCount, blueCount } = unitSystem.updateSimulation(rawDt, dt);
    ui.updateAliveCounts(redCount, blueCount);
  });

  world.engine.runRenderLoop(() => world.scene.render());
  terrainSystem.buildTerrainFromMap(ui.getSelectedMapPath());
});
