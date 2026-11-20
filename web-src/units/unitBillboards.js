import * as BABYLON from "@babylonjs/core";

export function createUnitBillboardAtlas(scene) {
  const cache = new Map();

  // Draws stylized Sengoku unit billboard textures per unit type, team, and state ("alive" | "fallen")
  const drawStyledUnitCanvas = (unitId, team, state) => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 160, 160);

    const isBlue = team === 2;
    const armorMain = isBlue ? "#1d4ed8" : "#b91c1c";
    const armorDark = isBlue ? "#1e3a8a" : "#7f1d1d";
    const armorLight = isBlue ? "#93c5fd" : "#fca5a5";
    const sashimonoBg = isBlue ? "#2563eb" : "#dc2626";
    const sashimonoBorder = "#f8fafc";
    const horseMain = "#78350f";
    const horseShade = "#451a03";

    const isMounted = unitId === "cavalry" || unitId === "general";
    const isHeavy = unitId === "samurai" || unitId === "general" || unitId === "katana" || unitId === "naginata";
    const isGeneral = unitId === "general";
    const isRanged = unitId === "bow" || unitId === "matchlock";
    const isCannon = unitId === "cannon";

    if (state === "fallen") {
      ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
      ctx.beginPath();
      ctx.ellipse(80, 124, 54, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      if (isMounted) {
        ctx.fillStyle = horseShade;
        ctx.beginPath();
        ctx.roundRect(24, 98, 96, 22, 9);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(118, 106, 11, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = armorDark;
      ctx.beginPath();
      ctx.roundRect(30, 108, 76, 14, 6);
      ctx.fill();

      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.arc(108, 113, 8, 0, Math.PI * 2);
      ctx.fill();

      return canvas;
    }

    // Ground shadow
    ctx.fillStyle = "rgba(15, 23, 42, 0.34)";
    ctx.beginPath();
    ctx.ellipse(80, 144, isMounted ? 42 : 30, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sashimono war banner behind unit
    const flagX = isMounted ? 44 : 52;
    const flagTopY = isMounted ? 14 : 20;
    ctx.strokeStyle = "#d6d3d1";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(flagX, 136);
    ctx.lineTo(flagX, flagTopY);
    ctx.stroke();

    ctx.fillStyle = sashimonoBg;
    ctx.strokeStyle = sashimonoBorder;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(flagX + 1.5, flagTopY + 2);
    ctx.lineTo(flagX + 34, flagTopY + 8);
    ctx.lineTo(flagX + 34, flagTopY + 42);
    ctx.lineTo(flagX + 1.5, flagTopY + 36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Mon crest mark on banner
    ctx.strokeStyle = isGeneral ? "#fde047" : armorLight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(flagX + 18, flagTopY + 22, 6, 0, Math.PI * 2);
    ctx.stroke();

    if (isCannon) {
      // Wooden gun carriage
      ctx.fillStyle = "#5c3a21";
      ctx.strokeStyle = "#29170a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(46, 114);
      ctx.lineTo(116, 114);
      ctx.lineTo(104, 134);
      ctx.lineTo(56, 134);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bronze cannon barrel
      const grad = ctx.createLinearGradient(52, 76, 128, 104);
      grad.addColorStop(0, "#78716c");
      grad.addColorStop(0.5, "#d6d3d1");
      grad.addColorStop(1, "#57534e");
      ctx.fillStyle = grad;
      ctx.strokeStyle = "#1c1917";
      ctx.beginPath();
      ctx.roundRect(54, 82, 74, 22, 6);
      ctx.fill();
      ctx.stroke();

      // Spoked wheels
      for (const wx of [62, 104]) {
        ctx.strokeStyle = "#451a03";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(wx, 128, 13, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#92400e";
        ctx.beginPath();
        ctx.arc(wx, 128, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      return canvas;
    }

    if (isMounted) {
      // Horse body & legs
      ctx.fillStyle = horseShade;
      ctx.fillRect(56, 112, 8, 28);
      ctx.fillRect(102, 112, 8, 28);

      ctx.fillStyle = horseMain;
      ctx.strokeStyle = "#1c1917";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(84, 104, 30, 15, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Horse neck & head
      ctx.beginPath();
      ctx.moveTo(104, 96);
      ctx.lineTo(122, 72);
      ctx.lineTo(136, 82);
      ctx.lineTo(116, 108);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Horse legs foreground
      ctx.fillStyle = horseMain;
      ctx.fillRect(63, 115, 8, 28);
      ctx.fillRect(95, 115, 8, 28);
    }

    const riderOffsetY = isMounted ? -26 : 0;

    // Legs / hakama
    if (!isMounted) {
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.fillRect(67, 112, 10, 28);
      ctx.strokeRect(67, 112, 10, 28);
      ctx.fillRect(83, 112, 10, 28);
      ctx.strokeRect(83, 112, 10, 28);
    }

    // Do / armored torso
    ctx.fillStyle = isGeneral ? "#1e1b4b" : armorMain;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(63, 76 + riderOffsetY, 34, 38, 6);
    ctx.fill();
    ctx.stroke();

    // Kusazuri tassets / armor trim
    ctx.strokeStyle = isGeneral ? "#facc15" : armorLight;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(66, 90 + riderOffsetY);
    ctx.lineTo(94, 90 + riderOffsetY);
    ctx.moveTo(66, 102 + riderOffsetY);
    ctx.lineTo(94, 102 + riderOffsetY);
    ctx.stroke();

    // Sode shoulder guards
    ctx.fillStyle = isHeavy ? armorMain : armorDark;
    ctx.beginPath();
    ctx.roundRect(53, 77 + riderOffsetY, 12, 18, 4);
    ctx.roundRect(95, 77 + riderOffsetY, 12, 18, 4);
    ctx.fill();
    ctx.stroke();

    // Head & Kabuto / Jingasa helmet
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(80, 65 + riderOffsetY, 9, 0, Math.PI * 2);
    ctx.fill();

    if (isHeavy) {
      // Kabuto bowl & crest
      ctx.fillStyle = isGeneral ? "#b91c1c" : "#334155";
      ctx.beginPath();
      ctx.arc(80, 62 + riderOffsetY, 12, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // V-shaped maedate horns for Samurai / General
      ctx.strokeStyle = isGeneral ? "#fde047" : "#e2e8f0";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(80, 52 + riderOffsetY);
      ctx.lineTo(67, 38 + riderOffsetY);
      ctx.moveTo(80, 52 + riderOffsetY);
      ctx.lineTo(93, 38 + riderOffsetY);
      ctx.stroke();
    } else {
      // Jingasa conical war hat
      ctx.fillStyle = "#475569";
      ctx.beginPath();
      ctx.moveTo(62, 62 + riderOffsetY);
      ctx.lineTo(80, 50 + riderOffsetY);
      ctx.lineTo(98, 62 + riderOffsetY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Unit-specific weapon silhouette
    ctx.lineCap = "round";
    if (unitId === "yari" || unitId === "naginata") {
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(104, 134 + riderOffsetY);
      ctx.lineTo(114, 24 + riderOffsetY);
      ctx.stroke();

      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.moveTo(114, 16 + riderOffsetY);
      ctx.lineTo(120, 30 + riderOffsetY);
      ctx.lineTo(109, 30 + riderOffsetY);
      ctx.closePath();
      ctx.fill();
    } else if (unitId === "katana" || unitId === "samurai" || unitId === "general" || isMounted) {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(98, 102 + riderOffsetY);
      ctx.quadraticCurveTo(124, 84 + riderOffsetY, 134, 54 + riderOffsetY);
      ctx.stroke();
    } else if (isRanged) {
      if (unitId === "bow") {
        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(106, 86 + riderOffsetY, 18, -Math.PI * 0.42, Math.PI * 0.42);
        ctx.stroke();
      } else {
        // Matchlock arquebus
        ctx.strokeStyle = "#3f3f46";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(94, 94 + riderOffsetY);
        ctx.lineTo(132, 66 + riderOffsetY);
        ctx.stroke();
      }
    } else {
      // Ashigaru spear
      ctx.strokeStyle = "#d6d3d1";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(102, 132 + riderOffsetY);
      ctx.lineTo(110, 34 + riderOffsetY);
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
