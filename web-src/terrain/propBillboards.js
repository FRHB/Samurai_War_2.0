import * as BABYLON from "@babylonjs/core";

export function createPropBillboards(scene) {
  const cache = new Map();

  const drawTreeCanvas = (variantIndex) => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 128, 128);

    const palettes = [
      ["#14532d", "#166534", "#15803d"],
      ["#1e3a2f", "#2f5233", "#3f6212"],
      ["#14432a", "#1f6137", "#2e7d32"]
    ];
    const [darkG, midG, lightG] = palettes[variantIndex % palettes.length];

    // Shadow & trunk
    ctx.fillStyle = "rgba(15, 23, 42, 0.28)";
    ctx.beginPath();
    ctx.ellipse(64, 118, 24, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#5c3a21";
    ctx.fillRect(58, 92, 12, 26);

    // Layered pine/cedar tiers
    const tiers = [
      { topY: 16, botY: 56, halfW: 24, color: lightG },
      { topY: 38, botY: 80, halfW: 34, color: midG },
      { topY: 62, botY: 102, halfW: 42, color: darkG }
    ];
    for (const t of tiers) {
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.moveTo(64, t.topY);
      ctx.lineTo(64 + t.halfW, t.botY);
      ctx.lineTo(64 - t.halfW, t.botY);
      ctx.closePath();
      ctx.fill();
    }

    return canvas;
  };

  const getTreeBillboardTexture = (variantIndex = 0) => {
    const idx = Math.abs(Number(variantIndex) || 0) % 3;
    const key = `tree_${idx}`;
    if (cache.has(key)) return cache.get(key);

    const dt = new BABYLON.DynamicTexture(key, drawTreeCanvas(idx), scene, true);
    dt.hasAlpha = true;
    dt.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    dt.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
    dt.updateSamplingMode(BABYLON.Texture.TRILINEAR_SAMPLINGMODE);
    dt.update(true);
    cache.set(key, dt);
    return dt;
  };

  const dispose = () => {
    for (const tex of cache.values()) {
      tex.dispose?.();
    }
    cache.clear();
  };

  return {
    getTreeBillboardTexture,
    dispose
  };
}
