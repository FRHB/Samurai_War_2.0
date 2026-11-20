import * as BABYLON from "@babylonjs/core";

// Single source of truth for per-unit billboard dimensions, ground offset, and canvas size
export const UNIT_BILLBOARD_SPECS = Object.freeze({
  ashigaru: { width: 0.76, height: 0.84, yOffset: 0.445, canvasSize: 192 },
  bow: { width: 0.76, height: 0.84, yOffset: 0.445, canvasSize: 192 },
  matchlock: { width: 0.78, height: 0.85, yOffset: 0.45, canvasSize: 192 },
  yari: { width: 0.8, height: 0.88, yOffset: 0.465, canvasSize: 192 },
  naginata: { width: 0.8, height: 0.88, yOffset: 0.465, canvasSize: 192 },
  katana: { width: 0.78, height: 0.86, yOffset: 0.455, canvasSize: 192 },
  samurai: { width: 0.82, height: 0.9, yOffset: 0.475, canvasSize: 192 },
  cavalry: { width: 0.96, height: 0.94, yOffset: 0.495, canvasSize: 192 },
  general: { width: 1.0, height: 0.98, yOffset: 0.515, canvasSize: 192 },
  cannon: { width: 0.92, height: 0.78, yOffset: 0.415, canvasSize: 192 }
});

const DEFAULT_BILLBOARD_SPEC = Object.freeze({
  width: 0.78,
  height: 0.84,
  yOffset: 0.445,
  canvasSize: 192
});

export function getUnitBillboardSpec(unitId) {
  const base = UNIT_BILLBOARD_SPECS[unitId] || DEFAULT_BILLBOARD_SPEC;
  return {
    width: base.width,
    height: base.height,
    yOffset: base.yOffset,
    canvasSize: base.canvasSize
  };
}

