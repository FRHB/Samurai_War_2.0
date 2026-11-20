import * as BABYLON from "@babylonjs/core";
import { GRID_SUBS, MAP_DIAMETER, MAP_RADIUS } from "../config/gameData.js";
import { createPropBillboards } from "../terrain/propBillboards.js";

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
    115,
    BABYLON.Vector3.Zero(),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerBetaLimit = 0.2;
  camera.upperBetaLimit = Math.PI / 2.25;
  camera.lowerRadiusLimit = 14;
  camera.upperRadiusLimit = 240;

  new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
  const dirLight = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-0.45, -1, -0.35), scene);
  dirLight.position = new BABYLON.Vector3(38, 75, 38);

  // Outer linen backdrop
  const backdrop = BABYLON.MeshBuilder.CreateGround("backdrop", { width: 480, height: 480, subdivisions: 2 }, scene);
  backdrop.position.y = -0.18;
  const linenTex = new BABYLON.Texture("assets/Textures/Linen128x128.png", scene);
  linenTex.uScale = 78;
  linenTex.vScale = 78;
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
    { diameter: MAP_DIAMETER, thickness: 0.38, tessellation: 128 },
    scene
  );
  rimRing.position.y = 0.06;
  rimRing.isPickable = false;
  const rimMat = new BABYLON.StandardMaterial("rimMat", scene);
  rimMat.diffuseColor = new BABYLON.Color3(0.45, 0.42, 0.37);
  rimRing.material = rimMat;

  // Separate prop billboard module (trees) + clean full-quad UV mapping for custom textures
  const propBillboards = createPropBillboards(scene);
  const billboardSourceTex = new BABYLON.Texture("assets/Textures/Billboards.png", scene, false, true);
  billboardSourceTex.hasAlpha = true;
  billboardSourceTex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
  billboardSourceTex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

  const applyFullQuadUvs = (plane) => {
    const uvs = [0, 0, 1, 0, 1, 1, 0, 1];
    plane.setVerticesData(BABYLON.VertexBuffer.UVKind, uvs, true);
  };

  const applyCellToTexture = (tex, col, row) => {
    if (!tex || tex instanceof BABYLON.DynamicTexture) return;
    tex.uScale = 1 / SPRITE_COLS;
    tex.vScale = 1 / SPRITE_ROWS;
    tex.uOffset = col / SPRITE_COLS;
    tex.vOffset = 1 - (row + 1) / SPRITE_ROWS;
  };

  const setSpriteCell = (plane, col, row) => {
    if (plane.metadata?.usesFullTexture) {
      applyFullQuadUvs(plane);
      if (plane.material?.diffuseTexture) {
        plane.material.diffuseTexture.uScale = 1;
        plane.material.diffuseTexture.vScale = 1;
        plane.material.diffuseTexture.uOffset = 0;
        plane.material.diffuseTexture.vOffset = 0;
      }
      return;
    }

    const u0 = col / SPRITE_COLS;
    const u1 = (col + 1) / SPRITE_COLS;
    const vTop = 1 - row / SPRITE_ROWS;
    const vBot = 1 - (row + 1) / SPRITE_ROWS;

    const uvs = [u0, vBot, u1, vBot, u1, vTop, u0, vTop];
    plane.setVerticesData(BABYLON.VertexBuffer.UVKind, uvs, true);

    if (plane.name?.startsWith("editorTree_") || plane.name?.startsWith("tree_")) {
      if (plane.material) {
        plane.material.diffuseTexture = propBillboards.getTreeBillboardTexture(col);
        plane.material.diffuseTexture.uScale = 1;
        plane.material.diffuseTexture.vScale = 1;
        plane.material.diffuseTexture.uOffset = 0;
        plane.material.diffuseTexture.vOffset = 0;
      }
      return;
    }

    if (plane.material?.diffuseTexture && plane.material.diffuseTexture !== billboardSourceTex) {
      applyCellToTexture(plane.material.diffuseTexture, col, row);
    }
  };

  const createSpritePlane = (name, col, row, sizeX = 0.8, sizeY = 0.88, customTexture = null) => {
    const plane = BABYLON.MeshBuilder.CreatePlane(name, { width: sizeX, height: sizeY, updatable: true }, scene);
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
    plane.isPickable = false;

    const isTree = name?.startsWith("editorTree_") || name?.startsWith("tree_");
    const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);

    if (customTexture) {
      mat.diffuseTexture = customTexture;
    } else if (isTree) {
      mat.diffuseTexture = propBillboards.getTreeBillboardTexture(col);
    } else {
      const clonedTex = billboardSourceTex.clone();
      clonedTex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
      clonedTex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
      mat.diffuseTexture = clonedTex;
    }

    mat.diffuseTexture.hasAlpha = true;
    mat.useAlphaFromDiffuseTexture = true;
    mat.backFaceCulling = false;
    mat.emissiveColor = new BABYLON.Color3(0.28, 0.28, 0.28);
    mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    plane.material = mat;

    const ownsTexture = !customTexture && !isTree;
    plane.onDisposeObservable.add(() => {
      if (ownsTexture && mat.diffuseTexture) {
        mat.diffuseTexture.dispose();
      }
      mat.dispose();
    });

    if (customTexture) {
      plane.metadata = { ...(plane.metadata || {}), usesFullTexture: true };
      applyFullQuadUvs(plane);
      mat.diffuseTexture.uScale = 1;
      mat.diffuseTexture.vScale = 1;
      mat.diffuseTexture.uOffset = 0;
      mat.diffuseTexture.vOffset = 0;
    } else {
      setSpriteCell(plane, col, row);
    }
    return plane;
  };

  // Cursor ring
  const cursorRing = BABYLON.MeshBuilder.CreateTorus("cursorRing", { diameter: 1.05, thickness: 0.06, tessellation: 24 }, scene);
  cursorRing.isPickable = false;
  cursorRing.setEnabled(false);

  // Drag-to-direct order arrow
  const orderArrowMat = new BABYLON.StandardMaterial("orderArrowMat", scene);
  orderArrowMat.diffuseColor = new BABYLON.Color3(0.28, 0.24, 0.20);
  orderArrowMat.alpha = 0.55;

  const orderShaft = BABYLON.MeshBuilder.CreateBox("orderShaft", { width: 1.2, height: 0.06, depth: 1 }, scene);
  orderShaft.material = orderArrowMat;
  orderShaft.isPickable = false;
  orderShaft.setEnabled(false);

  const orderHead = BABYLON.MeshBuilder.CreateCylinder("orderHead", { diameterTop: 0.08, diameterBottom: 2.3, height: 1.7, tessellation: 3 }, scene);
  orderHead.rotation.x = Math.PI / 2;
  orderHead.material = orderArrowMat;
  orderHead.isPickable = false;
  orderHead.setEnabled(false);

  const orderStar = BABYLON.MeshBuilder.CreateDisc("orderStar", { radius: 1.6, tessellation: 10 }, scene);
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
    const shaftLen = Math.max(0.5, len - 1.2);

    orderShaft.setEnabled(true);
    orderShaft.scaling.z = shaftLen;
    orderShaft.position.set(midX - (dx / len) * 0.5, 0.14, midZ - (dz / len) * 0.5);
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
