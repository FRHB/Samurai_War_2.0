import * as BABYLON from "@babylonjs/core";

export const MAPS = [
  { label: "Plains of Practice", path: "assets/Maps/Practice.png" },
  { label: "River Delta", path: "assets/Maps/Map1.png" },
  { label: "Central Lake", path: "assets/Maps/Map2.png" },
  { label: "River", path: "assets/Maps/Map3.png" },
  { label: "Two Rivers", path: "assets/Maps/Map4.png" },
  { label: "Mountain River", path: "assets/Maps/Map5.png" },
  { label: "Mountains", path: "assets/Maps/Map6.png" },
  { label: "The Stairs", path: "assets/Maps/Map7.png" },
  { label: "Trench", path: "assets/Maps/Map8.png" },
  { label: "Forest Hill", path: "assets/Maps/Map9.png" },
  { label: "Plains 1", path: "assets/Maps/Map10.png" },
  { label: "Plains 2", path: "assets/Maps/Map11.png" },
  { label: "Valley of Death", path: "assets/Maps/Map12.png" }
];

export const UNIT_SIZE_OPTIONS = [
  { id: "squad", label: "Squad (10)", soldiers: 10 },
  { id: "platoon", label: "Platoon (50)", soldiers: 50 },
  { id: "company", label: "Company (100)", soldiers: 100 },
  { id: "battalion", label: "Battalion (250)", soldiers: 250 },
  { id: "army", label: "Army (500)", soldiers: 500 }
];

// Each unit archetype defines per-soldier stats (1 unit = 1 soldier entity)
export const UNITS = [
  { id: "ashigaru", label: "Ashigaru", icon: "images/select-ashigaru.png", hp: 45, dmg: 6, armor: 3, morale: 65, sightRange: 18, range: 2.3, speed: 3.4, cd: 1.0, role: "line" },
  { id: "bow", label: "Bow", icon: "images/select-bow.png", hp: 32, dmg: 7, armor: 1, morale: 60, sightRange: 24, range: 13.5, speed: 3.2, cd: 1.45, ranged: true, role: "ranged" },
  { id: "cannon", label: "Cannon", icon: "images/select-cannon.png", hp: 65, dmg: 22, armor: 5, morale: 70, sightRange: 26, range: 17.5, speed: 1.7, cd: 2.7, ranged: true, role: "artillery" },
  { id: "cavalry", label: "Cavalry", icon: "images/select-cavalry.png", hp: 62, dmg: 11, armor: 6, morale: 78, sightRange: 22, range: 2.7, speed: 6.6, cd: 0.9, role: "cavalry" },
  { id: "general", label: "General", icon: "images/select-general.png", hp: 110, dmg: 15, armor: 11, morale: 95, sightRange: 24, range: 2.9, speed: 4.5, cd: 0.85, role: "elite" },
  { id: "katana", label: "Katana", icon: "images/select-katana.png", hp: 54, dmg: 10, armor: 6, morale: 80, sightRange: 19, range: 2.2, speed: 4.3, cd: 0.85, role: "shock" },
  { id: "matchlock", label: "Matchlock", icon: "images/select-matchlock.png", hp: 34, dmg: 11, armor: 2, morale: 62, sightRange: 23, range: 12.0, speed: 2.9, cd: 2.0, ranged: true, role: "ranged" },
  { id: "naginata", label: "Naginata", icon: "images/select-naginata.png", hp: 58, dmg: 9, armor: 7, morale: 76, sightRange: 19, range: 2.9, speed: 3.9, cd: 0.95, role: "antiCav" },
  { id: "samurai", label: "Samurai", icon: "images/select-samurai.png", hp: 75, dmg: 12, armor: 9, morale: 88, sightRange: 20, range: 2.5, speed: 4.5, cd: 0.85, role: "elite" },
  { id: "yari", label: "Yari", icon: "images/select-yari.png", hp: 52, dmg: 8, armor: 5, morale: 70, sightRange: 18, range: 3.2, speed: 3.5, cd: 1.0, role: "antiCav" }
];

export const EDITOR_TOOLS = [
  { id: "hand", label: "Pan/Orbit", icon: "images/editor-mode-hand.png" },
  { id: "hills", label: "Hills", icon: "images/editor-feature-hills.png", color: new BABYLON.Color3(0.56, 0.46, 0.32) },
  { id: "trees", label: "Trees", icon: "images/editor-feature-trees.png", color: new BABYLON.Color3(0.16, 0.46, 0.18) },
  { id: "water", label: "Water", icon: "images/editor-feature-water.png", color: new BABYLON.Color3(0.18, 0.48, 0.78) },
  { id: "fords", label: "Fords", icon: "images/editor-feature-fords.png", color: new BABYLON.Color3(0.66, 0.58, 0.44) },
  { id: "erase", label: "Erase", icon: "images/editor-mode-erase.png" }
];

export const MAP_RADIUS = 52;
export const MAP_DIAMETER = MAP_RADIUS * 2;
export const GRID_SUBS = 128;
