import * as BABYLON from "@babylonjs/core";

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
  const markerTextureCache = new Map();
  const iconImageCache = new Map();

  const loadIcon = (src) =>
    new Promise((resolve) => {
      if (iconImageCache.has(src)) return resolve(iconImageCache.get(src));
      const im = new Image();
      im.onload = () => {
        iconImageCache.set(src, im);
        resolve(im);
      };
      im.onerror = () => resolve(null);
      im.src = src;
    });

  const getMarkerTexture = async (unitDef, team) => {
    const key = `${unitDef.id}_${team}`;
    if (markerTextureCache.has(key)) return markerTextureCache.get(key);
    const iconImg = await loadIcon(unitDef.icon);
    const dt = new BABYLON.DynamicTexture(`marker_${key}`, { width: 128, height: 128 }, scene, true);
    dt.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    dt.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
    const ctx = dt.getContext();
    ctx.clearRect(0, 0, 128, 128);

    ctx.beginPath();
    ctx.arc(64, 72, 42, 0, Math.PI * 2);
    ctx.fillStyle = team === 1 ? "rgba(185, 28, 28, 0.96)" : "rgba(29, 78, 216, 0.96)";
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = team === 1 ? "#fecaca" : "#bfdbfe";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(64, 8);
    ctx.lineTo(80, 32);
    ctx.lineTo(48, 32);
    ctx.closePath();
    ctx.fillStyle = "#f9fafb";
    ctx.fill();

    if (iconImg) ctx.drawImage(iconImg, 36, 44, 56, 56);
    dt.update();
    markerTextureCache.set(key, dt);
    return dt;
  };

  const spawnCombatFlash = (pos, isSmoke = false, radius = 0.85) => {
    if (isSmoke) {
      const puff = createSpritePlane("smoke", Math.floor(Math.random() * 8), 7, radius * 1.4, radius * 1.4);
      puff.position.set(pos.x, getGroundHeightAt(pos.x, pos.z) + 0.55, pos.z);
      combatEffects.push({ mesh: puff, ttl: 0.45 });
      return;
    }
    const disc = BABYLON.MeshBuilder.CreateDisc("fx", { radius, tessellation: 12 }, scene);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(pos.x, getGroundHeightAt(pos.x, pos.z) + 0.35, pos.z);
    disc.isPickable = false;
    const mat = new BABYLON.StandardMaterial("fxMat", scene);
    mat.emissiveColor = new BABYLON.Color3(1, 0.45, 0.15);
    mat.alpha = 0.72;
    disc.material = mat;
    combatEffects.push({ mesh: disc, ttl: 0.22 });
  };

  const createHpBar = (root, team) => {
    const barHolder = new BABYLON.TransformNode(`hpHolder_${Date.now()}_${Math.random()}`, scene);
    barHolder.parent = root;
    barHolder.position.set(0, 1.62, 0);
    barHolder.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

    const width = 1.05;
    const height = 0.11;

    const bgMesh = BABYLON.MeshBuilder.CreatePlane("hpBg", { width, height }, scene);
    bgMesh.parent = barHolder;
    bgMesh.isPickable = false;
    const bgMat = new BABYLON.StandardMaterial(`hpBgMat_${Date.now()}_${Math.random()}`, scene);
    bgMat.diffuseColor = new BABYLON.Color3(0.08, 0.08, 0.1);
    bgMat.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    bgMat.backFaceCulling = false;
    bgMesh.material = bgMat;

    const fillMesh = BABYLON.MeshBuilder.CreatePlane("hpFill", { width: width - 0.04, height: height - 0.03 }, scene);
    fillMesh.parent = barHolder;
    fillMesh.position.z = -0.01;
    fillMesh.isPickable = false;
    const fillMat = new BABYLON.StandardMaterial(`hpFillMat_${Date.now()}_${Math.random()}`, scene);
    fillMat.diffuseColor = team === 1 ? new BABYLON.Color3(0.92, 0.24, 0.24) : new BABYLON.Color3(0.24, 0.56, 0.96);
    fillMat.emissiveColor = team === 1 ? new BABYLON.Color3(0.35, 0.08, 0.08) : new BABYLON.Color3(0.08, 0.2, 0.35);
    fillMat.backFaceCulling = false;
    fillMesh.material = fillMat;

    return { barHolder, fillMesh, fillMat };
  };

  const updateHpBar = (unitObj) => {
    if (!unitObj.hpBar) return;
    const ratio = Math.max(0, Math.min(1, unitObj.hp / unitObj.maxHp));
    unitObj.hpBar.fillMesh.scaling.x = Math.max(0.001, ratio);
    unitObj.hpBar.fillMesh.position.x = -(1 - ratio) * 0.505;
    if (ratio <= 0.3) {
      unitObj.hpBar.fillMat.diffuseColor.set(0.95, 0.2, 0.15);
    } else if (ratio <= 0.6) {
      unitObj.hpBar.fillMat.diffuseColor.set(0.95, 0.72, 0.18);
    }
  };

  const spawnUnit = async (point, unitDef, team, activeOrder) => {
    const y = getGroundHeightAt(point.x, point.z);
    const root = new BABYLON.TransformNode(`unit_${unitDef.id}_${Date.now()}_${Math.random()}`, scene);
    root.position.set(point.x, y, point.z);

    const plane = BABYLON.MeshBuilder.CreatePlane("marker", { size: 1.05 }, scene);
    plane.parent = root;
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
    plane.position.y = 1.05;

    const mat = new BABYLON.StandardMaterial(`mat_${unitDef.id}_${team}_${Date.now()}`, scene);
    mat.diffuseTexture = await getMarkerTexture(unitDef, team);
    mat.diffuseTexture.hasAlpha = true;
    mat.useAlphaFromDiffuseTexture = true;
    mat.backFaceCulling = false;
    mat.emissiveColor = new BABYLON.Color3(0.25, 0.25, 0.25);
    plane.material = mat;

    const hpBar = createHpBar(root, team);

    const isMounted = unitDef.id === "cavalry" || unitDef.id === "general";
    const isHeavyInfantry = unitDef.id === "samurai" || unitDef.id === "katana" || unitDef.id === "naginata";
    const aliveRow = team === 2 ? 1 : 2;
    const fallenRow = isMounted ? 4 : 3;

    const soldiers = [];
    const cols = Math.min(unitDef.squadSize, 8);
    for (let i = 0; i < unitDef.squadSize; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const lx = (c - (cols - 1) / 2) * 0.65;
      const lz = 0.85 + r * 0.65;

      const spriteCol = isMounted
        ? 5 + (i % 3)
        : isHeavyInfantry
          ? 1 + (i % 2)
          : 3 + (i % 2);

      const fallenCol = isMounted ? (i % 8) : (isHeavyInfantry ? 4 + (i % 4) : (i % 4));

      const spriteW = isMounted ? 1.45 : 1.25;
      const spriteH = isMounted ? 1.45 : 1.35;
      const sm = createSpritePlane(`s_${i}`, spriteCol, aliveRow, spriteW, spriteH);
      sm.parent = root;
      sm.position.set(lx, spriteH * 0.5 + 0.04, lz);
      sm.metadata = { aliveCol: spriteCol, aliveRow, fallenCol, fallenRow, fallen: false };
      soldiers.push(sm);
    }

    const selRing = BABYLON.MeshBuilder.CreateTorus("selRing", { diameter: 1.55, thickness: 0.08, tessellation: 24 }, scene);
    selRing.parent = root;
    selRing.position.y = 0.08;
    selRing.isPickable = false;
    const selMat = new BABYLON.StandardMaterial("selMat", scene);
    selMat.emissiveColor = new BABYLON.Color3(1, 0.88, 0.25);
    selRing.material = selMat;
    selRing.setEnabled(false);

    const unitObj = {
      id: `${unitDef.id}_${Math.random().toString(36).slice(2, 7)}`,
      def: unitDef,
      team,
      hp: unitDef.hp,
      maxHp: unitDef.hp,
      pos: new BABYLON.Vector3(point.x, y, point.z),
      targetPos: null,
      yaw: team === 1 ? 0 : Math.PI,
      cooldown: 0,
      order: activeOrder === "halt" ? "halt" : activeOrder === "run" ? "run" : "walk",
      hold: activeOrder === "hold",
      fire: true,
      selected: false,
      deadTimer: null,
      root,
      plane,
      hpBar,
      soldiers,
      selRing
    };

    plane.metadata = { unit: unitObj };
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
    const spacing = aimAngle === null ? 2.6 : 2.8;
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
    unitObj.plane.metadata = null;
    unitObj.root.dispose();
  };

  const updateSimulation = (rawDt, dt) => {
    for (let i = combatEffects.length - 1; i >= 0; i--) {
      combatEffects[i].ttl -= rawDt;
      if (combatEffects[i].ttl <= 0) {
        combatEffects[i].mesh.dispose();
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

      let nearestEnemy = null;
      let nearestDist = Infinity;
      for (const other of alive) {
        if (other.team === u.team) continue;
        const d = BABYLON.Vector3.Distance(u.pos, other.pos);
        if (d < nearestDist) {
          nearestDist = d;
          nearestEnemy = other;
        }
      }

      const effectiveRange = tInfo.type === "hills" && u.def.ranged ? u.def.range * 1.15 : u.def.range;
      const canAttack = nearestEnemy && nearestDist <= effectiveRange && (!u.def.ranged || u.fire);

      if (canAttack && u.cooldown <= 0) {
        const targetTerrain = getTerrainInfoAt(nearestEnemy.pos.x, nearestEnemy.pos.z);
        const defMult = u.def.ranged ? targetTerrain.rangedDefMult : 1.0;
        const dmg = u.def.dmg * tInfo.atkMult * getMatchupMultiplier(u, nearestEnemy) * defMult;
        nearestEnemy.hp = Math.max(0, nearestEnemy.hp - dmg);
        updateHpBar(nearestEnemy);
        u.cooldown = u.def.cd;
        u.yaw = Math.atan2(nearestEnemy.pos.x - u.pos.x, nearestEnemy.pos.z - u.pos.z);

        u.plane.scaling.setAll(1.14);
        setTimeout(() => u.plane && !u.plane.isDisposed() && u.plane.scaling.setAll(1), 90);

        if (u.def.id === "matchlock" || u.def.id === "cannon") {
          spawnCombatFlash(u.pos, true, u.def.id === "cannon" ? 1.4 : 0.9);
        }
        spawnCombatFlash(nearestEnemy.pos, false, u.def.id === "cannon" ? 1.5 : 0.65);
        soundManager.playUnitAttackSfx(u.def.id);

        if (nearestEnemy.hp <= 0) {
          nearestEnemy.selected = false;
          nearestEnemy.deadTimer = DEAD_CLEANUP_DELAY;
          nearestEnemy.plane.isPickable = false;
          nearestEnemy.plane.metadata = null;
          nearestEnemy.hpBar?.barHolder?.setEnabled?.(false);
          soundManager.playRandomCasualty();
          nearestEnemy.selRing.setEnabled(false);
          nearestEnemy.soldiers.forEach((s) => {
            s.billboardMode = BABYLON.Mesh.BILLBOARDMODE_NONE;
            s.rotation.set(Math.PI / 2, 0, Math.random() * Math.PI);
            s.position.y = 0.14;
          });
        }
      }

      let moveDest = null;
      if (!u.hold && u.order !== "halt") {
        if (u.targetPos) moveDest = u.targetPos;
        else if (nearestEnemy && nearestDist > effectiveRange * 0.85) moveDest = nearestEnemy.pos;
      }

      if (moveDest) {
        const dx = moveDest.x - u.pos.x;
        const dz = moveDest.z - u.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.7) {
          const runMult = u.order === "run" ? 1.65 : 1.0;
          const step = Math.min(dist, u.def.speed * runMult * tInfo.speedMult * dt);
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
        if (sdist > 0.001 && sdist < 1.45) {
          const push = (1.45 - sdist) * 1.4 * dt;
          u.pos.x += (sdx / sdist) * push;
          u.pos.z += (sdz / sdist) * push;
        }
      }

      const hpRatio = Math.max(0, u.hp / u.maxHp);
      const aliveCount = Math.ceil(hpRatio * u.soldiers.length);
      u.soldiers.forEach((s, idx) => {
        const isAliveSprite = idx < aliveCount;
        if (isAliveSprite && s.metadata?.fallen) {
          s.metadata.fallen = false;
          setSpriteCell(s, s.metadata.aliveCol, s.metadata.aliveRow);
        } else if (!isAliveSprite && !s.metadata?.fallen) {
          if (s.metadata) s.metadata.fallen = true;
          setSpriteCell(s, s.metadata.fallenCol, s.metadata.fallenRow);
        }
      });

      u.pos.y = getGroundHeightAt(u.pos.x, u.pos.z);
      u.root.position.copyFrom(u.pos);
      u.root.rotation.y = u.yaw;
      u.plane.rotation.z = 0;
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
