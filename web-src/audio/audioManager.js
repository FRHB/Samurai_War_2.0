export function createSoundManager() {
  const sfx = {
    select: new Audio("assets/Sounds/Tap-B1-Select.wav"),
    place: new Audio("assets/Sounds/Tap-C2-Movement-Done.wav"),
    move: new Audio("assets/Sounds/Tap-C1-Movement.wav"),
    melee: new Audio("assets/Sounds/Samurai-Melee-Infantry.wav"),
    cavMelee: new Audio("assets/Sounds/Samurai-Melee-Cavalry.wav"),
    arrow: new Audio("assets/Sounds/Samurai-Missile-Arrows.wav"),
    matchlock: new Audio("assets/Sounds/Samurai-Missile-Matchlock-1.wav"),
    cannon: new Audio("assets/Sounds/Samurai-Missile-Cannon-1.wav")
  };

  const casualties = [1, 2, 3, 4, 5, 6, 7, 8].map(
    (n) => new Audio(`assets/Sounds/Samurai-Casualty-${n}.wav`)
  );

  const combatSfxSet = new Set([
    sfx.melee,
    sfx.cavMelee,
    sfx.arrow,
    sfx.matchlock,
    sfx.cannon
  ]);

  const battleMusic = new Audio("assets/Music/Battle to the Death.ogg");
  battleMusic.loop = true;
  battleMusic.volume = 0.28;

  let musicEnabled = false;
  let lastCombatSfxAt = 0;

  const playSfx = (audio, minGapMs = 70) => {
    if (!audio) return;
    if (combatSfxSet.has(audio)) {
      const now = performance.now();
      if (now - lastCombatSfxAt < minGapMs) return;
      lastCombatSfxAt = now;
    }
    const clone = audio.cloneNode();
    clone.volume = 0.6;
    clone.play().catch(() => {});
  };

  const playRandomCasualty = () => {
    playSfx(casualties[Math.floor(Math.random() * casualties.length)]);
  };

  const playUnitAttackSfx = (unitId) => {
    if (unitId === "bow") playSfx(sfx.arrow);
    else if (unitId === "matchlock") playSfx(sfx.matchlock);
    else if (unitId === "cannon") playSfx(sfx.cannon);
    else if (unitId === "cavalry") playSfx(sfx.cavMelee);
    else playSfx(sfx.melee);
  };

  const toggleMusic = () => {
    musicEnabled = !musicEnabled;
    if (musicEnabled) battleMusic.play().catch(() => {});
    else battleMusic.pause();
    return musicEnabled;
  };

  return {
    sfx,
    playSfx,
    playRandomCasualty,
    playUnitAttackSfx,
    toggleMusic
  };
}