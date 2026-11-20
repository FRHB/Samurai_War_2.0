import * as BABYLON from "@babylonjs/core";
import { MAP_RADIUS } from "../config/gameData.js";

export function createTerrainSystem({ scene, groundMat, createSpritePlane, onTerrainChanged }) {
  const terrainZones = [];
  const autoMapProps = [];
  let mapGrid = null;

  const clearAutoProps = () => {
    while (autoMapProps.length) autoMapProps.pop().dispose();
  };

  const sampleMapField = (field, x, z) => {
    if (!mapGrid || !field) return 0;
    const normX = (x / (MAP_RADIUS * 0.96) + 1) * 0.5;
    const normZ = (1 - z / (MAP_RADIUS * 0.96)) * 0.5;
    const fx = Math.min(mapGrid.size - 1.001, Math.max(0, normX * (mapGrid.size - 1)));
    const fz = Math.min(mapGrid.size - 1.001, Math.max(0, normZ * (mapGrid.size - 1)));
    const x0 = Math.floor(fx);
    const z0 = Math.floor(fz);
    const x1 = x0 + 1;
    const z1 = z0 + 1;
    const tx = fx - x0;
    const tz = fz - z0;

    const i00 = z0 * mapGrid.size + x0;
    const i10 = z0 * mapGrid.size + x1;
    const i01 = z1 * mapGrid.size + x0;
    const i11 = z1 * mapGrid.size + x1;

    const a = field[i00] * (1 - tx) + field[i10] * tx;
    const b = field[i01] * (1 - tx) + field[i11] * tx;
    return a * (1 - tz) + b * tz;
  };

  const getGroundHeightAt = (x, z) => {
    const r = Math.hypot(x, z);
    if (r >= MAP_RADIUS) return -0.18;
    const edgeFalloff = Math.max(0, Math.min(1, (MAP_RADIUS - r) / 1.8));
    const mapH = sampleMapField(mapGrid?.heightField, x, z);
    const ripple = Math.sin(x * 0.16) * Math.cos(z * 0.16) * 0.08;

    let zoneH = 0;
    for (const tz of terrainZones) {
      const d = Math.hypot(x - tz.x, z - tz.z);
      if (d < tz.radius) {
        const factor = Math.cos((d / tz.radius) * (Math.PI * 0.5));
        if (tz.kind === "hills") zoneH += factor * 1.35;
        if (tz.kind === "water") zoneH -= factor * 0.42;
      }
    }

    return (mapH + zoneH + ripple) * edgeFalloff;
  };

  const getTerrainInfoAt = (x, z) => {
    for (const tz of terrainZones) {
      if (Math.hypot(x - tz.x, z - tz.z) <= tz.radius) {
        if (tz.kind === "water") return { type: "water", label: "River / Water (-45% Speed)", speedMult: 0.55, rangedDefMult: 1.0, atkMult: 0.85 };
        if (tz.kind === "fords") return { type: "fords", label: "Ford (Safe Crossing)", speedMult: 0.92, rangedDefMult: 1.0, atkMult: 1.0 };
        if (tz.kind === "trees") return { type: "trees", label: "Forest (-35% Ranged Dmg)", speedMult: 0.82, rangedDefMult: 0.65, atkMult: 1.0 };
        if (tz.kind === "hills") return { type: "hills", label: "High Ground (+20% Attack)", speedMult: 0.88, rangedDefMult: 0.9, atkMult: 1.2 };
      }
    }
    const kindCode = sampleMapField(mapGrid?.terrainField, x, z);
    if (kindCode > 0.65) return { type: "water", label: "River / Water (-45% Speed)", speedMult: 0.55, rangedDefMult: 1.0, atkMult: 0.85 };
    if (kindCode < -0.35) return { type: "trees", label: "Forest (-35% Ranged Dmg)", speedMult: 0.82, rangedDefMult: 0.65, atkMult: 1.0 };
    return { type: "plains", label: "Plains (Normal)", speedMult: 1.0, rangedDefMult: 1.0, atkMult: 1.0 };
  };

  const buildTerrainFromMap = (mapPath) => {
    clearAutoProps();
    const img = new Image();
    img.src = mapPath;
    img.onload = () => {
      const size = 512;

      const blurCanvas = document.createElement("canvas");
      blurCanvas.width = size;
      blurCanvas.height = size;
      const bCtx = blurCanvas.getContext("2d");
      bCtx.filter = "blur(8px)";
      bCtx.drawImage(img, 0, 0, size, size);
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

          const nCoarse = smoothNoise(px * 0.02, py * 0.02) - 0.5;
          const nFine = smoothNoise(px * 0.06 + 19.3, py * 0.06 + 47.7) - 0.5;
          const grain = nCoarse * 0.028 + nFine * 0.01;

          let cr = 0.79 + grain;
          let cg = 0.63 + grain * 0.9;
          let cb = 0.47 + grain * 0.8;

          if (forestScore > 0.02) {
            const f = forestScore;
            cr = cr * (1 - f) + (0.36 + grain) * f;
            cg = cg * (1 - f) + (0.52 + grain) * f;
            cb = cb * (1 - f) + (0.34 + grain * 0.7) * f;
          }

          if (bankScore > 0.02) {
            const k = bankScore * 0.55;
            cr = cr * (1 - k) + 0.68 * k;
            cg = cg * (1 - k) + 0.65 * k;
            cb = cb * (1 - k) + 0.60 * k;
          }
          if (waterScore > 0.02) {
            const w = waterScore;
            cr = cr * (1 - w) + (0.48 + grain * 0.6) * w;
            cg = cg * (1 - w) + (0.64 + grain * 0.7) * w;
            cb = cb * (1 - w) + (0.76 + grain * 0.8) * w;
          }

          out[i] = Math.max(0, Math.min(255, Math.round(cr * 255)));
          out[i + 1] = Math.max(0, Math.min(255, Math.round(cg * 255)));
          out[i + 2] = Math.max(0, Math.min(255, Math.round(cb * 255)));
          out[i + 3] = 255;

          heightField[pIdx] = forestScore * 0.55 - waterScore * 0.35;
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

      onTerrainChanged?.();
    };
  };

  const spawnTerrainFeature = (point, tool) => {
    const radius = tool.id === "hills" ? 4.2 : tool.id === "water" ? 3.8 : 2.8;
    let mesh;
    if (tool.id === "hills") {
      mesh = BABYLON.MeshBuilder.CreateSphere(`hill_${Date.now()}`, { diameterX: radius * 2, diameterY: 2.1, diameterZ: radius * 2 }, scene);
      mesh.position = new BABYLON.Vector3(point.x, point.y + 0.35, point.z);
    } else if (tool.id === "trees") {
      mesh = createSpritePlane(`editorTree_${Date.now()}`, Math.floor(Math.random() * 8), 0, 1.5, 1.5);
      mesh.position = new BABYLON.Vector3(point.x, point.y + 0.72, point.z);
    } else {
      mesh = BABYLON.MeshBuilder.CreateDisc(`${tool.id}_${Date.now()}`, { radius, tessellation: 24 }, scene);
      mesh.rotation.x = Math.PI / 2;
      mesh.position = new BABYLON.Vector3(point.x, point.y + 0.05, point.z);
    }
    if (tool.id !== "trees") {
      const mat = new BABYLON.StandardMaterial(`mat_${tool.id}`, scene);
      mat.diffuseColor = tool.color;
      mat.alpha = tool.id === "water" || tool.id === "fords" ? 0.72 : 0.92;
      mesh.material = mat;
    }
    terrainZones.push({ kind: tool.id, x: point.x, z: point.z, radius, mesh });
  };

  const eraseTerrainFeatureAtMesh = (pickedMesh) => {
    const idx = terrainZones.findIndex((z) => z.mesh === pickedMesh);
    if (idx >= 0) {
      terrainZones.splice(idx, 1)[0].mesh.dispose();
      return true;
    }
    return false;
  };

  const clearTerrainZones = () => {
    while (terrainZones.length) terrainZones.pop().mesh.dispose();
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
