import * as BABYLON from "@babylonjs/core";
import { createUnitBillboardAtlas, getUnitBillboardSpec } from "./unitBillboards.js";

const DEAD_CLEANUP_DELAY = 1.6;
const FRONT_CONE_HALF_ANGLE = (55 * Math.PI) / 180;
const PROXIMITY_REACTION_RADIUS = 3.2;
const FORMATION_COLUMNS_BY_SIZE = Object.freeze({
  10: 5,
  50: 10,
  100: 10,
  250: 25,
  500: 25
});

export function createUnitSystem({
  scene,
  soundManager,
  getGroundHeightAt,
  getTerrainInfoAt,
  createSpritePlane,
  setSpriteCell
}) {
  const units = [];
  const combatEffects = [];
  const billboardAtlas = createUnitBillboardAtlas(scene);
  let simFrameCounter = 0;

  const normalizeAngle = (angle) => {
    let a = angle;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  };

  // Yaw convention matches atan2(dx, dz) where facing angle 0 points along +Z and angle +PI/2 points along +X
  const isInFrontSightCone = (fromX, fromZ, facingYaw, toX, toZ, halfAngle = FRONT_CONE_HALF_ANGLE) => {
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const dist = Math.hypot(dx, dz);
    if (dist <= 0.0001) return true;
    const angleToTarget = Math.atan2(dx, dz);
    const delta = Math.abs(normalizeAngle(angleToTarget - facingYaw));
    return delta <= halfAngle;
  };

  const hasClearLineOfSight = (unitObj, fromX, fromZ, toX, toZ) => {
    // Cannons fire elevated arcs; bow/matchlock check intermediate tree cover along the sightline
    if (unitObj?.def?.id === "cannon") return true;
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const dist = Math.hypot(dx, dz);
    if (dist <= 0.0001) return true;

    const steps = Math.max(3, Math.min(14, Math.ceil(dist / 1.5)));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const sx = fromX + dx * t;
      const sz = fromZ + dz * t;
      const sampleTerrain = getTerrainInfoAt(sx, sz);
      if (sampleTerrain?.type === "trees") {
        return false;
      }
    }
    return true;
  };

  const spawnCombatFlash = (pos, isSmoke = false, radius = 0.45) => {
    if (isSmoke) {
      const puff = createSpritePlane("smoke", Math.floor(Math.random() * 8), 7, radius * 1.25, radius * 1.25);
      puff.position.set(pos.x, getGroundHeightAt(pos.x, pos.z) + 0.3, pos.z);
      combatEffects.push({ mesh: puff, ttl: 0.4, startScale: 1, isFlash: false });
      return;
    }
    const disc = BABYLON.MeshBuilder.CreateDisc("fx", { radius, tessellation: 10 }, scene);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(pos.x, getGroundHeightAt(pos.x, pos.z) + 0.2, pos.z);
    disc.isPickable = false;
    const mat = new BABYLON.StandardMaterial("fxMat", scene);
    mat.emissiveColor = new BABYLON.Color3(1, 0.52, 0.16);
    mat.alpha = 0.78;
    disc.material = mat;
    combatEffects.push({ mesh: disc, ttl: 0.22, startScale: 1, isFlash: true });
  };

  const spawnAttackSlash = (fromPos, toPos, team) => {
    const midX = (fromPos.x + toPos.x) * 0.5;
    const midZ = (fromPos.z + toPos.z) * 0.5;
    const y = getGroundHeightAt(midX, midZ) + 0.36;
    const slash = BABYLON.MeshBuilder.CreatePlane("slashArc", { width: 0.85, height: 0.26 }, scene);
    slash.position.set(midX, y, midZ);
    slash.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    slash.isPickable = false;
    const mat = new BABYLON.StandardMaterial(`slashMat_${Date.now()}_${Math.random()}`, scene);
    mat.emissiveColor = team === 1 ? new BABYLON.Color3(1, 0.85, 0.45) : new BABYLON.Color3(0.65, 0.9, 1);
    mat.alpha = 0.85;
    mat.backFaceCulling = false;
    slash.material = mat;
    slash.onDisposeObservable.add(() => mat.dispose());
    combatEffects.push({ mesh: slash, ttl: 0.18, startScale: 1, isFlash: true });
  };

  // Small light facing arrow highlight shown on selected soldiers indicating which way they face
  const createSoldierFacingArrow = (soldierNode, team, spec) => {
    const isRed = team === 1;
    const arrowColor = isRed
      ? new BABYLON.Color3(1.0, 0.65, 0.65)
      : new BABYLON.Color3(0.65, 0.85, 1.0);

    const arrowLen = Math.max(0.26, (spec?.width ?? 0.78) * 0.42);
    const arrowWidth = Math.max(0.18, (spec?.width ?? 0.78) * 0.28);

    const arrow = BABYLON.MeshBuilder.CreateCylinder(
      `facingArrow_${soldierNode.name}`,
      {
        diameterTop: 0.01,
        diameterBottom: arrowWidth,
        height: arrowLen,
        tessellation: 3
      },
      scene
    );
    arrow.parent = soldierNode;
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(0, 0.08, (spec?.width ?? 0.78) * 0.55 + arrowLen * 0.45);
    arrow.isPickable = false;
    arrow.setEnabled(false);

    const mat = new BABYLON.StandardMaterial(`facingArrowMat_${soldierNode.name}`, scene);
    mat.diffuseColor = arrowColor;
    mat.emissiveColor = arrowColor.scale(0.8);
    mat.alpha = 0.65;
    mat.backFaceCulling = false;
    arrow.material = mat;

    arrow.onDisposeObservable.add(() => mat.dispose());
    return arrow;
  };

  const syncUnitFacingArrows = (unitObj) => {
    const showArrows = Boolean(unitObj.selected && unitObj.hp > 0);
    for (const ent of unitObj.entities || []) {
      if (!ent.facingArrow || ent.facingArrow.isDisposed()) continue;
      ent.facingArrow.setEnabled(showArrows && Boolean(ent.alive));
    }
  };

  // Forward-facing sight/range arc outline for ranged units (bow, matchlock, cannon)
  const createRangeOutline = (root, unitDef, team) => {
    if (!unitDef?.ranged || !unitDef?.range) return null;
    const isRed = team === 1;
    const outlineColor = isRed
      ? new BABYLON.Color3(1.0, 0.36, 0.36)
      : new BABYLON.Color3(0.36, 0.68, 1.0);

    const segments = 28;
    const arcPoints = [];
    for (let s = 0; s <= segments; s++) {
      const t = s / segments;
      const theta = -FRONT_CONE_HALF_ANGLE + t * (FRONT_CONE_HALF_ANGLE * 2);
      const px = Math.sin(theta) * unitDef.range;
      const pz = Math.cos(theta) * unitDef.range;
      arcPoints.push(new BABYLON.Vector3(px, 0.08, pz));
    }
    arcPoints.push(new BABYLON.Vector3(0, 0.08, 0));
    arcPoints.push(arcPoints[0].clone());

    const coneLine = BABYLON.MeshBuilder.CreateLines(
      `rangeCone_${unitDef.id}_${team}_${Math.random().toString(36).slice(2, 6)}`,
      { points: arcPoints, updatable: false },
      scene
    );
    coneLine.parent = root;
    coneLine.isPickable = false;
    coneLine.color = outlineColor;
    coneLine.alpha = 0.45;

    return { ring: coneLine, baseRange: unitDef.range };
  };

  const updateRangeOutline = (unitObj, tInfo) => {
    if (!unitObj.rangeOutline) return;
    const { ring, baseRange } = unitObj.rangeOutline;
    if (ring.isDisposed()) return;
    if (unitObj.hp <= 0) {
      ring.setEnabled(false);
      return;
    }
    const effectiveRange = tInfo?.type === "hills" ? baseRange * 1.15 : baseRange;
    const scaleRatio = effectiveRange / Math.max(0.01, baseRange);
    ring.scaling.set(scaleRatio, 1, scaleRatio);
    ring.alpha = unitObj.selected ? 0.72 : 0.44;
    ring.setEnabled(true);
  };

  // Scale health bar width to unit count and per-unit max HP so each soldier has real HP
  const computeFormationHpBarWidth = (count, unitDef, cols, spacing) => {
    const typeHpScale = Math.min(1.35, Math.max(0.75, (unitDef?.hp ?? 50) / 55));
    const countScale = count <= 1 ? 0.55 : Math.min(3.4, 0.55 + Math.sqrt(count) * 0.12);
    const gridSpan = Math.max(0.55, cols * spacing * 0.72);
    return Math.min(3.6, Math.max(0.52, Math.min(gridSpan, countScale * typeHpScale)));
  };

  const createHpBar = (root, team, width = 0.65) => {
    const barHolder = new BABYLON.TransformNode(`hpHolder_${Date.now()}_${Math.random()}`, scene);
    barHolder.parent = root;
    barHolder.position.set(0, 1.05, 0);
    barHolder.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

    const height = 0.075;

    const bgMesh = BABYLON.MeshBuilder.CreatePlane("hpBg", { width, height }, scene);
    bgMesh.parent = barHolder;
    bgMesh.isPickable = false;
    const bgMat = new BABYLON.StandardMaterial(`hpBgMat_${Date.now()}_${Math.random()}`, scene);
    bgMat.diffuseColor = new BABYLON.Color3(0.08, 0.08, 0.1);
    bgMat.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    bgMat.backFaceCulling = false;
    bgMesh.material = bgMat;

    const fillWidth = Math.max(0.04, width - 0.03);
    const fillMesh = BABYLON.MeshBuilder.CreatePlane("hpFill", { width: fillWidth, height: height - 0.02 }, scene);
    fillMesh.parent = barHolder;
    fillMesh.position.z = -0.01;
    fillMesh.isPickable = false;
    const fillMat = new BABYLON.StandardMaterial(`hpFillMat_${Date.now()}_${Math.random()}`, scene);
    fillMat.diffuseColor = team === 1 ? new BABYLON.Color3(0.92, 0.24, 0.24) : new BABYLON.Color3(0.24, 0.56, 0.96);
    fillMat.emissiveColor = team === 1 ? new BABYLON.Color3(0.35, 0.08, 0.08) : new BABYLON.Color3(0.08, 0.2, 0.35);
    fillMat.backFaceCulling = false;
    fillMesh.material = fillMat;

    return { barHolder, fillMesh, fillMat, fillWidth };
  };

  const syncFormationStats = (unitObj) => {
    const aliveEntities = unitObj.entities.filter((e) => e.alive);
    if (!aliveEntities.length) {
      unitObj.hp = 0;
      unitObj.morale = 0;
      return;
    }
    let hpSum = 0;
    let moraleSum = 0;
    let dmgSum = 0;
    let armorSum = 0;
    for (const e of aliveEntities) {
      hpSum += e.hp;
      moraleSum += e.morale;
      dmgSum += e.dmg;
      armorSum += e.armor;
    }
    const len = aliveEntities.length;
    unitObj.hp = hpSum;
    unitObj.morale = moraleSum / len;
    unitObj.dmg = dmgSum;
    unitObj.armor = armorSum / len;
  };

  const updateHpBar = (unitObj) => {
    if (!unitObj.hpBar) return;
    const ratio = Math.max(0, Math.min(1, unitObj.hp / Math.max(1, unitObj.maxHp)));
    unitObj.hpBar.fillMesh.scaling.x = Math.max(0.001, ratio);
    unitObj.hpBar.fillMesh.position.x = -(1 - ratio) * (unitObj.hpBar.fillWidth * 0.5);
    if (ratio <= 0.3) {
      unitObj.hpBar.fillMat.diffuseColor.set(0.95, 0.2, 0.15);
    } else if (ratio <= 0.6) {
      unitObj.hpBar.fillMat.diffuseColor.set(0.95, 0.72, 0.18);
    }
  };

  const applyEntityVisualState = (entity, unitId, team, fallen) => {
    const tex = billboardAtlas.getUnitBillboardTexture(unitId, team, fallen ? "fallen" : "alive");
    if (entity.mesh.material && tex) {
      entity.mesh.metadata = { ...(entity.mesh.metadata || {}), usesFullTexture: true };
      entity.mesh.material.diffuseTexture = tex;
      entity.mesh.material.diffuseTexture.uScale = 1;
      entity.mesh.material.diffuseTexture.vScale = 1;
      entity.mesh.material.diffuseTexture.uOffset = 0;
      entity.mesh.material.diffuseTexture.vOffset = 0;
      if (setSpriteCell) {
        setSpriteCell(entity.mesh, 0, 0);
      }
    }
  };

  const resolveUniformColumns = (count) => {
    if (count <= 1) return 1;
    if (FORMATION_COLUMNS_BY_SIZE[count]) return FORMATION_COLUMNS_BY_SIZE[count];
    if (count <= 10) return 5;
    if (count <= 100) return 10;
    return 25;
  };

  const getFormationSpacing = (unitDef, soldierCount) => {
    const spec = getUnitBillboardSpec(unitDef.id);
    const count = Math.max(1, Number(soldierCount) || 10);
    // Keep rows & columns clearly separated even for larger counts while staying compact
    const scaleFactor = count >= 250 ? 1.12 : count >= 50 ? 1.18 : 1.25;
    return Number(Math.max(spec.width * scaleFactor, 0.98).toFixed(3));
  };

  // Each soldier is spawned as an independent world entity with its own position, HP, and combat state
  const createSoldierEntity = (unitObj, unitDef, team, idx, worldX, worldZ, slotOffsetX, slotOffsetZ) => {
    const perSoldierHp = unitDef.hp ?? 50;
    const perSoldierDmg = unitDef.dmg ?? 8;
    const perSoldierArmor = unitDef.armor ?? 4;
    const perSoldierMorale = unitDef.morale ?? 70;
    const spec = getUnitBillboardSpec(unitDef.id);
    const aliveTex = billboardAtlas.getUnitBillboardTexture(unitDef.id, team, "alive");

    const node = new BABYLON.TransformNode(`soldier_node_${unitObj.id}_${idx}`, scene);
    const wy = getGroundHeightAt(worldX, worldZ);
    node.position.set(worldX, wy, worldZ);

    const mesh = createSpritePlane(`unit_${unitDef.id}_s_${idx}`, idx % 8, team === 2 ? 1 : 2, spec.width, spec.height, aliveTex);
    mesh.parent = node;
    mesh.isPickable = true;
    mesh.position.set(0, spec.yOffset, 0);
    mesh.computeWorldMatrix(true);

    const facingArrow = createSoldierFacingArrow(node, team, spec);

    const entity = {
      id: `${unitDef.id}_sol_${idx}`,
      index: idx,
      unit: unitObj,
      team,
      def: unitDef,
      hp: perSoldierHp,
      maxHp: perSoldierHp,
      dmg: perSoldierDmg,
      armor: perSoldierArmor,
      morale: perSoldierMorale,
      maxMorale: 100,
      alive: true,
      fallen: false,
      uvSynced: false,
      animPhase: idx * 0.65,
      attackTimer: 0,
      cooldown: (idx % 5) * 0.14,
      pos: new BABYLON.Vector3(worldX, wy, worldZ),
      targetPos: null,
      offsetX: slotOffsetX,
      offsetZ: slotOffsetZ,
      yaw: team === 1 ? 0 : Math.PI,
      baseY: spec.yOffset,
      node,
      mesh,
      facingArrow
    };

    mesh.metadata = { ...(mesh.metadata || {}), unit: unitObj, entity, usesFullTexture: true };
    return entity;
  };

  // 1 unit = 1 soldier entity; deploying a formation spawns N independent soldier entities in uniform ranks & columns
  const createFormationEntities = (unitObj, centerPt, unitDef, team, soldierCount) => {
    const count = Math.max(1, Number(soldierCount) || 10);
    const spec = getUnitBillboardSpec(unitDef.id);

    const cols = resolveUniformColumns(count);
    const rows = Math.ceil(count / cols);
    const spacing = getFormationSpacing(unitDef, count);

    const entities = [];
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const lx = count === 1 ? 0 : (c - (cols - 1) / 2) * spacing;
      const lz = count === 1 ? 0 : (r - (rows - 1) / 2) * spacing;
      const entity = createSoldierEntity(
        unitObj,
        unitDef,
        team,
        i,
        centerPt.x + lx,
        centerPt.z + lz,
        lx,
        lz
      );
      entities.push(entity);
    }

    return {
      entities,
      cols,
      rows,
      spacing,
      barY: rows * spacing * 0.5 + spec.height + 0.24
    };
  };

  const spawnUnit = async (point, unitDef, team, activeOrder, soldierCount = 10) => {
    const count = Math.max(1, Number(soldierCount) || 10);
    const y = getGroundHeightAt(point.x, point.z);
    const root = new BABYLON.TransformNode(`unit_${unitDef.id}_${Date.now()}_${Math.random()}`, scene);
    root.position.set(point.x, y, point.z);

    const initialYaw = team === 1 ? 0 : Math.PI;
    const unitObj = {
      id: `${unitDef.id}_${Math.random().toString(36).slice(2, 7)}`,
      def: unitDef,
      team,
      soldierCount: count,
      hp: 0,
      maxHp: 0,
      dmg: 0,
      armor: unitDef.armor ?? 4,
      morale: unitDef.morale ?? 70,
      sightRange: unitDef.sightRange ?? Math.max(16, (unitDef.range ?? 3) * 1.35),
      pos: new BABYLON.Vector3(point.x, y, point.z),
      targetPos: null,
      yaw: initialYaw,
      cooldown: 0,
      animTime: 0,
      order: activeOrder === "halt" ? "halt" : activeOrder === "run" ? "run" : "walk",
      hold: activeOrder === "hold",
      fire: true,
      selected: false,
      deadTimer: null,
      root,
      hpBar: null,
      rangeOutline: null,
      entities: [],
      selRing: null
    };

    const formation = createFormationEntities(unitObj, point, unitDef, team, count);
    unitObj.entities = formation.entities;

    const barWidth = computeFormationHpBarWidth(count, unitDef, formation.cols, formation.spacing);
    const hpBar = createHpBar(root, team, barWidth);
    hpBar.barHolder.position.y = formation.barY;
    unitObj.hpBar = hpBar;

    unitObj.rangeOutline = createRangeOutline(root, unitDef, team);
    updateRangeOutline(unitObj, getTerrainInfoAt(point.x, point.z));

    const ringDiameter = Math.max(1.0, Math.hypot(formation.cols * formation.spacing, formation.rows * formation.spacing) * 0.62);
    const selRing = BABYLON.MeshBuilder.CreateTorus("selRing", { diameter: ringDiameter, thickness: 0.05, tessellation: 20 }, scene);
    selRing.parent = root;
    selRing.position.y = 0.05;
    selRing.isPickable = false;
    const selMat = new BABYLON.StandardMaterial("selMat", scene);
    selMat.emissiveColor = new BABYLON.Color3(1, 0.88, 0.25);
    selRing.material = selMat;
    selRing.setEnabled(false);
    unitObj.selRing = selRing;

    const totalMaxHp = formation.entities.reduce((sum, e) => sum + e.maxHp, 0);
    const totalDmg = formation.entities.reduce((sum, e) => sum + e.dmg, 0);
    unitObj.hp = totalMaxHp;
    unitObj.maxHp = totalMaxHp;
    unitObj.dmg = totalDmg;

    units.push(unitObj);
    soundManager.playSfx(soundManager.sfx.place);
  };

  const getSelectedAliveUnits = () => units.filter((u) => u.selected && u.hp > 0);

  const setUnitSelected = (unit, selected) => {
    if (!unit || unit.hp <= 0) return;
    unit.selected = Boolean(selected);
    unit.selRing?.setEnabled?.(unit.selected);
    syncUnitFacingArrows(unit);
    updateRangeOutline(unit, getTerrainInfoAt(unit.pos.x, unit.pos.z));
  };

  const clearSelection = () => {
    for (const u of units) {
      if (u.selected) {
        u.selected = false;
        u.selRing?.setEnabled?.(false);
        syncUnitFacingArrows(u);
        updateRangeOutline(u, getTerrainInfoAt(u.pos.x, u.pos.z));
      }
    }
  };

  const toggleUnitSelection = (unit) => {
    if (!unit || unit.hp <= 0) return;
    setUnitSelected(unit, !unit.selected);
  };

  const issueOrderToSelected = (order) => {
    const selected = getSelectedAliveUnits();
    for (const u of selected) {
      if (order === "halt") {
        u.order = "halt";
        u.targetPos = null;
        for (const ent of u.entities) {
          ent.targetPos = null;
        }
      } else if (order === "hold") {
        u.hold = !u.hold;
      } else if (order === "fire") {
        u.fire = !u.fire;
      } else if (order === "walk" || order === "run") {
        u.order = order;
        u.hold = false;
      }
    }
  };

  const assignRowColFormationTargets = (unitObj, destX, destZ, facingYaw) => {
    const aliveEnts = unitObj.entities.filter((e) => e.alive && e.hp > 0);
    if (!aliveEnts.length) return;

    const cols = resolveUniformColumns(aliveEnts.length);
    const rows = Math.ceil(aliveEnts.length / cols);
    const spacing = getFormationSpacing(unitObj.def, aliveEnts.length);
    const cosY = Math.cos(facingYaw);
    const sinY = Math.sin(facingYaw);

    aliveEnts.forEach((ent, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      const lx = aliveEnts.length === 1 ? 0 : (c - (cols - 1) / 2) * spacing;
      const lz = aliveEnts.length === 1 ? 0 : (r - (rows - 1) / 2) * spacing;
      ent.offsetX = lx;
      ent.offsetZ = lz;

      const rotX = lx * cosY + lz * sinY;
      const rotZ = -lx * sinY + lz * cosY;
      ent.targetPos = new BABYLON.Vector3(
        destX + rotX,
        getGroundHeightAt(destX + rotX, destZ + rotZ),
        destZ + rotZ
      );
      ent.yaw = facingYaw;
    });
  };

  const commandSelectedMoveTo = (centerPt, aimAngle = null) => {
    const selectedList = getSelectedAliveUnits();
    if (!selectedList.length) return;
    const cols = Math.ceil(Math.sqrt(selectedList.length));
    const spacing = aimAngle === null ? 3.2 : 3.5;
    const rowsCount = Math.ceil(selectedList.length / cols);

    selectedList.forEach((u, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const ox = (c - (cols - 1) / 2) * spacing;
      const oz = (r - (rowsCount - 1) / 2) * spacing;
      const destX = centerPt.x + ox;
      const destZ = centerPt.z + oz;
      const moveAngle = aimAngle !== null
        ? aimAngle
        : Math.atan2(destX - u.pos.x, destZ - u.pos.z);

      u.targetPos = new BABYLON.Vector3(destX, u.pos.y, destZ);
      u.hold = false;
      if (u.order === "halt") u.order = "walk";
      u.yaw = moveAngle;
      u.arrivedFormationReady = false;

      assignRowColFormationTargets(u, destX, destZ, moveAngle);
    });
  };

  // Smoothly assign row & column formation slots so soldiers walk/march into formation rather than teleporting
  const reformUnitFormation = (unitObj, anchorX, anchorZ, facingYaw, snapInPlace = false) => {
    const aliveEnts = unitObj.entities.filter((e) => e.alive && e.hp > 0);
    if (!aliveEnts.length) return;

    const cols = resolveUniformColumns(aliveEnts.length);
    const rows = Math.ceil(aliveEnts.length / cols);
    const spacing = getFormationSpacing(unitObj.def, aliveEnts.length);
    const cosY = Math.cos(facingYaw);
    const sinY = Math.sin(facingYaw);

    aliveEnts.forEach((ent, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      const lx = aliveEnts.length === 1 ? 0 : (c - (cols - 1) / 2) * spacing;
      const lz = aliveEnts.length === 1 ? 0 : (r - (rows - 1) / 2) * spacing;
      ent.offsetX = lx;
      ent.offsetZ = lz;

      const rotX = lx * cosY + lz * sinY;
      const rotZ = -lx * sinY + lz * cosY;
      const slotX = anchorX + rotX;
      const slotZ = anchorZ + rotZ;

      if (snapInPlace) {
        ent.pos.x = slotX;
        ent.pos.z = slotZ;
        ent.targetPos = null;
      } else {
        ent.targetPos = new BABYLON.Vector3(slotX, getGroundHeightAt(slotX, slotZ), slotZ);
      }
      ent.yaw = facingYaw;
    });
  };

  const getAliveCount = (team) => {
    let total = 0;
    for (const u of units) {
      if (u.team !== team || u.hp <= 0) continue;
      const aliveSoldiers = u.entities ? u.entities.filter((e) => e.alive).length : 0;
      total += aliveSoldiers > 0 ? aliveSoldiers : Math.max(1, Math.ceil((u.hp / u.maxHp) * (u.soldierCount || 1)));
    }
    return total;
  };

  const getMatchupMultiplier = (attacker, defender) => {
    const aRole = attacker.def.role;
    const dRole = defender.def.role;
    if (aRole === "antiCav" && dRole === "cavalry") return 1.45;
    if (aRole === "cavalry" && dRole === "ranged") return 1.35;
    if (aRole === "shock" && dRole === "line") return 1.25;
    return 1.0;
  };

  const disposeUnitEntry = (unitObj) => {
    for (const ent of unitObj.entities || []) {
      if (ent.mesh) ent.mesh.metadata = null;
      if (ent.node && !ent.node.isDisposed()) {
        ent.node.dispose();
      }
    }
    unitObj.rangeOutline?.ring?.dispose?.();
    unitObj.root.dispose();
  };

  const updateSoldierVisual = (unitObj, ent, rawDt, dt, isMoving, isAttacking) => {
    if (!ent.mesh || ent.mesh.isDisposed() || !ent.node || ent.node.isDisposed()) return;

    if (!ent.alive) {
      if (!ent.fallen) {
        ent.fallen = true;
        ent.facingArrow?.setEnabled?.(false);
        ent.mesh.isPickable = false;
        ent.mesh.metadata = { ...(ent.mesh.metadata || {}), unit: null, entity: null, usesFullTexture: true };
        ent.mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_NONE;
        ent.mesh.rotation.set(Math.PI / 2, 0, Math.random() * Math.PI);
        ent.mesh.position.set(0, 0.07, 0);
        applyEntityVisualState(ent, unitObj.def.id, unitObj.team, true);
      }
      return;
    }

    if (!ent.uvSynced && setSpriteCell) {
      ent.uvSynced = true;
      setSpriteCell(ent.mesh, 0, 0);
    }

    if (ent.attackTimer > 0) {
      ent.attackTimer = Math.max(0, ent.attackTimer - rawDt);
    }

    const isMounted = unitObj.def.id === "cavalry" || unitObj.def.id === "general";
    const bobAmp = isMoving ? (isMounted ? 0.085 : 0.065) : 0.015;
    const swayAmp = isMoving ? 0.075 : 0.02;
    const animRate = isMoving ? (unitObj.order === "run" ? 13.5 : 8.5) : 4.2;
    const phase = (ent.animClock ?? 0) + ent.animPhase;
    ent.animClock = (ent.animClock ?? 0) + dt * animRate;

    const attackRatio = ent.attackTimer > 0 ? Math.sin((ent.attackTimer / 0.28) * Math.PI) : 0;
    const bob = Math.abs(Math.sin(phase)) * bobAmp + attackRatio * 0.05;
    const lunge = attackRatio * 0.28;
    const tilt = ent.attackTimer > 0
      ? attackRatio * -0.26
      : Math.cos(phase) * swayAmp;

    ent.pos.y = getGroundHeightAt(ent.pos.x, ent.pos.z);
    ent.node.position.set(ent.pos.x, ent.pos.y, ent.pos.z);
    ent.node.rotation.y = ent.yaw;

    ent.mesh.position.set(0, ent.baseY + bob, lunge);
    ent.mesh.rotation.z = tilt;
    const scaleBoost = isAttacking && ent.attackTimer > 0 ? 1.15 : 1.0;
    ent.mesh.scaling.set(scaleBoost, scaleBoost, 1.0);
    ent.facingArrow?.setEnabled?.(Boolean(unitObj.selected));
  };

  // Locate nearest enemy in front line-of-sight, or react to a close-range enemy outside sight cone
  const findTargetForSoldier = (ent, allAliveSoldiers, idx, sightRange, effectiveRange) => {
    const u = ent.unit;
    const maxSightSq = sightRange * sightRange;
    const maxRangeSq = effectiveRange * effectiveRange;
    const proximitySq = PROXIMITY_REACTION_RADIUS * PROXIMITY_REACTION_RADIUS;

    let bestInSightEnemy = null;
    let bestInSightDistSq = Infinity;

    let bestCloseEnemy = null;
    let bestCloseDistSq = Infinity;

    for (let j = 0; j < allAliveSoldiers.length; j++) {
      if (idx === j) continue;
      const otherEnt = allAliveSoldiers[j];
      if (otherEnt.team === ent.team) continue;

      const ddx = otherEnt.pos.x - ent.pos.x;
      const ddz = otherEnt.pos.z - ent.pos.z;
      const dSq = ddx * ddx + ddz * ddz;

      const inFront = isInFrontSightCone(ent.pos.x, ent.pos.z, ent.yaw, otherEnt.pos.x, otherEnt.pos.z, FRONT_CONE_HALF_ANGLE);
      const clearLos = hasClearLineOfSight(u, ent.pos.x, ent.pos.z, otherEnt.pos.x, otherEnt.pos.z);

      if (inFront && clearLos && dSq <= maxSightSq && dSq < bestInSightDistSq) {
        bestInSightDistSq = dSq;
        bestInSightEnemy = otherEnt;
      }

      // React if an enemy approaches right near the soldier even outside its current front line of sight
      if (dSq <= proximitySq && dSq < bestCloseDistSq) {
        bestCloseDistSq = dSq;
        bestCloseEnemy = otherEnt;
      }
    }

    if (bestInSightEnemy) {
      const dist = Math.sqrt(bestInSightDistSq);
      const withinAttackRange = u.def.ranged ? bestInSightDistSq <= maxRangeSq : dist <= Math.max(effectiveRange, 2.2);
      return {
        enemy: bestInSightEnemy,
        dist,
        canAttackNow: withinAttackRange && clearLineOfSightCheck(u, ent, bestInSightEnemy),
        isProximityReaction: false
      };
    }

    if (bestCloseEnemy) {
      const dist = Math.sqrt(bestCloseDistSq);
      const canMeleeClose = !u.def.ranged && dist <= Math.max(effectiveRange, PROXIMITY_REACTION_RADIUS * 0.65);
      return {
        enemy: bestCloseEnemy,
        dist,
        canAttackNow: canMeleeClose,
        isProximityReaction: true
      };
    }

    return {
      enemy: null,
      dist: Infinity,
      canAttackNow: false,
      isProximityReaction: false
    };
  };

  const clearLineOfSightCheck = (unitObj, attackerEnt, defenderEnt) =>
    hasClearLineOfSight(
      unitObj,
      attackerEnt.pos.x,
      attackerEnt.pos.z,
      defenderEnt.pos.x,
      defenderEnt.pos.z
    );

  // Individual soldier-level combat & progression with forward-only front sight cones and row/column destination alignment
  const updateSimulation = (rawDt, dt) => {
    simFrameCounter++;
    for (let i = combatEffects.length - 1; i >= 0; i--) {
      const fx = combatEffects[i];
      fx.ttl -= rawDt;
      if (fx.ttl <= 0) {
        combatEffects.splice(i, 1)[0].mesh.dispose();
      } else if (fx.isFlash) {
        const s = 0.7 + (fx.ttl / 0.22) * 0.5;
        fx.mesh.scaling.setAll(s);
      }
    }

    for (let i = units.length - 1; i >= 0; i--) {
      const u = units[i];
      if (u.hp <= 0 && u.deadTimer !== null) {
        u.deadTimer -= rawDt;
        if (u.deadTimer <= 0) {
          disposeUnitEntry(u);
          units.splice(i, 1);
        }
      }
    }

    const aliveUnits = units.filter((u) => u.hp > 0);
    const allAliveSoldiers = [];
    let redCount = 0;
    let blueCount = 0;

    for (const u of aliveUnits) {
      u.inBattleThisTick = false;
      for (const ent of u.entities) {
        if (ent.alive && ent.hp > 0) {
          allAliveSoldiers.push(ent);
          if (u.team === 1) redCount++;
          else if (u.team === 2) blueCount++;
        }
      }
    }

    const soldierCount = allAliveSoldiers.length;
    const minSameTeamSep = 0.88;
    const minSameTeamSepSq = minSameTeamSep * minSameTeamSep;
    const minEnemyMeleeGap = 1.18;
    const minEnemyMeleeGapSq = minEnemyMeleeGap * minEnemyMeleeGap;

    // 1. Advance each alive soldier & resolve engagements
    for (let i = 0; i < soldierCount; i++) {
      const ent = allAliveSoldiers[i];
      const u = ent.unit;
      if (ent.cooldown > 0) ent.cooldown -= dt;

      const tInfo = getTerrainInfoAt(ent.pos.x, ent.pos.z);
      const sightRange = tInfo.type === "trees" ? u.sightRange * 0.7 : u.sightRange;
      const effectiveRange = tInfo.type === "hills" && u.def.ranged ? u.def.range * 1.15 : u.def.range;

      const targetInfo = findTargetForSoldier(ent, allAliveSoldiers, i, sightRange, effectiveRange);
      const nearestEnemyEnt = targetInfo.enemy;
      const nearestDist = targetInfo.dist;
      const canAttack = targetInfo.canAttackNow && (!u.def.ranged || u.fire);
      let didAttack = false;

      if (canAttack) {
        u.inBattleThisTick = true;
      }

      // Turn toward a close enemy reacting near the soldier so it can face and engage it
      if (nearestEnemyEnt && targetInfo.isProximityReaction) {
        ent.yaw = Math.atan2(nearestEnemyEnt.pos.x - ent.pos.x, nearestEnemyEnt.pos.z - ent.pos.z);
      }

      if (canAttack && ent.cooldown <= 0) {
        didAttack = true;
        ent.wasEngaged = true;
        ent.attackTimer = 0.28;
        ent.cooldown = u.def.cd * (0.95 + ((ent.index % 5) * 0.08));
        ent.yaw = Math.atan2(nearestEnemyEnt.pos.x - ent.pos.x, nearestEnemyEnt.pos.z - ent.pos.z);

        const targetTerrain = getTerrainInfoAt(nearestEnemyEnt.pos.x, nearestEnemyEnt.pos.z);
        const defMult = u.def.ranged ? targetTerrain.rangedDefMult : 1.0;
        const moraleMult = 0.75 + (ent.morale / 100) * 0.45;
        const rawHit = ent.dmg * tInfo.atkMult * getMatchupMultiplier(u, nearestEnemyEnt.unit) * defMult * moraleMult;
        const finalDmg = Math.max(1.0, rawHit - nearestEnemyEnt.armor * 0.35);

        nearestEnemyEnt.hp = Math.max(0, nearestEnemyEnt.hp - finalDmg);
        nearestEnemyEnt.morale = Math.max(5, nearestEnemyEnt.morale - finalDmg * 0.4);
        ent.morale = Math.min(ent.maxMorale, ent.morale + 0.5);

        if (u.def.id === "matchlock" || u.def.id === "cannon") {
          spawnCombatFlash(ent.pos, true, u.def.id === "cannon" ? 0.65 : 0.38);
        } else if (!u.def.ranged && (ent.index + simFrameCounter) % 2 === 0) {
          spawnAttackSlash(ent.pos, nearestEnemyEnt.pos, ent.team);
        }

        if ((ent.index + simFrameCounter) % 2 === 0) {
          spawnCombatFlash(nearestEnemyEnt.pos, false, u.def.id === "cannon" ? 0.75 : 0.32);
        }
        if ((ent.index + simFrameCounter) % 4 === 0) {
          soundManager.playUnitAttackSfx(u.def.id);
        }

        if (nearestEnemyEnt.hp <= 0) {
          nearestEnemyEnt.alive = false;
          nearestEnemyEnt.unit.morale = Math.max(5, nearestEnemyEnt.unit.morale - 3);
          syncFormationStats(nearestEnemyEnt.unit);
          updateHpBar(nearestEnemyEnt.unit);
          if (nearestEnemyEnt.unit.hp <= 0) {
            nearestEnemyEnt.unit.selected = false;
            nearestEnemyEnt.unit.deadTimer = DEAD_CLEANUP_DELAY;
            nearestEnemyEnt.unit.hpBar?.barHolder?.setEnabled?.(false);
            nearestEnemyEnt.unit.selRing?.setEnabled?.(false);
            syncUnitFacingArrows(nearestEnemyEnt.unit);
            if (nearestEnemyEnt.unit.rangeOutline?.ring) {
              nearestEnemyEnt.unit.rangeOutline.ring.setEnabled(false);
            }
            soundManager.playRandomCasualty();
          }
        } else {
          syncFormationStats(nearestEnemyEnt.unit);
          updateHpBar(nearestEnemyEnt.unit);
        }
      }

      // Mark unit for smooth formation reform whenever a previously engaged soldier has no enemy to fight
      if (!nearestEnemyEnt && ent.wasEngaged) {
        ent.wasEngaged = false;
        u.needsReform = true;
      }

      let moveDest = null;
      if (!u.hold && u.order !== "halt") {
        if (ent.targetPos) moveDest = ent.targetPos;
        else if (u.targetPos) moveDest = u.targetPos;
        else if (nearestEnemyEnt && nearestDist > Math.max(1.25, effectiveRange * 0.85)) {
          const ddx = nearestEnemyEnt.pos.x - ent.pos.x;
          const ddz = nearestEnemyEnt.pos.z - ent.pos.z;
          const dLen = Math.max(0.001, Math.hypot(ddx, ddz));
          const standOff = u.def.ranged ? effectiveRange * 0.82 : 1.15;
          moveDest = {
            x: nearestEnemyEnt.pos.x - (ddx / dLen) * standOff,
            z: nearestEnemyEnt.pos.z - (ddz / dLen) * standOff
          };
        }
      }

      let isMoving = false;
      if (moveDest) {
        const dx = moveDest.x - ent.pos.x;
        const dz = moveDest.z - ent.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.14) {
          isMoving = true;
          const moraleSpeedMult = ent.morale < 25 ? 0.75 : 1.0;
          const runMult = u.order === "run" ? 1.65 : 1.0;
          const step = Math.min(dist, u.def.speed * runMult * tInfo.speedMult * moraleSpeedMult * dt);
          ent.pos.x += (dx / dist) * step;
          ent.pos.z += (dz / dist) * step;
          if (!ent.targetPos) {
            ent.yaw = Math.atan2(dx, dz);
          }
        } else if (ent.targetPos) {
          ent.pos.x = ent.targetPos.x;
          ent.pos.z = ent.targetPos.z;
          ent.targetPos = null;
          ent.yaw = u.yaw;
        }
      }

      // Apply soldier separation only while fighting or approaching a slot, stopping once in formation so units never circle
      const sepStride = soldierCount > 350 ? 2 : 1;
      const isApproachingSlot = Boolean(ent.targetPos) && !u.arrivedFormationReady;
      const shouldSeparate = u.inBattleThisTick || isApproachingSlot;
      if (shouldSeparate && (i + simFrameCounter) % sepStride === 0) {
        for (let j = i + 1; j < soldierCount; j++) {
          const otherEnt = allAliveSoldiers[j];
          const sdx = ent.pos.x - otherEnt.pos.x;
          const sdz = ent.pos.z - otherEnt.pos.z;
          const sdistSq = sdx * sdx + sdz * sdz;
          const sameTeam = otherEnt.team === ent.team;
          const desiredGap = sameTeam ? minSameTeamSep : minEnemyMeleeGap;
          const desiredGapSq = sameTeam ? minSameTeamSepSq : minEnemyMeleeGapSq;
          if (sdistSq > 0.000001 && sdistSq < desiredGapSq) {
            const sdist = Math.sqrt(sdistSq);
            const push = (desiredGap - sdist) * (sameTeam ? 1.35 : 1.25) * dt;
            const nx = (sdx / sdist) * push;
            const nz = (sdz / sdist) * push;
            ent.pos.x += nx;
            ent.pos.z += nz;
            otherEnt.pos.x -= nx;
            otherEnt.pos.z -= nz;
          }
        }
      }

      updateSoldierVisual(u, ent, rawDt, dt, isMoving, didAttack);
    }

    // 2. Keep formation anchors, health bars & ranged outlines centered/updated on surviving soldiers
    for (const u of aliveUnits) {
      const aliveEnts = u.entities.filter((e) => e.alive && e.hp > 0);
      if (!aliveEnts.length) continue;

      let sumX = 0;
      let sumZ = 0;
      for (const e of aliveEnts) {
        sumX += e.pos.x;
        sumZ += e.pos.z;
      }
      const cx = sumX / aliveEnts.length;
      const cz = sumZ / aliveEnts.length;

      // Sync formation yaw to average facing of surviving soldiers so front-sight cone matches facing
      let sinSum = 0;
      let cosSum = 0;
      for (const e of aliveEnts) {
        sinSum += Math.sin(e.yaw);
        cosSum += Math.cos(e.yaw);
      }
      if (Math.hypot(sinSum, cosSum) > 0.001 && !u.arrivedFormationReady) {
        u.yaw = Math.atan2(sinSum, cosSum);
      }

      u.pos.set(cx, getGroundHeightAt(cx, cz), cz);
      u.root.position.copyFrom(u.pos);
      u.root.rotation.y = u.yaw;

      const anySoldierStillMovingToSlot = aliveEnts.some((e) => Boolean(e.targetPos));
      if (u.targetPos && !anySoldierStillMovingToSlot) {
        const anchorX = u.targetPos.x;
        const anchorZ = u.targetPos.z;
        u.targetPos = null;
        if (!u.arrivedFormationReady) {
          u.arrivedFormationReady = true;
          reformUnitFormation(u, anchorX, anchorZ, u.yaw, false);
          u.pos.set(anchorX, getGroundHeightAt(anchorX, anchorZ), anchorZ);
          u.root.position.copyFrom(u.pos);
        }
      } else if (!u.inBattleThisTick && !anySoldierStillMovingToSlot && u.needsReform) {
        u.needsReform = false;
        reformUnitFormation(u, cx, cz, u.yaw, false);
      }

      updateHpBar(u);
      updateRangeOutline(u, getTerrainInfoAt(cx, cz));

      // Update any newly fallen entities in this formation
      for (const e of u.entities) {
        if (!e.alive && !e.fallen) {
          updateSoldierVisual(u, e, rawDt, dt, false, false);
        }
      }
    }

    return { redCount, blueCount };
  };

  const clearAllUnits = () => {
    while (units.length) disposeUnitEntry(units.pop());
  };

  return {
    units,
    spawnUnit,
    getSelectedAliveUnits,
    setUnitSelected,
    clearSelection,
    toggleUnitSelection,
    issueOrderToSelected,
    commandSelectedMoveTo,
    getAliveCount,
    updateSimulation,
    clearAllUnits
  };
}
