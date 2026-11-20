import * as BABYLON from "@babylonjs/core";
import { createUnitBillboardAtlas, getUnitBillboardSpec } from "./unitBillboards.js";

const DEAD_CLEANUP_DELAY = 1.6;

export function createUnitSystem({
  scene,
  createSpritePlane,
  setSpriteCell,
  getGroundHeightAt,
  getTerrainInfoAt,
  soundManager
}) {
  const units = [];
  const combatEffects = [];
  const billboardAtlas = createUnitBillboardAtlas(scene);

  const spawnCombatFlash = (pos, isSmoke = false, radius = 0.45) => {
    if (isSmoke) {
      const puff = createSpritePlane("smoke", Math.floor(Math.random() * 8), 7, radius * 1.25, radius * 1.25);
      puff.position.set(pos.x, getGroundHeightAt(pos.x, pos.z) + 0.3, pos.z);
      combatEffects.push({ mesh: puff, ttl: 0.4, startScale: 1, isFlash: false });
      return;
    }
    const disc = BABYLON.MeshBuilder.CreateDisc("fx", { radius, tessellation: 14 }, scene);
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
    const y = getGroundHeightAt(midX, midZ) + 0.32;
    const slash = BABYLON.MeshBuilder.CreatePlane("slashArc", { width: 0.6, height: 0.2 }, scene);
    slash.position.set(midX, y, midZ);
    slash.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    slash.isPickable = false;
    const mat = new BABYLON.StandardMaterial(`slashMat_${Date.now()}_${Math.random()}`, scene);
    mat.emissiveColor = team === 1 ? new BABYLON.Color3(1, 0.85, 0.45) : new BABYLON.Color3(0.65, 0.9, 1);
    mat.alpha = 0.85;
    mat.backFaceCulling = false;
    slash.material = mat;
    slash.onDisposeObservable.add(() => mat.dispose());
    combatEffects.push({ mesh: slash, ttl: 0.16, startScale: 1, isFlash: true });
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

    const fillWidth = width - 0.03;
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
    unitObj.hp = aliveEntities.reduce((sum, e) => sum + e.hp, 0);
    unitObj.morale = aliveEntities.reduce((sum, e) => sum + e.morale, 0) / aliveEntities.length;
    unitObj.dmg = aliveEntities.reduce((sum, e) => sum + e.dmg, 0);
    unitObj.armor = aliveEntities.reduce((sum, e) => sum + e.armor, 0) / aliveEntities.length;
  };

  const updateHpBar = (unitObj) => {
    if (!unitObj.hpBar) return;
    const ratio = Math.max(0, Math.min(1, unitObj.hp / unitObj.maxHp));
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

  // 1 unit = 1 soldier entity; deploying a formation spawns N soldier entities (10 / 50 / 100 / 250 / 500)
  const createFormationEntities = (root, unitDef, team, soldierCount) => {
    const count = Math.max(1, Number(soldierCount) || 10);
    const perSoldierHp = unitDef.hp ?? 50;
    const perSoldierDmg = unitDef.dmg ?? 8;
    const perSoldierArmor = unitDef.armor ?? 4;
    const perSoldierMorale = unitDef.morale ?? 70;

    const spec = getUnitBillboardSpec(unitDef.id, count);
    const aliveTex = billboardAtlas.getUnitBillboardTexture(unitDef.id, team, "alive");

    const cols = count === 1 ? 1 : Math.min(count, Math.max(4, Math.ceil(Math.sqrt(count * 1.6))));
    const rows = Math.ceil(count / cols);
    const spacing = Number(Math.max(spec.width * 0.68, count > 100 ? 0.36 : count > 25 ? 0.42 : 0.52).toFixed(3));
    const baseY = spec.yOffset;

    const entities = [];
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const lx = count === 1 ? 0 : (c - (cols - 1) / 2) * spacing;
      const lz = count === 1 ? 0 : (r - (rows - 1) / 2) * spacing;

      const mesh = createSpritePlane(`unit_${unitDef.id}_s_${i}`, i % 8, team === 2 ? 1 : 2, spec.width, spec.height, aliveTex);
      mesh.parent = root;
      mesh.isPickable = true;
      mesh.position.set(lx, baseY, lz);

      const entity = {
        id: `${unitDef.id}_sol_${i}`,
        index: i,
        hp: perSoldierHp,
        maxHp: perSoldierHp,
        dmg: perSoldierDmg,
        armor: perSoldierArmor,
        morale: perSoldierMorale,
        maxMorale: 100,
        alive: true,
        fallen: false,
        animPhase: i * 0.65,
        attackTimer: 0,
        baseLocalX: lx,
        baseLocalZ: lz,
        baseY,
        mesh
      };

      entities.push(entity);
    }

    return {
      entities,
      cols,
      rows,
      spacing,
      barY: rows * spacing * 0.5 + spec.height + 0.18
    };
  };

  const spawnUnit = async (point, unitDef, team, activeOrder, soldierCount = 10) => {
    const count = Math.max(1, Number(soldierCount) || 10);
    const y = getGroundHeightAt(point.x, point.z);
    const root = new BABYLON.TransformNode(`unit_${unitDef.id}_${Date.now()}_${Math.random()}`, scene);
    root.position.set(point.x, y, point.z);

    const formation = createFormationEntities(root, unitDef, team, count);
    const barWidth = Math.min(2.0, Math.max(0.6, formation.cols * formation.spacing * 0.75));
    const hpBar = createHpBar(root, team, barWidth);
    hpBar.barHolder.position.y = formation.barY;

    const ringDiameter = Math.max(1.0, Math.hypot(formation.cols * formation.spacing, formation.rows * formation.spacing) * 0.62);
    const selRing = BABYLON.MeshBuilder.CreateTorus("selRing", { diameter: ringDiameter, thickness: 0.05, tessellation: 28 }, scene);
    selRing.parent = root;
    selRing.position.y = 0.05;
    selRing.isPickable = false;
    const selMat = new BABYLON.StandardMaterial("selMat", scene);
    selMat.emissiveColor = new BABYLON.Color3(1, 0.88, 0.25);
    selRing.material = selMat;
    selRing.setEnabled(false);

    const totalMaxHp = formation.entities.reduce((sum, e) => sum + e.maxHp, 0);
    const totalDmg = formation.entities.reduce((sum, e) => sum + e.dmg, 0);

    const unitObj = {
      id: `${unitDef.id}_${Math.random().toString(36).slice(2, 7)}`,
      def: unitDef,
      team,
      soldierCount: count,
      hp: totalMaxHp,
      maxHp: totalMaxHp,
      dmg: totalDmg,
      armor: unitDef.armor ?? 4,
      morale: unitDef.morale ?? 70,
      sightRange: unitDef.sightRange ?? Math.max(16, (unitDef.range ?? 3) * 1.35),
      pos: new BABYLON.Vector3(point.x, y, point.z),
      targetPos: null,
      yaw: team === 1 ? 0 : Math.PI,
      cooldown: 0,
      animTime: 0,
      order: activeOrder === "halt" ? "halt" : activeOrder === "run" ? "run" : "walk",
      hold: activeOrder === "hold",
      fire: true,
      selected: false,
      deadTimer: null,
      root,
      hpBar,
      entities: formation.entities,
      selRing
    };

    for (const ent of formation.entities) {
      if (ent.mesh) {
        ent.mesh.metadata = { ...(ent.mesh.metadata || {}), unit: unitObj, entity: ent, usesFullTexture: true };
      }
    }

    units.push(unitObj);
    soundManager.playSfx(soundManager.sfx.place);
  };

  const getSelectedAliveUnits = () => units.filter((u) => u.selected && u.hp > 0);

  const toggleUnitSelection = (unit) => {
    if (unit.hp <= 0) return;
    unit.selected = !unit.selected;
    unit.selRing.setEnabled(unit.selected);
  };

  const applyOrderToSelected = (orderType) => {
    for (const u of getSelectedAliveUnits()) {
      if (orderType === "halt") { u.order = "halt"; u.hold = true; u.targetPos = null; }
      else if (orderType === "walk") { u.order = "walk"; u.hold = false; }
      else if (orderType === "run") { u.order = "run"; u.hold = false; }
      else if (orderType === "hold") { u.hold = !u.hold; if (u.hold) u.targetPos = null; }
      else if (orderType === "fire") { u.fire = !u.fire; }
    }
  };

  const issueMoveOrderToSelected = (destPoint, activeOrder, aimAngle = null) => {
    const selectedList = getSelectedAliveUnits();
    if (!selectedList.length) return;
    const cols = Math.ceil(Math.sqrt(selectedList.length));
    const spacing = aimAngle === null ? 2.6 : 2.9;
    const rowsCount = Math.ceil(selectedList.length / cols);

    selectedList.forEach((u, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const ox = (col - (cols - 1) / 2) * spacing;
      const oz = (row - (rowsCount - 1) / 2) * spacing;
      u.targetPos = new BABYLON.Vector3(destPoint.x + ox, 0, destPoint.z + oz);
      if (aimAngle !== null) u.yaw = aimAngle;
      u.hold = false;
      if (u.order === "halt") u.order = activeOrder === "run" ? "run" : "walk";
    });
  };

  const getMatchupMultiplier = (attacker, defender) => {
    if (attacker.def.role === "antiCav" && defender.def.role === "cavalry") return 1.45;
    if (attacker.def.role === "cavalry" && defender.def.role === "ranged") return 1.35;
    if (attacker.def.role === "shock" && defender.def.role === "line") return 1.2;
    return 1.0;
  };

  const disposeUnitEntry = (unitObj) => {
    for (const ent of unitObj.entities || []) {
      if (ent.mesh) ent.mesh.metadata = null;
    }
    unitObj.root.dispose();
  };

  const animateEntities = (unitObj, rawDt, dt, isMoving, isAttacking) => {
    unitObj.animTime += dt * (unitObj.order === "run" ? 11.5 : 7.2);
    const isMounted = unitObj.def.id === "cavalry" || unitObj.def.id === "general";
    const bobAmp = isMoving ? (isMounted ? 0.06 : 0.045) : 0.012;
    const swayAmp = isMoving ? 0.05 : 0.015;

    for (const ent of unitObj.entities) {
      if (!ent.mesh || ent.mesh.isDisposed()) continue;
      if (!ent.alive) {
        if (!ent.fallen) {
          ent.fallen = true;
          ent.mesh.isPickable = false;
          ent.mesh.metadata = { ...(ent.mesh.metadata || {}), unit: null, entity: null, usesFullTexture: true };
          ent.mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_NONE;
          ent.mesh.rotation.set(Math.PI / 2, 0, Math.random() * Math.PI);
          ent.mesh.position.set(ent.baseLocalX, 0.07, ent.baseLocalZ);
          applyEntityVisualState(ent, unitObj.def.id, unitObj.team, true);
        }
        continue;
      }

      if (ent.attackTimer > 0) {
        ent.attackTimer = Math.max(0, ent.attackTimer - rawDt);
      }

      const phase = unitObj.animTime + ent.animPhase;
      const bob = Math.abs(Math.sin(phase)) * bobAmp;
      const lunge = ent.attackTimer > 0 ? Math.sin((ent.attackTimer / 0.22) * Math.PI) * 0.16 : 0;
      const tilt = ent.attackTimer > 0
        ? Math.sin((ent.attackTimer / 0.22) * Math.PI) * -0.18
        : Math.cos(phase) * swayAmp;

      ent.mesh.position.set(
        ent.baseLocalX,
        ent.baseY + bob,
        ent.baseLocalZ + lunge
      );
      ent.mesh.rotation.z = tilt;
      ent.mesh.scaling.x = isAttacking && ent.attackTimer > 0 ? 1.12 : 1.0;
      ent.mesh.scaling.y = isAttacking && ent.attackTimer > 0 ? 1.12 : 1.0;
    }
  };

  const applyDamageToFormationEntities = (attackerUnit, defenderUnit, terrainMult, matchupMult, defMult) => {
    const aliveAttackers = attackerUnit.entities.filter((e) => e.alive);
    const aliveDefenders = defenderUnit.entities.filter((e) => e.alive);
    if (!aliveAttackers.length || !aliveDefenders.length) return;

    const moraleMult = 0.75 + (attackerUnit.morale / 100) * 0.45;
    const volleyCount = Math.min(aliveAttackers.length, attackerUnit.def.ranged ? 12 : 8);

    for (let v = 0; v < volleyCount; v++) {
      const atkEnt = aliveAttackers[(v + Math.floor(Math.random() * aliveAttackers.length)) % aliveAttackers.length];
      const defEnt = aliveDefenders[Math.floor(Math.random() * aliveDefenders.length)];
      if (!atkEnt?.alive || !defEnt?.alive) continue;

      const rawHit = atkEnt.dmg * terrainMult * matchupMult * defMult * moraleMult;
      const armorMitigation = defEnt.armor * 0.35;
      const finalDmg = Math.max(1.0, rawHit - armorMitigation);

      defEnt.hp = Math.max(0, defEnt.hp - finalDmg);
      defEnt.morale = Math.max(5, defEnt.morale - finalDmg * 0.35);
      atkEnt.morale = Math.min(atkEnt.maxMorale, atkEnt.morale + 0.5);

      if (defEnt.hp <= 0) {
        defEnt.alive = false;
        defenderUnit.morale = Math.max(5, defenderUnit.morale - 4);
      }
    }

    syncFormationStats(defenderUnit);
    updateHpBar(defenderUnit);
  };

  const updateSimulation = (rawDt, dt) => {
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

    const alive = units.filter((u) => u.hp > 0);
    let redCount = 0;
    let blueCount = 0;
    for (const u of alive) {
      if (u.team === 1) redCount++;
      else if (u.team === 2) blueCount++;
    }

    for (const u of alive) {
      if (u.cooldown > 0) u.cooldown -= dt;
      const tInfo = getTerrainInfoAt(u.pos.x, u.pos.z);
      const sightRange = tInfo.type === "trees" ? u.sightRange * 0.7 : u.sightRange;

      let nearestVisibleEnemy = null;
      let nearestVisibleDist = Infinity;
      for (const other of alive) {
        if (other.team === u.team) continue;
        const d = BABYLON.Vector3.Distance(u.pos, other.pos);
        if (d <= sightRange && d < nearestVisibleDist) {
          nearestVisibleDist = d;
          nearestVisibleEnemy = other;
        }
      }

      const effectiveRange = tInfo.type === "hills" && u.def.ranged ? u.def.range * 1.15 : u.def.range;
      const canAttack = nearestVisibleEnemy && nearestVisibleDist <= effectiveRange && (!u.def.ranged || u.fire);
      let didAttackThisTick = false;

      if (canAttack && u.cooldown <= 0) {
        didAttackThisTick = true;
        const targetTerrain = getTerrainInfoAt(nearestVisibleEnemy.pos.x, nearestVisibleEnemy.pos.z);
        const defMult = u.def.ranged ? targetTerrain.rangedDefMult : 1.0;

        applyDamageToFormationEntities(
          u,
          nearestVisibleEnemy,
          tInfo.atkMult,
          getMatchupMultiplier(u, nearestVisibleEnemy),
          defMult
        );

        u.cooldown = u.def.cd;
        u.yaw = Math.atan2(nearestVisibleEnemy.pos.x - u.pos.x, nearestVisibleEnemy.pos.z - u.pos.z);

        for (const atkEnt of u.entities) {
          if (atkEnt.alive && Math.random() < 0.45) {
            atkEnt.attackTimer = 0.22;
          }
        }

        if (u.def.id === "matchlock" || u.def.id === "cannon") {
          spawnCombatFlash(u.pos, true, u.def.id === "cannon" ? 0.8 : 0.5);
        } else if (!u.def.ranged) {
          spawnAttackSlash(u.pos, nearestVisibleEnemy.pos, u.team);
        }
        spawnCombatFlash(nearestVisibleEnemy.pos, false, u.def.id === "cannon" ? 0.85 : 0.4);
        soundManager.playUnitAttackSfx(u.def.id);

        if (nearestVisibleEnemy.hp <= 0) {
          nearestVisibleEnemy.selected = false;
          nearestVisibleEnemy.deadTimer = DEAD_CLEANUP_DELAY;
          nearestVisibleEnemy.hpBar?.barHolder?.setEnabled?.(false);
          soundManager.playRandomCasualty();
          nearestVisibleEnemy.selRing.setEnabled(false);
        }
      }

      let moveDest = null;
      if (!u.hold && u.order !== "halt") {
        if (u.targetPos) moveDest = u.targetPos;
        else if (nearestVisibleEnemy && nearestVisibleDist > effectiveRange * 0.85) moveDest = nearestVisibleEnemy.pos;
      }

      let isMoving = false;
      if (moveDest) {
        const dx = moveDest.x - u.pos.x;
        const dz = moveDest.z - u.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.7) {
          isMoving = true;
          const moraleSpeedMult = u.morale < 25 ? 0.75 : 1.0;
          const runMult = u.order === "run" ? 1.65 : 1.0;
          const step = Math.min(dist, u.def.speed * runMult * tInfo.speedMult * moraleSpeedMult * dt);
          u.pos.x += (dx / dist) * step;
          u.pos.z += (dz / dist) * step;
          u.yaw = Math.atan2(dx, dz);
        } else if (u.targetPos) {
          u.targetPos = null;
        }
      }

      for (const other of alive) {
        if (other === u) continue;
        const sdx = u.pos.x - other.pos.x;
        const sdz = u.pos.z - other.pos.z;
        const sdist = Math.hypot(sdx, sdz);
        if (sdist > 0.001 && sdist < 1.2) {
          const push = (1.2 - sdist) * 1.4 * dt;
          u.pos.x += (sdx / sdist) * push;
          u.pos.z += (sdz / sdist) * push;
        }
      }

      animateEntities(u, rawDt, dt, isMoving, didAttackThisTick);

      if (setSpriteCell) {
        for (const ent of u.entities) {
          if (ent.alive) {
            setSpriteCell(ent.mesh, 0, 0);
          }
        }
      }

      u.pos.y = getGroundHeightAt(u.pos.x, u.pos.z);
      u.root.position.copyFrom(u.pos);
      u.root.rotation.y = u.yaw;
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
    toggleUnitSelection,
    applyOrderToSelected,
    issueMoveOrderToSelected,
    updateSimulation,
    clearAllUnits
  };
}
