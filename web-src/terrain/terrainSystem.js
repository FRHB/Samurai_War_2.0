import * as BABYLON from "@babylonjs/core";
import { MAP_RADIUS } from "../config/gameData.js";

const EDITOR_STORAGE_KEY = "samuraiWars2_editorZones_v1";

export function createTerrainSystem({ scene, groundMat, createSpritePlane, onTerrainChanged }) {
  const terrainZones = [];
  const autoMapProps = [];
  let mapGrid = null;
  let activeMapPath = null;
  let terrainLoadToken = 0;

  const clearAutoProps = () => {
    while (autoMapProps.length) autoMapProps.pop().dispose();
  };

  const getGroundHeightAt = (x, z) => {
    let h = 0;
    if (mapGrid) {
      const { size, heightField } = mapGrid;
      const u = Math.max(0, Math.min(0.999999, (x / (MAP_RADIUS * 0.92) + 1) * 0.5));
      const v = Math.max(0, Math.min(0.999999, (1 - z / (MAP_RADIUS * 0.92)) * 0.5));
      const px = Math.floor(u * size);
      const py = Math.floor(v * size);
      h += heightField[py * size + px] || 0;
    }
    for (const zone of terrainZones) {
      const d = Math.hypot(x - zone.x, z - zone.z);
      if (d < zone.radius) {
        const t = 1 - d / zone.radius;
        if (zone.kind === "hills") h += t * t * 1.45;
        else if (zone.kind === "water") h -= t * 0.35;
      }
    }
    return h;
  };

  const getTerrainInfoAt = (x, z) => {
    for (let i = terrainZones.length - 1; i >= 0; i--) {
      const zone = terrainZones[i];
      if (Math.hypot(x - zone.x, z - zone.z) <= zone.radius) {
        if (zone.kind === "water") {
          return { type: "water", label: "Water / River (-45% Speed)", speedMult: 0.55, rangedDefMult: 1.0, atkMult: 0.85 };
        }
        if (zone.kind === "fords") {
          return { type: "fords", label: "Shallow Ford (-15% Speed)", speedMult: 0.85, rangedDefMult: 1.0, atkMult: 0.95 };
        }
        if (zone.kind === "hills") {
          return { type: "hills", label: "High Ground (+15% Ranged Range)", speedMult: 0.88, rangedDefMult: 0.75, atkMult: 1.15 };
        }
        if (zone.kind === "trees") {
          return { type: "trees", label: "Forest Cover (-30% Sight, +Ranged Def)", speedMult: 0.78, rangedDefMult: 0.65, atkMult: 0.9 };
        }
      }
    }

    if (mapGrid) {
      const { size, terrainField } = mapGrid;
      const u = Math.max(0, Math.min(0.999999, (x / (MAP_RADIUS * 0.92) + 1) * 0.5));
      const v = Math.max(0, Math.min(0.999999, (1 - z / (MAP_RADIUS * 0.92)) * 0.5));
      const px = Math.floor(u * size);
      const py = Math.floor(v * size);
      const val = terrainField[py * size + px] || 0;
      if (val > 0.35) {
        return { type: "water", label: "River / Water (-45% Speed)", speedMult: 0.55, rangedDefMult: 1.0, atkMult: 0.85 };
      }
      if (val < -0.35) {
        return { type: "trees", label: "Forest (-22% Speed, +Ranged Def)", speedMult: 0.78, rangedDefMult: 0.7, atkMult: 0.92 };
      }
    }

    return { type: "plains", label: "Plains (Normal)", speedMult: 1.0, rangedDefMult: 1.0, atkMult: 1.0 };
  };

  const readAllSavedZones = () => {
    try {
      const raw = localStorage.getItem(EDITOR_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };

  const persistEditorZones = () => {
    if (!activeMapPath) return;
    try {
      const all = readAllSavedZones();
      const serializable = terrainZones.map((z) => ({
        kind: z.kind,
        x: z.x,
        z: z.z,
        radius: z.radius,
        color: z.color
          ? { r: z.color.r, g: z.color.g, b: z.color.b }
          : null
      }));
      if (serializable.length) {
        all[activeMapPath] = serializable;
      } else {
        delete all[activeMapPath];
      }
      localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(all));
    } catch {
      // Ignore storage quota or private-mode errors
    }
  };

  const buildFeatureMesh = (point, kind, radius, colorVal) => {
    const baseY = getGroundHeightAt(point.x, point.z);
    let mesh;
    if (kind === "hills") {
      mesh = BABYLON.MeshBuilder.CreateSphere(`hill_${Date.now()}_${Math.random()}`, { diameterX: radius * 2, diameterY: 2.1, diameterZ: radius * 2 }, scene);
      mesh.position = new BABYLON.Vector3(point.x, baseY + 0.35, point.z);
    } else if (kind === "trees") {
      mesh = createSpritePlane(`editorTree_${Date.now()}_${Math.random()}`, Math.floor(Math.random() * 8), 0, 1.5, 1.5);
      mesh.position = new BABYLON.Vector3(point.x, baseY + 0.72, point.z);
    } else {
      mesh = BABYLON.MeshBuilder.CreateDisc(`${kind}_${Date.now()}_${Math.random()}`, { radius, tessellation: 24 }, scene);
      mesh.rotation.x = Math.PI / 2;
      mesh.position = new BABYLON.Vector3(point.x, baseY + 0.05, point.z);
    }

    if (kind !== "trees") {
      const mat = new BABYLON.StandardMaterial(`mat_${kind}_${Date.now()}_${Math.random()}`, scene);
      const col = colorVal instanceof BABYLON.Color3
        ? colorVal
        : colorVal && typeof colorVal.r === "number"
          ? new BABYLON.Color3(colorVal.r, colorVal.g, colorVal.b)
          : new BABYLON.Color3(0.5, 0.5, 0.5);
      mat.diffuseColor = col;
      mat.alpha = kind === "water" || kind === "fords" ? 0.72 : 0.92;
      mesh.material = mat;
    }

    return mesh;
  };

  const clearTerrainZones = ({ persist = true } = {}) => {
    while (terrainZones.length) {
      const zone = terrainZones.pop();
      zone.mesh?.material?.dispose?.();
      zone.mesh?.dispose?.();
    }
    if (persist) persistEditorZones();
  };

  const restoreSavedZonesForMap = (mapPath) => {
    clearTerrainZones({ persist: false });
    const all = readAllSavedZones();
    const saved = Array.isArray(all[mapPath]) ? all[mapPath] : [];
    for (const item of saved) {
      if (!item || typeof item.x !== "number" || typeof item.z !== "number") continue;
      const radius = typeof item.radius === "number" ? item.radius : (item.kind === "hills" ? 4.2 : item.kind === "water" ? 3.8 : 2.8);
      const mesh = buildFeatureMesh({ x: item.x, z: item.z }, item.kind, radius, item.color);
      terrainZones.push({
        kind: item.kind,
        x: item.x,
        z: item.z,
        radius,
        color: item.color ? new BABYLON.Color3(item.color.r, item.color.g, item.color.b) : null,
        mesh
      });
    }
  };

  // Detailed Sengoku battlefield map canvas fallback when external PNG map assets aren't present on disk
  const drawProceduralMapCanvas = (mapPath, size) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Warm parchment/earth base gradient with subtle directional lighting
    const baseGrad = ctx.createLinearGradient(0, 0, size, size);
    baseGrad.addColorStop(0, "#d4ae84");
    baseGrad.addColorStop(0.55, "#c59b6d");
    baseGrad.addColorStop(1, "#b4885a");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, size, size);

    // Subtle dirt paths / military trails across the battlefield
    ctx.save();
    ctx.strokeStyle = "rgba(154, 118, 82, 0.45)";
    ctx.lineWidth = size * 0.022;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(size * 0.12, size * 0.78);
    ctx.quadraticCurveTo(size * 0.5, size * 0.52, size * 0.88, size * 0.22);
    ctx.stroke();
    ctx.restore();

    const key = String(mapPath || "").toLowerCase();
    const drawForestPatch = (cx, cy, r) => {
      const grad = ctx.createRadialGradient(cx, cy, r * 0.08, cx, cy, r);
      grad.addColorStop(0, "rgba(44, 86, 42, 0.95)");
      grad.addColorStop(0.55, "rgba(62, 108, 52, 0.78)");
      grad.addColorStop(0.85, "rgba(96, 128, 72, 0.35)");
      grad.addColorStop(1, "rgba(197, 155, 109, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawRiverPath = (points, width) => {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Sandy/pebble bank border around water
      ctx.strokeStyle = "rgba(182, 152, 114, 0.65)";
      ctx.lineWidth = width * 1.32;
      ctx.beginPath();
      points.forEach(([px, py], idx) => {
        if (idx === 0) ctx.moveTo(px * size, py * size);
        else ctx.lineTo(px * size, py * size);
      });
      ctx.stroke();

      // Deeper water channel
      ctx.strokeStyle = "rgba(56, 114, 172, 0.92)";
      ctx.lineWidth = width;
      ctx.stroke();

      // Lighter water highlight core
      ctx.strokeStyle = "rgba(116, 174, 224, 0.45)";
      ctx.lineWidth = width * 0.42;
      ctx.stroke();
      ctx.restore();
    };

    if (key.includes("map1")) {
      drawRiverPath([[0.15, 0.05], [0.42, 0.38], [0.75, 0.92]], size * 0.11);
      drawRiverPath([[0.42, 0.38], [0.22, 0.88]], size * 0.08);
      drawForestPatch(size * 0.24, size * 0.32, size * 0.17);
      drawForestPatch(size * 0.72, size * 0.56, size * 0.19);
      drawForestPatch(size * 0.56, size * 0.22, size * 0.12);
    } else if (key.includes("map2")) {
      ctx.fillStyle = "rgba(182, 152, 114, 0.6)";
      ctx.beginPath();
      ctx.arc(size * 0.5, size * 0.5, size * 0.21, 0, Math.PI * 2);
      ctx.fill();
      const lakeGrad = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.02, size * 0.5, size * 0.5, size * 0.17);
      lakeGrad.addColorStop(0, "rgba(110, 168, 220, 0.85)");
      lakeGrad.addColorStop(0.7, "rgba(58, 116, 174, 0.92)");
      lakeGrad.addColorStop(1, "rgba(42, 92, 145, 0.95)");
      ctx.fillStyle = lakeGrad;
      ctx.beginPath();
      ctx.arc(size * 0.5, size * 0.5, size * 0.17, 0, Math.PI * 2);
      ctx.fill();
      drawForestPatch(size * 0.25, size * 0.25, size * 0.16);
      drawForestPatch(size * 0.76, size * 0.74, size * 0.17);
    } else if (key.includes("map3") || key.includes("map4") || key.includes("map5")) {
      drawRiverPath([[0.05, 0.52], [0.48, 0.45], [0.95, 0.56]], size * 0.1);
      if (key.includes("map4")) {
        drawRiverPath([[0.5, 0.05], [0.54, 0.5], [0.46, 0.95]], size * 0.09);
      }
      drawForestPatch(size * 0.3, size * 0.22, size * 0.17);
      drawForestPatch(size * 0.68, size * 0.78, size * 0.17);
    } else if (key.includes("map6") || key.includes("map7") || key.includes("map9")) {
      drawForestPatch(size * 0.35, size * 0.35, size * 0.21);
      drawForestPatch(size * 0.68, size * 0.42, size * 0.19);
      drawForestPatch(size * 0.5, size * 0.72, size * 0.18);
    } else {
      drawForestPatch(size * 0.28, size * 0.35, size * 0.15);
      drawForestPatch(size * 0.74, size * 0.65, size * 0.15);
    }

    return canvas;
  };

  const spawnMapSceneryProps = (terrainField, heightField, size) => {
    let seed = 4219;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Place cedar/pine tree billboards naturally inside forest areas and occasional isolated bushes/rocks
    for (let py = 12; py < size - 12; py += 12) {
      for (let px = 12; px < size - 12; px += 12) {
        const pIdx = py * size + px;
        const tVal = terrainField[pIdx] || 0;
        const wx = ((px / size) * 2 - 1) * (MAP_RADIUS * 0.9);
        const wz = (1 - (py / size) * 2) * (MAP_RADIUS * 0.9);
        if (Math.hypot(wx, wz) > MAP_RADIUS - 2.0) continue;

        if (tVal < -0.32 && rand() < 0.65) {
          const jx = (rand() - 0.5) * 1.5;
          const jz = (rand() - 0.5) * 1.5;
          const finalX = wx + jx;
          const finalZ = wz + jz;
          const wy = getGroundHeightAt(finalX, finalZ);
          const scale = 0.9 + rand() * 0.45;
          const treeSprite = createSpritePlane(`tree_${px}_${py}`, Math.floor(rand() * 8), 0, 1.45 * scale, 1.55 * scale);
          treeSprite.position.set(finalX, wy + 0.68 * scale, finalZ);
          autoMapProps.push(treeSprite);
        }
      }
    }
  };

  const renderTerrainFromSource = (sourceCanvasOrImage, mapPath) => {
    const size = 512;
    clearAutoProps();

    const blurCanvas = document.createElement("canvas");
    blurCanvas.width = size;
    blurCanvas.height = size;
    const bCtx = blurCanvas.getContext("2d");
    bCtx.filter = "blur(6px)";
    bCtx.drawImage(sourceCanvasOrImage, 0, 0, size, size);
    bCtx.filter = "none";
    const srcData = bCtx.getImageData(0, 0, size, size).data;

    const hash2D = (ix, iy) => {
      const n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
      return n - Math.floor(n);
    };

    const smoothNoise = (x, y) => {
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      const fx = x - ix;
      const fy = y - iy;
      const ux = fx * fx * (3 - 2 * fx);
      const uy = fy * fy * (3 - 2 * fy);

      const a = hash2D(ix, iy);
      const b = hash2D(ix + 1, iy);
      const c = hash2D(ix, iy + 1);
      const d = hash2D(ix + 1, iy + 1);

      return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
    };

    const fbmNoise = (x, y) => {
      const n1 = smoothNoise(x, y) * 0.6;
      const n2 = smoothNoise(x * 2.13 + 11.7, y * 2.13 + 29.1) * 0.28;
      const n3 = smoothNoise(x * 4.71 + 43.2, y * 4.71 + 61.9) * 0.12;
      return n1 + n2 + n3;
    };

    const prevTex = groundMat.diffuseTexture;
    const dynTex = new BABYLON.DynamicTexture("mapPaintTex", { width: size, height: size }, scene, true);
    dynTex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    dynTex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
    dynTex.updateSamplingMode(BABYLON.Texture.TRILINEAR_SAMPLINGMODE);

    const ctx = dynTex.getContext();
    const outImg = ctx.createImageData(size, size);
    const out = outImg.data;

    const heightField = new Float32Array(size * size);
    const terrainField = new Float32Array(size * size);

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const i = (py * size + px) * 4;
        const pIdx = py * size + px;
        const r = srcData[i] / 255;
        const g = srcData[i + 1] / 255;
        const b = srcData[i + 2] / 255;

        const waterScore = Math.max(0, Math.min(1, (b - Math.max(r, g * 0.9)) * 2.6));
        const forestScore = Math.max(0, Math.min(1, (g - Math.max(r * 1.05, b * 1.05)) * 2.5));
        const bankScore = Math.max(0, 1 - Math.abs(waterScore - 0.35) * 4.5) * (waterScore > 0.08 ? 1 : 0);

        const nMacro = fbmNoise(px * 0.015, py * 0.015) - 0.5;
        const nDetail = smoothNoise(px * 0.075 + 19.3, py * 0.075 + 47.7) - 0.5;
        const grain = nMacro * 0.055 + nDetail * 0.022;

        // Richer earth & grass palette with subtle contour/ridge shading
        let cr = 0.76 + grain;
        let cg = 0.61 + grain * 0.92;
        let cb = 0.44 + grain * 0.75;

        if (forestScore > 0.02) {
          const f = forestScore;
          cr = cr * (1 - f) + (0.28 + grain * 0.8) * f;
          cg = cg * (1 - f) + (0.48 + grain) * f;
          cb = cb * (1 - f) + (0.27 + grain * 0.65) * f;
        }

        if (bankScore > 0.02) {
          const k = bankScore * 0.65;
          cr = cr * (1 - k) + 0.72 * k;
          cg = cg * (1 - k) + 0.66 * k;
          cb = cb * (1 - k) + 0.54 * k;
        }

        if (waterScore > 0.02) {
          const w = waterScore;
          const shimmer = Math.sin(px * 0.14 + nDetail * 8) * 0.02 * w;
          cr = cr * (1 - w) + (0.34 + grain * 0.5 + shimmer) * w;
          cg = cg * (1 - w) + (0.56 + grain * 0.6 + shimmer) * w;
          cb = cb * (1 - w) + (0.74 + grain * 0.7 + shimmer) * w;
        }

        out[i] = Math.max(0, Math.min(255, Math.round(cr * 255)));
        out[i + 1] = Math.max(0, Math.min(255, Math.round(cg * 255)));
        out[i + 2] = Math.max(0, Math.min(255, Math.round(cb * 255)));
        out[i + 3] = 255;

        heightField[pIdx] = forestScore * 0.55 - waterScore * 0.35 + nMacro * 0.25;
        terrainField[pIdx] = waterScore > forestScore ? waterScore : -forestScore;
      }
    }

    ctx.putImageData(outImg, 0, 0);
    dynTex.update(true);
    mapGrid = { size, heightField, terrainField };

    groundMat.diffuseTexture = dynTex;
    groundMat.diffuseTexture.uScale = 1;
    groundMat.diffuseTexture.vScale = 1;
    if (prevTex && prevTex !== dynTex && typeof prevTex.dispose === "function") {
      prevTex.dispose();
    }

    spawnMapSceneryProps(terrainField, heightField, size);
    restoreSavedZonesForMap(mapPath);
    onTerrainChanged?.();
  };

  const buildTerrainFromMap = (mapPath) => {
    activeMapPath = mapPath;
    clearAutoProps();
    const token = ++terrainLoadToken;

    const candidateUrls = [
      mapPath,
      mapPath?.startsWith("/") ? mapPath.slice(1) : `/${mapPath}`,
      mapPath?.startsWith("assets/") ? `web-src/${mapPath}` : null,
      mapPath?.startsWith("assets/") ? `www/${mapPath}` : null
    ].filter(Boolean);

    const tryCandidate = (idx) => {
      if (token !== terrainLoadToken) return;
      if (idx >= candidateUrls.length) {
        renderTerrainFromSource(drawProceduralMapCanvas(mapPath, 512), mapPath);
        return;
      }

      const img = new Image();
      img.onload = () => {
        if (token !== terrainLoadToken) return;
        renderTerrainFromSource(img, mapPath);
      };
      img.onerror = () => {
        if (token !== terrainLoadToken) return;
        tryCandidate(idx + 1);
      };
      img.src = candidateUrls[idx];
    };

    tryCandidate(0);
  };

  const spawnTerrainFeature = (point, tool) => {
    const radius = tool.id === "hills" ? 4.2 : tool.id === "water" ? 3.8 : 2.8;
    const mesh = buildFeatureMesh(point, tool.id, radius, tool.color);
    terrainZones.push({
      kind: tool.id,
      x: point.x,
      z: point.z,
      radius,
      color: tool.color ?? null,
      mesh
    });
    persistEditorZones();
  };

  const eraseTerrainFeatureAtMesh = (pickedMesh) => {
    const idx = terrainZones.findIndex((z) => z.mesh === pickedMesh);
    if (idx >= 0) {
      const removed = terrainZones.splice(idx, 1)[0];
      removed.mesh?.material?.dispose?.();
      removed.mesh?.dispose?.();
      persistEditorZones();
      return true;
    }
    return false;
  };

  return {
    terrainZones,
    getGroundHeightAt,
    getTerrainInfoAt,
    buildTerrainFromMap,
    spawnTerrainFeature,
    eraseTerrainFeatureAtMesh,
    clearTerrainZones
  };
}
