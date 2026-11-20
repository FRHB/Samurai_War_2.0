import { MAPS, UNITS, EDITOR_TOOLS, UNIT_SIZE_OPTIONS } from "../config/gameData.js";

const UNIT_ICONS = {
  ashigaru: "▲",
  bow: "🏹",
  cannon: "💣",
  cavalry: "🐎",
  general: "★",
  katana: "⚔",
  matchlock: "🔥",
  naginata: "🔱",
  samurai: "🛡",
  yari: "🗡"
};

export class UIController {
  constructor({
    unitTypes,
    onMapChange,
    onModeChange,
    onTeamChange,
    onToolChange,
    onUnitTypeChange,
    onFormationSizeChange,
    onEditorToolChange,
    onOrderChange,
    onSpeedToggle,
    onMusicToggle,
    onClearUnits
  }) {
    this.unitTypes = Array.isArray(unitTypes) && unitTypes.length > 0 ? unitTypes : UNITS;
    this.onMapChange = onMapChange;
    this.onModeChange = onModeChange;
    this.onTeamChange = onTeamChange;
    this.onToolChange = onToolChange;
    this.onUnitTypeChange = onUnitTypeChange;
    this.onFormationSizeChange = onFormationSizeChange;
    this.onEditorToolChange = onEditorToolChange;
    this.onOrderChange = onOrderChange;
    this.onSpeedToggle = onSpeedToggle;
    this.onMusicToggle = onMusicToggle;
    this.onClearUnits = onClearUnits;

    this.mapSelect = document.getElementById("map-select");
    this.formationSelect = document.getElementById("formation-size");
    this.editorToolsEl = document.getElementById("editor-tools");
    this.redCountEl = document.getElementById("red-count");
    this.blueCountEl = document.getElementById("blue-count");
    this.terrainInfoEl = document.getElementById("terrain-info");
    this.statusLineEl = document.getElementById("status-line");
    this.speedBtn = document.getElementById("speed-toggle");
    this.musicBtn = document.getElementById("music-toggle");
    this.sidebarEl = document.getElementById("sidebar");
    this.sidebarToggleBtn = document.getElementById("sidebar-toggle");

    this.modeButtons = {
      sandbox: document.getElementById("mode-sandbox"),
      practice: document.getElementById("mode-practice"),
      editor: document.getElementById("mode-editor")
    };

    this.teamButtons = {
      red: document.getElementById("team-red"),
      blue: document.getElementById("team-blue")
    };

    this.toolButtons = {
      deploy: document.getElementById("tool-deploy"),
      select: document.getElementById("tool-select")
    };

    this.orderButtons = {
      halt: document.getElementById("order-halt"),
      walk: document.getElementById("order-walk"),
      run: document.getElementById("order-run"),
      hold: document.getElementById("order-hold"),
      fire: document.getElementById("order-fire")
    };

    this.unitButtons = new Map();
    this.editorToolButtons = new Map();

    this._populateMapSelect();
    this._populateFormationSelect();
    this._buildUnitButtons();
    this._buildEditorTools();
    this._bindEvents();
  }

