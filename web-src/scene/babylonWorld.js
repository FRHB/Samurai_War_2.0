import * as BABYLON from "@babylonjs/core";
import { GRID_SUBS, MAP_DIAMETER, MAP_RADIUS } from "../config/gameData.js";

const SPRITE_COLS = 8;
const SPRITE_ROWS = 8;

export function createBabylonWorld(canvas) {
  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true
  });

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.32, 0.33, 0.35, 1);

  const camera = new BABYLON.ArcRotateCamera(
    "cam",
    -Math.PI / 2,
    Math.PI / 4.2,
    56,
    BABYLON.Vector3.Zero(),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerBetaLimit = 0.2;
  camera.upperBetaLimit = Math.PI / 2.25;
  camera.lowerRadiusLimit = 10;
  camera.upperRadiusLimit = 120;

  new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
  const dirLight = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-0.45, -1, -0.35), scene);
  dirLight.position = new BABYLON.Vector3(20, 45, 20);

  // Outer linen backdrop
  const backdrop = BABYLON.MeshBuilder.CreateGround("backdrop", { width: 220, height: 220, subdivisions: 2 }, scene);
  backdrop.position.y = -0.18;
  const linenTex = new BABYLON.Texture("assets/Textures/Linen128x128.png", scene);
  linenTex.uScale = 36;
  linenTex.vScale = 36;
  const backdropMat = new BABYLON.StandardMaterial("backdropMat", scene);
  backdropMat.diffuseTexture = linenTex;
  backdropMat.diffuseColor = new BABYLON.Color3(0.72, 0.74, 0.78);
  backdropMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
  backdrop.material = backdropMat;

  // Circular battlefield disc
  const ground = BABYLON.MeshBuilder.CreateDisc(
    "battlefield",
    { radius: MAP_RADIUS, tessellation: GRID_SUBS },
    scene
  );
  ground.rotation.x = Math.PI / 2;

  const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
  groundMat.specularColor = new BABYLON.Color3(0.06, 0.06, 0.06);
  ground.material = groundMat;

  const rimRing = BABYLON.MeshBuilder.CreateTorus(
    "mapRim",
    { diameter: MAP_DIAMETER, thickness: 0.28, tessellation: 72 },
    scene
  );
  rimRing.position.y = 0.06;
  rimRing.isPickable = false;
  const rimMat = new BABYLON.StandardMaterial("rimMat", scene);
  rimMat.diffuseColor = new BABYLON.Color3(0.45, 0.42, 0.37);
  rimRing.material = rimMat;

  // Billboards sprite sheet helpers (per-plane cloned texture + material with fallback figure if sheet is blank/unloaded)
  const billboardSourceTex = new BABYLON.Texture("assets/Textures/Billboards.png", scene, false, true);
  billboardSourceTex.hasAlpha = true;
  billboardSourceTex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
  billboardSourceTex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

  const fallbackFigureTexCache = new Map();
  const getFallbackFigureTexture = (row) => {
    const isBlue = row === 1;
    const isFallen = row === 3 || row === 4;
    const key = `${isBlue ? "blue" : "red"}_${isFallen ? "fallen" : "alive"}`;
    if (fallbackFigureTexCache.has(key)) return fallbackFigureTexCache.get(key);

    const dt = new BABYLON.DynamicTexture(`fallbackSprite_${key}`, { width: 64, height: 64 }, scene, true);
    dt.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    dt.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
    const ctx = dt.getContext();
    ctx.clearRect(0, 0, 64, 64);

    if (isFallen) {
      ctx.fillStyle = "rgba(31, 41, 55, 0.85)";
      ctx.fillRect(10, 36, 44, 10);
      ctx.beginPath();
      ctx.arc(46, 36, 6, 0, Math.PI * 2);
      ctx.fillStyle = isBlue ? "#3b82f6" : "#ef4444";
      ctx.fill();
    } else {
      const primary = isBlue ? "#2563eb" : "#dc2626";
      const accent = isBlue ? "#93c5fd" : "#fca5a5";
      // Kabuto / helmet top
      ctx.beginPath();
      ctx.arc(32, 17, 9, Math.PI, 0);
      ctx.fillStyle = "#1f2937";
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Torso armor
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.roundRect(21, 25, 22, 20, 4);
      ctx.fill();
      ctx.strokeStyle = "#f9fafb";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Legs / base
      ctx.fillStyle = "#111827";
      ctx.fillRect(23, 45, 7, 11);
      ctx.fillRect(34, 45, 7, 11);
    }

    dt.update();
    fallbackFigureTexCache.set(key, dt);
    return dt;
  };

  const applyCellToTexture = (tex, col, row) => {
    if (!tex || tex instanceof BABYLON.DynamicTexture) return;
    tex.uScale = 1 / SPRITE_COLS;
    tex.vScale = 1 / SPRITE_ROWS;
    tex.uOffset = col / SPRITE_COLS;
    tex.vOffset = 1 - (row + 1) / SPRITE_ROWS;
  };

  const setSpriteCell = (plane, col, row) => {
    const u0 = col / SPRITE_COLS;
    const u1 = (col + 1) / SPRITE_COLS;
    const vTop = 1 - row / SPRITE_ROWS;
    const vBot = 1 - (row + 1) / SPRITE_ROWS;

    const uvs = [u0, vBot, u1, vBot, u1, vTop, u0, vTop];
    plane.setVerticesData(BABYLON.VertexBuffer.UVKind, uvs, true);

    const useFallback = !billboardSourceTex.isReady() || (row === 0 && plane.name?.startsWith("editorTree_"));
    if (useFallback && plane.material && row !== 0) {
      const fbTex = getFallbackFigureTexture(row);
      if (plane.material.diffuseTexture !== fbTex && plane.material.diffuseTexture !== billboardSourceTex) {
        plane.material.diffuseTexture?.dispose?.();
      }
      plane.material.diffuseTexture = fbTex;
      plane.material.diffuseTexture.uScale = 1;
      plane.material.diffuseTexture.vScale = 1;
      plane.material.diffuseTexture.uOffset = 0;
      plane.material.diffuseTexture.vOffset = 0;
      return;
    }

    if (plane.material?.diffuseTexture && plane.material.diffuseTexture !== billboardSourceTex) {
      applyCellToTexture(plane.material.diffuseTexture, col, row);
    }
  };

  const createSpritePlane = (name, col, row, sizeX = 1.05, sizeY = 1.15) => {
    const plane = BABYLON.MeshBuilder.CreatePlane(name, { width: sizeX, height: sizeY, updatable: true }, scene);
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
    plane.isPickable = false;

    const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
    const clonedTex = billboardSourceTex.clone();
    clonedTex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    clonedTex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
    mat.diffuseTexture = clonedTex;
    mat.diffuseTexture.hasAlpha = true;
    mat.useAlphaFromDiffuseTexture = true;
    mat.backFaceCulling = false;
    mat.emissiveColor = new BABYLON.Color3(0.35, 0.35, 0.35);
    mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    plane.material = mat;

    plane.onDisposeObservable.add(() => {
      if (mat.diffuseTexture && !fallbackFigureTexCache.has(mat.diffuseTexture.name)) {
        mat.diffuseTexture.dispose();
      }
      mat.dispose();
    });

    setSpriteCell(plane, col, row);
    return plane;
  };

  // Cursor ring
  const cursorRing = BABYLON.MeshBuilder.CreateTorus("cursorRing", { diameter: 1.5, thickness: 0.08, tessellation: 24 }, scene);
  cursorRing.isPickable = false;
  cursorRing.setEnabled(false);

  // Drag-to-direct order arrow
  const orderArrowMat = new BABYLON.StandardMaterial("orderArrowMat", scene);
  orderArrowMat.diffuseColor = new BABYLON.Color3(0.28, 0.24, 0.20);
  orderArrowMat.alpha = 0.55;

  const orderShaft = BABYLON.MeshBuilder.CreateBox("orderShaft", { width: 1.5, height: 0.06, depth: 1 }, scene);
  orderShaft.material = orderArrowMat;
  orderShaft.isPickable = false;
  orderShaft.setEnabled(false);

  const orderHead = BABYLON.MeshBuilder.CreateCylinder("orderHead", { diameterTop: 0.1, diameterBottom: 3.1, height: 2.2, tessellation: 3 }, scene);
  orderHead.rotation.x = Math.PI / 2;
  orderHead.material = orderArrowMat;
  orderHead.isPickable = false;
  orderHead.setEnabled(false);

  const orderStar = BABYLON.MeshBuilder.CreateDisc("orderStar", { radius: 2.2, tessellation: 10 }, scene);
  orderStar.rotation.x = Math.PI / 2;
  orderStar.material = orderArrowMat;
  orderStar.isPickable = false;
  orderStar.setEnabled(false);

  const hideOrderArrow = () => {
    orderShaft.setEnabled(false);
    orderHead.setEnabled(false);
    orderStar.setEnabled(false);
  };

  const updateOrderArrow = (startPt, endPt) => {
    const dx = endPt.x - startPt.x;
    const dz = endPt.z - startPt.z;
    const len = Math.hypot(dx, dz);
    if (len < 1.2) {
      hideOrderArrow();
      return;
    }
    const angle = Math.atan2(dx, dz);
    const midX = (startPt.x + endPt.x) * 0.5;
    const midZ = (startPt.z + endPt.z) * 0.5;
    const shaftLen = Math.max(0.5, len - 1.4);

    orderShaft.setEnabled(true);
    orderShaft.scaling.z = shaftLen;
    orderShaft.position.set(midX - (dx / len) * 0.6, 0.14, midZ - (dz / len) * 0.6);
    orderShaft.rotation.y = angle;

    orderHead.setEnabled(true);
    orderHead.position.set(endPt.x, 0.15, endPt.z);
    orderHead.rotation.y = angle;

    orderStar.setEnabled(true);
    orderStar.position.set(endPt.x, 0.13, endPt.z);
    orderStar.rotation.y = angle;
  };

  window.addEventListener("resize", () => engine.resize());

  return {
    engine,
    scene,
    camera,
    backdrop,
    ground,
    groundMat,
    cursorRing,
    setSpriteCell,
    createSpritePlane,
    updateOrderArrow,
    hideOrderArrow
  };
}
