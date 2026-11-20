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

  // Billboards sprite sheet helpers (per-plane material with non-shared UV-cropped texture)
  const billboardSourceTex = new BABYLON.Texture("assets/Textures/Billboards.png", scene, false, false);
  billboardSourceTex.hasAlpha = true;
  billboardSourceTex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
  billboardSourceTex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

  const createCellTexture = (col, row) => {
    const tex = billboardSourceTex.clone();
    tex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
    tex.uScale = 1 / SPRITE_COLS;
    tex.vScale = 1 / SPRITE_ROWS;
    tex.uOffset = col / SPRITE_COLS;
    tex.vOffset = 1 - (row + 1) / SPRITE_ROWS;
    return tex;
  };

  const setSpriteCell = (plane, col, row) => {
    const u0 = col / SPRITE_COLS;
    const u1 = (col + 1) / SPRITE_COLS;
    const vTop = 1 - row / SPRITE_ROWS;
    const vBot = 1 - (row + 1) / SPRITE_ROWS;

    const uvs = [u0, vBot, u1, vBot, u1, vTop, u0, vTop];
    plane.setVerticesData(BABYLON.VertexBuffer.UVKind, uvs, true);

    if (plane.material?.diffuseTexture) {
      plane.material.diffuseTexture.uScale = 1 / SPRITE_COLS;
      plane.material.diffuseTexture.vScale = 1 / SPRITE_ROWS;
      plane.material.diffuseTexture.uOffset = u0;
      plane.material.diffuseTexture.vOffset = vBot;
    }
  };

  const createSpritePlane = (name, col, row, sizeX = 1.05, sizeY = 1.15) => {
    const plane = BABYLON.MeshBuilder.CreatePlane(name, { width: sizeX, height: sizeY, updatable: true }, scene);
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
    plane.isPickable = false;

    const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
    mat.diffuseTexture = createCellTexture(col, row);
    mat.diffuseTexture.hasAlpha = true;
    mat.useAlphaFromDiffuseTexture = true;
    mat.backFaceCulling = false;
    mat.emissiveColor = new BABYLON.Color3(0.22, 0.22, 0.22);
    mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    plane.material = mat;

    plane.onDisposeObservable.add(() => {
      mat.diffuseTexture?.dispose?.();
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