  _populateMapSelect() {
    if (!this.mapSelect) return;
    this.mapSelect.innerHTML = "";
    MAPS.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.path;
      opt.textContent = m.label;
      this.mapSelect.appendChild(opt);
    });
    if (MAPS.length > 0) {
      this.mapSelect.value = MAPS[0].path;
    }
  }

  _populateFormationSelect() {
    if (!this.formationSelect) return;
    this.formationSelect.innerHTML = "";
    UNIT_SIZE_OPTIONS.forEach((optDef) => {
      const opt = document.createElement("option");
      opt.value = String(optDef.soldiers);
      opt.textContent = optDef.label;
      this.formationSelect.appendChild(opt);
    });
    if (UNIT_SIZE_OPTIONS.length > 0) {
      this.formationSelect.value = String(UNIT_SIZE_OPTIONS[0].soldiers);
    }
  }

  _buildUnitButtons() {
    const container = document.getElementById("unit-buttons");
    if (!container) return;
    container.innerHTML = "";

    this.unitTypes.forEach((u, index) => {
      const unitId = u.id || u.kind;
      const unitName = u.name || u.label || unitId;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "unit-btn";
      btn.title = `${unitName} (${u.role || "Unit"})`;
      if (index === 0) btn.classList.add("active");

      if (u.icon) {
        const img = document.createElement("img");
        img.src = u.icon;
        img.alt = unitName;
        img.onerror = () => {
          img.remove();
        };
        btn.appendChild(img);
      }

      const labelSpan = document.createElement("span");
      const fallbackIcon = u.icon ? "" : `${UNIT_ICONS[unitId] || "•"} `;
      labelSpan.textContent = `${fallbackIcon}${unitName}`;
      btn.appendChild(labelSpan);

      btn.addEventListener("click", () => {
        this.setActiveUnitType(unitId);
        this.onUnitTypeChange?.(unitId);
      });
      container.appendChild(btn);
      this.unitButtons.set(unitId, btn);
    });
  }

  _buildEditorTools() {
    if (!this.editorToolsEl) return;
    this.editorToolsEl.innerHTML = "";
    EDITOR_TOOLS.forEach((tool, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "unit-btn";
      btn.title = tool.label;
      if (idx === 1) btn.classList.add("active");

      if (tool.icon) {
        const img = document.createElement("img");
        img.src = tool.icon;
        img.alt = tool.label;
        img.onerror = () => {
          img.remove();
        };
        btn.appendChild(img);
      }

      const span = document.createElement("span");
      span.textContent = tool.label;
      btn.appendChild(span);

      btn.addEventListener("click", () => {
        this.setActiveEditorTool(tool.id);
        this.onEditorToolChange?.(tool);
      });
      this.editorToolsEl.appendChild(btn);
      this.editorToolButtons.set(tool.id, btn);
    });
  }

  _bindEvents() {
    this.sidebarToggleBtn?.addEventListener("click", () => {
      this.sidebarEl?.classList.toggle("collapsed");
      window.dispatchEvent(new Event("resize"));
    });

    this.mapSelect?.addEventListener("change", (e) => {
      this.onMapChange?.(e.target.value);
    });

    Object.entries(this.modeButtons).forEach(([mode, btn]) => {
      btn?.addEventListener("click", () => {
        this.setActiveMode(mode);
        this.onModeChange?.(mode);
      });
    });

    Object.entries(this.teamButtons).forEach(([team, btn]) => {
      btn?.addEventListener("click", () => {
        this.setActiveTeam(team);
        this.onTeamChange?.(team);
      });
    });

    Object.entries(this.toolButtons).forEach(([tool, btn]) => {
      btn?.addEventListener("click", () => {
        this.setActiveTool(tool);
        this.onToolChange?.(tool);
      });
    });

    this.formationSelect?.addEventListener("change", (e) => {
      this.onFormationSizeChange?.(Number(e.target.value));
    });

    Object.entries(this.orderButtons).forEach(([order, btn]) => {
      btn?.addEventListener("click", () => {
        this.setActiveOrder(order);
        this.onOrderChange?.(order);
      });
    });

    this.speedBtn?.addEventListener("click", () => {
      this.onSpeedToggle?.();
    });

    this.musicBtn?.addEventListener("click", () => {
      this.onMusicToggle?.();
    });

    document.getElementById("clear-units")?.addEventListener("click", () => {
      this.onClearUnits?.();
    });
  }

  getSelectedMapPath() {
    return this.mapSelect?.value || MAPS[0]?.path || "";
  }

  setActiveMode(mode) {
    Object.entries(this.modeButtons).forEach(([key, btn]) => {
      btn?.classList.toggle("active", key === mode);
    });
    if (this.editorToolsEl) {
      this.editorToolsEl.style.display = mode === "editor" ? "grid" : "none";
    }
  }

  setActiveEditorTool(toolId) {
    this.editorToolButtons.forEach((btn, id) => {
      btn.classList.toggle("active", id === toolId);
    });
  }

  setActiveTeam(team) {
    const teamKey = team === 1 || team === "red" ? "red" : "blue";
    Object.entries(this.teamButtons).forEach(([key, btn]) => {
      btn?.classList.toggle("active", key === teamKey);
    });
  }

  setActiveTool(tool) {
    const normalized = tool === "order" ? "select" : tool;
    Object.entries(this.toolButtons).forEach(([key, btn]) => {
      btn?.classList.toggle("active", key === normalized);
    });
  }

  setActiveUnitType(unitId) {
    this.unitButtons.forEach((btn, id) => {
      btn.classList.toggle("active", id === unitId);
    });
  }

  setActiveOrder(order) {
    Object.entries(this.orderButtons).forEach(([key, btn]) => {
      btn?.classList.toggle("active", key === order);
    });
  }

  setSpeedLabel(speed) {
    if (this.speedBtn) {
      this.speedBtn.textContent = `Speed: ${speed}x`;
    }
  }

  setMusicLabel(isPlaying) {
    if (this.musicBtn) {
      this.musicBtn.textContent = isPlaying ? "Music: On" : "Music: Off";
      this.musicBtn.classList.toggle("active", Boolean(isPlaying));
    }
  }

  setStatusMessage(msg) {
    if (this.statusLineEl) {
      this.statusLineEl.textContent = msg || "";
    }
  }

  updateHud({ redCount, blueCount, terrainLabel }) {
    if (this.redCountEl) {
      const spans = this.redCountEl.querySelectorAll("span");
      if (spans.length >= 2) spans[1].textContent = String(redCount);
      else this.redCountEl.textContent = `Red: ${redCount}`;
    }

    if (this.blueCountEl) {
      const spans = this.blueCountEl.querySelectorAll("span");
      if (spans.length >= 2) spans[1].textContent = String(blueCount);
      else this.blueCountEl.textContent = `Blue: ${blueCount}`;
    }

    if (this.terrainInfoEl && terrainLabel) {
      this.terrainInfoEl.textContent = `Terrain: ${terrainLabel}`;
    }
  }
}
