import * as BABYLON from "@babylonjs/core";

export function createUnitBillboardAtlas(scene) {
  const cache = new Map();

  // Draws crisp, clean Sengoku soldier sprites (1 unit = 1 soldier) with high-contrast silhouettes
  const drawStyledUnitCanvas = (unitId, team, state) => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 160, 160);

    const isBlue = team === 2;
    const armorMain = isBlue ? "#2563eb" : "#dc2626";
    const armorDark = isBlue ? "#1e3a8a" : "#7f1d1d";
    const trimColor = unitId === "general" ? "#facc15" : (isBlue ? "#bfdbfe" : "#fecaca");
    const horseColor = "#78350f";

    const isMounted = unitId === "cavalry" || unitId === "general";
    const isHeavy = unitId === "samurai" || unitId === "general" || unitId === "katana" || unitId === "naginata";
    const isCannon = unitId === "cannon";

    if (state === "fallen") {
      ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
      ctx.beginPath();
      ctx.ellipse(80, 128, 42, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = armorDark;
      ctx.beginPath();
      ctx.roundRect(42, 110, 64, 13, 6);
      ctx.fill();

      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.arc(108, 116, 7.5, 0, Math.PI * 2);
      ctx.fill();
      return canvas;
    }

    // Ground shadow
    ctx.fillStyle = "rgba(15, 23, 42, 0.3)";
    ctx.beginPath();
    ctx.ellipse(80, 144, isMounted ? 34 : 24, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isCannon) {
      // Wooden carriage + bronze barrel
      ctx.fillStyle = "#5c3a21";
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(44, 108, 66, 20, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#d6d3d1";
      ctx.beginPath();
      ctx.roundRect(48, 82, 76, 22, 6);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#3f2614";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(56, 130, 11.5, 0, Math.PI * 2);
      ctx.arc(102, 130, 11.5, 0, Math.PI * 2);
      ctx.stroke();
      return canvas;
    }

    if (isMounted) {
      // Horse body, head & legs
      ctx.fillStyle = horseColor;
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(80, 108, 28, 13, -0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(100, 100);
      ctx.lineTo(118, 76);
      ctx.lineTo(130, 86);
      ctx.lineTo(110, 110);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillRect(58, 116, 7.5, 26);
      ctx.strokeRect(58, 116, 7.5, 26);
      ctx.fillRect(92, 116, 7.5, 26);
      ctx.strokeRect(92, 116, 7.5, 26);
    }

    const dy = isMounted ? -22 : 0;

    // Legs (for foot soldiers)
    if (!isMounted) {
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.fillRect(67, 115, 9, 27);
      ctx.strokeRect(67, 115, 9, 27);
      ctx.fillRect(84, 115, 9, 27);
      ctx.strokeRect(84, 115, 9, 27);
    }

    // Armored torso
    ctx.fillStyle = armorMain;
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.roundRect(63, 78 + dy, 34, 39, 6);
    ctx.fill();
    ctx.stroke();

    // Armor trim stripe
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(67, 94 + dy);
    ctx.lineTo(93, 94 + dy);
    ctx.stroke();

    // Shoulder guards
    ctx.fillStyle = armorDark;
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(52, 80 + dy, 12, 16, 4);
    ctx.roundRect(96, 80 + dy, 12, 16, 4);
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(80, 66 + dy, 8.8, 0, Math.PI * 2);
    ctx.fill();

    // Helmet (Kabuto for heavy/elite, Jingasa for light/ranged)
    if (isHeavy) {
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.arc(80, 63 + dy, 12, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = trimColor;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(80, 51 + dy);
      ctx.lineTo(67, 37 + dy);
      ctx.moveTo(80, 51 + dy);
      ctx.lineTo(93, 37 + dy);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#475569";
      ctx.beginPath();
      ctx.moveTo(62, 62 + dy);
      ctx.lineTo(80, 50 + dy);
      ctx.lineTo(98, 62 + dy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Unit weapon
    ctx.lineCap = "round";
    if (unitId === "yari" || unitId === "naginata" || unitId === "ashigaru") {
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(103, 136 + dy);
      ctx.lineTo(111, 28 + dy);
      ctx.stroke();
    } else if (unitId === "bow") {
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(104, 92 + dy, 16, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
    } else if (unitId === "matchlock") {
      ctx.strokeStyle = "#27272a";
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.moveTo(95, 96 + dy);
      ctx.lineTo(132, 70 + dy);
      ctx.stroke();
    } else {
      // Katana / Samurai / Cavalry / General blade
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(98, 100 + dy);
      ctx.lineTo(128, 64 + dy);
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
