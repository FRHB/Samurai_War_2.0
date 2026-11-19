import * as BABYLON from "@babylonjs/core";

export function buildTerrain(scene, mapConfig) {
  const width = mapConfig.width || 60;
  const depth = mapConfig.depth || 60;
  const subdivs = mapConfig.subdivisions || 64;

  const ground = BABYLON.MeshBuilder.CreateGround(
    "terrainGround",
    {
      width,
      height: depth,
      subdivisions: subdivs,
      updatable: true
    },
    scene
  );

  const positions = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  const colors = new Float32Array((positions.length / 3) * 4);

  const riverCenterZ = 0;
  const riverHalfWidth = 5.5;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];

    const nx = x / (width * 0.5);
    const nz = z / (depth * 0.5);

    const hillWave =
      Math.sin(x * 0.14) * Math.cos(z * 0.12) * 1.4 +
      Math.sin((x + z) * 0.08) * 0.8;
    const ridgeMask = Math.max(0, Math.min(1, (Math.abs(nx) + Math.abs(nz)) * 0.65));

    const distToRiver = Math.abs(z - riverCenterZ + Math.sin(x * 0.11) * 3.0);
    const riverFactor = Math.max(0, 1 - distToRiver / riverHalfWidth);

    let y = hillWave * ridgeMask - riverFactor * 1.35;
    if (riverFactor > 0.35) {
      y = Math.min(y, -0.75);
    }

    positions[i + 1] = y;

    const cIdx = (i / 3) * 4;
    if (y < -0.55) {
      // River Delta water / shallow bed
      colors[cIdx] = 0.22;
      colors[cIdx + 1] = 0.44;
      colors[cIdx + 2] = 0.56;
      colors[cIdx + 3] = 1.0;
    } else if (y < -0.25) {
      // Sandy bank / delta silt
      colors[cIdx] = 0.68;
      colors[cIdx + 1] = 0.60;
      colors[cIdx + 2] = 0.42;
      colors[cIdx + 3] = 1.0;
    } else if (y > 1.15) {
      // Elevated highland / ridge
      colors[cIdx] = 0.46;
      colors[cIdx + 1] = 0.52;
      colors[cIdx + 2] = 0.36;
      colors[cIdx + 3] = 1.0;
    } else {
      // Forest / plains meadow
      const forestPatch = Math.sin(x * 0.18 + 1.2) * Math.cos(z * 0.17 - 0.5);
      if (forestPatch > 0.25) {
        colors[cIdx] = 0.26;
        colors[cIdx + 1] = 0.45;
        colors[cIdx + 2] = 0.24;
      } else {
        colors[cIdx] = 0.43;
        colors[cIdx + 1] = 0.56;
        colors[cIdx + 2] = 0.31;
      }
      colors[cIdx + 3] = 1.0;
    }
  }

  ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
  ground.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors, false);
  ground.createNormals(true);
  ground.hasVertexAlpha = false;
  ground.receiveShadows = true;

  const groundMat = new BABYLON.StandardMaterial("terrainMat", scene);
  groundMat.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
  groundMat.roughness = 0.9;
  groundMat.backFaceCulling = true;
  ground.material = groundMat;

  const water = BABYLON.MeshBuilder.CreateGround(
    "riverWater",
    { width, height: depth, subdivisions: 2 },
    scene
  );
  water.position.y = -0.45;
  water.isPickable = false;

  const waterMat = new BABYLON.StandardMaterial("waterMat", scene);
  waterMat.diffuseColor = new BABYLON.Color3(0.18, 0.42, 0.58);
  waterMat.specularColor = new BABYLON.Color3(0.35, 0.45, 0.5);
  waterMat.alpha = 0.72;
  water.material = waterMat;

  return {
    ground,
    water,
    getHeightAt(x, z) {
      const clampedX = Math.max(-width * 0.5, Math.min(width * 0.5, x));
      const clampedZ = Math.max(-depth * 0.5, Math.min(depth * 0.5, z));

      const colFloat = ((clampedX + width * 0.5) / width) * subdivs;
      const rowFloat = ((depth * 0.5 - clampedZ) / depth) * subdivs;

      const c0 = Math.max(0, Math.min(subdivs - 1, Math.floor(colFloat)));
      const r0 = Math.max(0, Math.min(subdivs - 1, Math.floor(rowFloat)));
      const c1 = Math.min(subdivs, c0 + 1);
      const r1 = Math.min(subdivs, r0 + 1);

      const tx = colFloat - c0;
      const ty = rowFloat - r0;

      const rowStride = subdivs + 1;
      const h00 = positions[(r0 * rowStride + c0) * 3 + 1];
      const h10 = positions[(r0 * rowStride + c1) * 3 + 1];
      const h01 = positions[(r1 * rowStride + c0) * 3 + 1];
      const h11 = positions[(r1 * rowStride + c1) * 3 + 1];

      const h0 = h00 + (h10 - h00) * tx;
      const h1 = h01 + (h11 - h01) * tx;
      return h0 + (h1 - h0) * ty;
    }
  };
}
