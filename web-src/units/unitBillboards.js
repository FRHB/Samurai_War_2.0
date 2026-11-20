import * as BABYLON from "@babylonjs/core";

export function createUnitBillboardAtlas(scene) {
  const cache = new Map();

  // Draws crisp, clean Sengoku soldier sprites (1 unit = 1 soldier) with minimal visual clutter
  const drawStyledUnitCanvas = (unitId, team, state) => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 128, 128);

    const isBlue = team === 2;
    const armorMain = isBlue ? "#2563eb" : "#dc2626";
    const armorDark = isBlue ? "#1e3a8a" : "#7f1d1d";
    const trimColor = unitId === "general" ? "#facc15" : (isBlue ? "#bfdbfe" : "#fecaca");
    const horseColor = "#6b3e26";

    const isMounted = unitId === "cavalry" || unitId === "general";
    const isHeavy = unitId === "samurai" || unitId === "general" || unitId === "katana" || unitId === "naginata";
    const isCannon = unitId === "cannon";

    if (state === "fallen") {
      ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
      ctx.beginPath();
      ctx.ellipse(64, 102, 34, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = armorDark;
      ctx.beginPath();
      ctx.roundRect(34, 88, 50, 10, 5);
      ctx.fill();

      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.arc(86, 92, 6, 0, Math.PI * 2);
      ctx.fill();
      return canvas;
    }

    // Subtle ground shadow
    ctx.fillStyle = "rgba(15, 23, 42, 0.28)";
    ctx.beginPath();
    ctx.ellipse(64, 114, isMounted ? 26 : 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isCannon) {
      // Compact cannon carriage + barrel
      ctx.fillStyle = "#5c3a21";
      ctx.beginPath();
      ctx.roundRect(36, 86, 52, 16, 4);
      ctx.fill();

      ctx.fillStyle = "#a8a29e";
      ctx.strokeStyle = "#1c1917";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(40, 66, 58, 16, 5);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#3f2614";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(46, 104, 9, 0, Math.PI * 2);
      ctx.arc(82, 104, 9, 0, Math.PI * 2);
      ctx.stroke();
      return canvas;
    }

    if (isMounted) {
      // Horse silhouette
      ctx.fillStyle = horseColor;
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(64, 86, 22, 10, -0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Horse neck & head
      ctx.beginPath();
      ctx.moveTo(80, 80);
      ctx.lineTo(94, 62);
      ctx.lineTo(104, 70);
      ctx.lineTo(88, 88);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Horse legs
      ctx.fillStyle = horseColor;
      ctx.fillRect(46, 93, 6, 20);
      ctx.fillRect(74, 93, 6, 20);
    }

    const dy = isMounted ? -18 : 0;

    // Legs (for foot soldiers)
    if (!isMounted) {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(54, 92, 7, 21);
      ctx.fillRect(67, 92, 7, 21);
    }

    // Armored torso
    ctx.fillStyle = armorMain;
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(51, 64 + dy, 26, 30, 5);
    ctx.fill();
    ctx.stroke();

    // Armor highlight stripe
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(54, 76 + dy);
    ctx.lineTo(74, 76 + dy);
    ctx.stroke();

    // Shoulders
    ctx.fillStyle = armorDark;
    ctx.beginPath();
    ctx.roundRect(43, 65 + dy, 9, 13, 3);
    ctx.roundRect(76, 65 + dy, 9, 13, 3);
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(64, 54 + dy, 7, 0, Math.PI * 2);
    ctx.fill();

    // Helmet (Kabuto for heavy/elite, Jingasa for light/ranged)
    if (isHeavy) {
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.arc(64, 52 + dy, 9.5, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = trimColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(64, 43 + dy);
      ctx.lineTo(54, 32 + dy);
      ctx.moveTo(64, 43 + dy);
      ctx.lineTo(74, 32 + dy);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#475569";
      ctx.beginPath();
      ctx.moveTo(50, 51 + dy);
      ctx.lineTo(64, 42 + dy);
      ctx.lineTo(78, 51 + dy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Clean weapon accent
    ctx.lineCap = "round";
    if (unitId === "yari" || unitId === "naginata" || unitId === "ashigaru") {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(82, 108 + dy);
      ctx.lineTo(88, 26 + dy);
      ctx.stroke();
    } else if (unitId === "bow") {
      ctx.strokeStyle = "#b45309";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(83, 74 + dy, 13, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
    } else if (unitId === "matchlock") {
      ctx.strokeStyle = "#27272a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(76, 78 + dy);
      ctx.lineTo(104, 58 + dy);
      ctx.stroke();
    } else {
      // Katana / Samurai / Cavalry / General blade
      ctx.strokeStyle = "#f1f5f9";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(78, 82 + dy);
      ctx.lineTo(102, 54 + dy);
      ctx.stroke();
    }

    return canvas;
  };

  const getUnitBillboardTexture = (unitId, team, state = "alive") => {
    const key = `${unitId}_${team}_${state}`;
    if (cache.has(key)) return cache.get(key);

    const canvas = drawStyledUnitCanvas(unitId, team, state);
    const dt = new BABYLON.DynamicTexture(`billboard_${key}`, canvas, scene, true);
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
    getUnitBillboardTexture,
    dispose
  };
}