export function createUnitBillboardAtlas(scene) {
  const textureCache = new Map();
  const externalImageCache = new Map();
  const listeners = new Set();

  const notifyUpdated = (unitId, team, state) => {
    for (const fn of listeners) {
      try {
        fn(unitId, team, state);
      } catch {
        // Ignore subscriber errors
      }
    }
  };

  const loadExternalUnitImage = (unitId, team, state) => {
    const candidates = [
      `assets/Units/${unitId}_${team === 2 ? "blue" : "red"}_${state}.png`,
      `assets/Units/${unitId}_${state}.png`,
      `assets/Units/${unitId}.png`,
      `images/units/${unitId}_${team === 2 ? "blue" : "red"}_${state}.png`,
      `images/units/${unitId}.png`
    ];

    const cacheKey = `${unitId}_${team}_${state}`;
    if (externalImageCache.has(cacheKey)) {
      return Promise.resolve(externalImageCache.get(cacheKey));
    }

    return new Promise((resolve) => {
      const tryIndex = (idx) => {
        if (idx >= candidates.length) {
          externalImageCache.set(cacheKey, null);
          resolve(null);
          return;
        }
        const img = new Image();
        img.onload = () => {
          externalImageCache.set(cacheKey, img);
          resolve(img);
        };
        img.onerror = () => tryIndex(idx + 1);
        img.src = candidates[idx];
      };
      tryIndex(0);
    });
  };

  const drawArmoredWarrior = (ctx, s, unitId, team, state) => {
    const isBlue = team === 2;
    const primary = isBlue ? "#1d4ed8" : "#b91c1c";
    const highlight = isBlue ? "#60a5fa" : "#ef4444";
    const shadow = isBlue ? "#172554" : "#450a0a";
    const trim = unitId === "general" ? "#facc15" : (isBlue ? "#dbeafe" : "#fee2e2");

    const isMounted = unitId === "cavalry" || unitId === "general";
    const isHeavy = unitId === "samurai" || unitId === "general" || unitId === "katana" || unitId === "naginata";
    const isCannon = unitId === "cannon";

    const cx = s * 0.5;
    const baseLine = s * 0.88;

    if (state === "fallen") {
      ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
      ctx.beginPath();
      ctx.ellipse(cx, baseLine - s * 0.04, s * 0.28, s * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.roundRect(s * 0.24, baseLine - s * 0.16, s * 0.42, s * 0.085, s * 0.035);
      ctx.fill();

      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.arc(s * 0.69, baseLine - s * 0.12, s * 0.048, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Contact shadow
    ctx.fillStyle = "rgba(15, 23, 42, 0.28)";
    ctx.beginPath();
    ctx.ellipse(cx, baseLine, isMounted ? s * 0.23 : s * 0.16, s * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isCannon) {
      // Carriage base
      ctx.fillStyle = "#5c3a21";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = Math.max(2, s * 0.015);
      ctx.beginPath();
      ctx.roundRect(s * 0.26, baseLine - s * 0.22, s * 0.44, s * 0.13, s * 0.03);
      ctx.fill();
      ctx.stroke();

      // Cannon barrel with metallic shading
      const barrelGrad = ctx.createLinearGradient(s * 0.28, baseLine - s * 0.39, s * 0.78, baseLine - s * 0.24);
      barrelGrad.addColorStop(0, "#78716c");
      barrelGrad.addColorStop(0.5, "#e7e5e4");
      barrelGrad.addColorStop(1, "#44403c");
      ctx.fillStyle = barrelGrad;
      ctx.beginPath();
      ctx.roundRect(s * 0.28, baseLine - s * 0.39, s * 0.5, s * 0.15, s * 0.04);
      ctx.fill();
      ctx.stroke();

      // Carriage wheels
      ctx.strokeStyle = "#3b2312";
      ctx.lineWidth = Math.max(2.5, s * 0.025);
      ctx.beginPath();
      ctx.arc(s * 0.34, baseLine - s * 0.08, s * 0.075, 0, Math.PI * 2);
      ctx.arc(s * 0.64, baseLine - s * 0.08, s * 0.075, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    if (isMounted) {
      const horseGrad = ctx.createLinearGradient(0, baseLine - s * 0.36, 0, baseLine);
      horseGrad.addColorStop(0, "#92400e");
      horseGrad.addColorStop(1, "#451a03");

      ctx.fillStyle = horseGrad;
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = Math.max(2, s * 0.015);

      // Far legs
      ctx.fillRect(s * 0.35, baseLine - s * 0.2, s * 0.048, s * 0.18);
      ctx.fillRect(s * 0.58, baseLine - s * 0.2, s * 0.048, s * 0.18);

      // Horse torso
      ctx.beginPath();
      ctx.ellipse(s * 0.49, baseLine - s * 0.24, s * 0.18, s * 0.085, -0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Horse neck & head
      ctx.beginPath();
      ctx.moveTo(s * 0.62, baseLine - s * 0.29);
      ctx.lineTo(s * 0.74, baseLine - s * 0.45);
      ctx.lineTo(s * 0.82, baseLine - s * 0.39);
      ctx.lineTo(s * 0.69, baseLine - s * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Near legs
      ctx.fillRect(s * 0.39, baseLine - s * 0.18, s * 0.05, s * 0.18);
      ctx.fillRect(s * 0.55, baseLine - s * 0.18, s * 0.05, s * 0.18);
    }

    const riderShift = isMounted ? -s * 0.14 : 0;

    if (!isMounted) {
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = Math.max(1.8, s * 0.013);
      ctx.fillRect(s * 0.415, baseLine - s * 0.21, s * 0.06, s * 0.2);
      ctx.strokeRect(s * 0.415, baseLine - s * 0.21, s * 0.06, s * 0.2);
      ctx.fillRect(s * 0.525, baseLine - s * 0.21, s * 0.06, s * 0.2);
      ctx.strokeRect(s * 0.525, baseLine - s * 0.21, s * 0.06, s * 0.2);
    }

    // Armored Do torso
    const torsoGrad = ctx.createLinearGradient(0, baseLine - s * 0.45 + riderShift, 0, baseLine - s * 0.2 + riderShift);
    torsoGrad.addColorStop(0, highlight);
    torsoGrad.addColorStop(0.65, primary);
    torsoGrad.addColorStop(1, shadow);
    ctx.fillStyle = torsoGrad;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = Math.max(2, s * 0.015);
    ctx.beginPath();
    ctx.roundRect(s * 0.39, baseLine - s * 0.45 + riderShift, s * 0.22, s * 0.25, s * 0.04);
    ctx.fill();
    ctx.stroke();

    // Armor trim band
    ctx.strokeStyle = trim;
    ctx.lineWidth = Math.max(1.5, s * 0.012);
    ctx.beginPath();
    ctx.moveTo(s * 0.41, baseLine - s * 0.34 + riderShift);
    ctx.lineTo(s * 0.59, baseLine - s * 0.34 + riderShift);
    ctx.stroke();

    // Sode shoulder plates
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.roundRect(s * 0.32, baseLine - s * 0.44 + riderShift, s * 0.075, s * 0.11, s * 0.025);
    ctx.roundRect(s * 0.605, baseLine - s * 0.44 + riderShift, s * 0.075, s * 0.11, s * 0.025);
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(cx, baseLine - s * 0.52 + riderShift, s * 0.056, 0, Math.PI * 2);
    ctx.fill();

    // Kabuto vs Jingasa headgear
    if (isHeavy) {
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.arc(cx, baseLine - s * 0.54 + riderShift, s * 0.078, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = trim;
      ctx.lineWidth = Math.max(1.8, s * 0.014);
      ctx.beginPath();
      ctx.moveTo(cx, baseLine - s * 0.61 + riderShift);
      ctx.lineTo(cx - s * 0.08, baseLine - s * 0.7 + riderShift);
      ctx.moveTo(cx, baseLine - s * 0.61 + riderShift);
      ctx.lineTo(cx + s * 0.08, baseLine - s * 0.7 + riderShift);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#475569";
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.11, baseLine - s * 0.55 + riderShift);
      ctx.lineTo(cx, baseLine - s * 0.62 + riderShift);
      ctx.lineTo(cx + s * 0.11, baseLine - s * 0.55 + riderShift);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Distinct weapon silhouette
    ctx.lineCap = "round";
    if (unitId === "yari" || unitId === "naginata" || unitId === "ashigaru") {
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = Math.max(2, s * 0.018);
      ctx.beginPath();
      ctx.moveTo(s * 0.65, baseLine - s * 0.08 + riderShift);
      ctx.lineTo(s * 0.7, baseLine - s * 0.76 + riderShift);
      ctx.stroke();
    } else if (unitId === "bow") {
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = Math.max(2, s * 0.019);
      ctx.beginPath();
      ctx.arc(s * 0.66, baseLine - s * 0.36 + riderShift, s * 0.11, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();
    } else if (unitId === "matchlock") {
      ctx.strokeStyle = "#27272a";
      ctx.lineWidth = Math.max(2.5, s * 0.023);
      ctx.beginPath();
      ctx.moveTo(s * 0.6, baseLine - s * 0.34 + riderShift);
      ctx.lineTo(s * 0.84, baseLine - s * 0.5 + riderShift);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = Math.max(2, s * 0.019);
      ctx.beginPath();
      ctx.moveTo(s * 0.62, baseLine - s * 0.32 + riderShift);
      ctx.lineTo(s * 0.82, baseLine - s * 0.54 + riderShift);
      ctx.stroke();
    }
  };

  const renderCanvasFor = (unitId, team, state, externalImg = null) => {
    const spec = getUnitBillboardSpec(unitId);
    const s = spec.canvasSize;
    const canvas = document.createElement("canvas");
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, s, s);

    if (externalImg) {
      const pad = s * 0.06;
      const drawW = s - pad * 2;
      const drawH = s - pad * 2;
      const aspect = externalImg.naturalWidth && externalImg.naturalHeight
        ? externalImg.naturalWidth / externalImg.naturalHeight
        : 1;
      let w = drawW;
      let h = drawH;
      if (aspect > 1) {
        h = drawW / aspect;
      } else {
        w = drawH * aspect;
      }
      const dx = (s - w) * 0.5;
      const dy = s - pad - h;
      ctx.drawImage(externalImg, dx, dy, w, h);
      return canvas;
    }

    drawArmoredWarrior(ctx, s, unitId, team, state);
    return canvas;
  };

  const getUnitBillboardTexture = (unitId, team, state = "alive") => {
    const key = `${unitId}_${team}_${state}`;
    if (textureCache.has(key)) return textureCache.get(key);

    const canvas = renderCanvasFor(unitId, team, state, null);
    const dt = new BABYLON.DynamicTexture(`billboard_${key}`, canvas, scene, true);
    dt.hasAlpha = true;
    dt.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    dt.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
    dt.updateSamplingMode(BABYLON.Texture.TRILINEAR_SAMPLINGMODE);
    dt.update(true);
    textureCache.set(key, dt);

    loadExternalUnitImage(unitId, team, state).then((img) => {
      if (!img) return;
      const updatedCanvas = renderCanvasFor(unitId, team, state, img);
      const ctx = dt.getContext();
      ctx.clearRect(0, 0, updatedCanvas.width, updatedCanvas.height);
      ctx.drawImage(updatedCanvas, 0, 0);
      dt.update(true);
      notifyUpdated(unitId, team, state);
    });

    return dt;
  };

  const onTextureUpdated = (cb) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };

  const dispose = () => {
    listeners.clear();
    for (const tex of textureCache.values()) {
      tex.dispose?.();
    }
    textureCache.clear();
  };

  return {
    getUnitBillboardSpec,
    getUnitBillboardTexture,
    onTextureUpdated,
    dispose
  };
}
