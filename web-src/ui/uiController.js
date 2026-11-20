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
    onOrderChange,
    onSpeedToggle,
    onMusicToggle,
    onClearUnits
  }) {
    this.unitTypes = unitTypes;
    this.onMapChange = onMapChange;
    this.onModeChange = onModeChange;
    this.onTeamChange = onTeamChange;
    this.onToolChange = onToolChange;
    this.onUnitTypeChange = onUnitTypeChange;
    this.onFormationSizeChange = onFormationSizeChange;
    this.onOrderChange = onOrderChange;
    this.onSpeedToggle = onSpeedToggle;
    this.onMusicToggle = onMusicToggle;
    this.onClearUnits = onClearUnits;

    this.mapSelect = document.getElementById("map-select");
    this.formationSelect = document.getElementById("formation-size");
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
    this._buildUnitButtons();
    this._bindEvents();
  }

  _buildUnitButtons() {
    const container = document.getElementById("unit-buttons");
    container.innerHTML = "";

    this.unitTypes.forEach((u, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "unit-btn";
      const icon = UNIT_ICONS[u.id] || "•";
      btn.textContent = `${icon} ${u.name}`;
      btn.title = `${u.name} (${u.role || "Unit"})`;
      if (index === 0) btn.classList.add("active");
      btn.addEventListener("click", () => {
        this.setActiveUnitType(u.id);
        this.onUnitTypeChange?.(u.id);
      });
      container.appendChild(btn);
      this.unitButtons.set(u.id, btn);
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

  setActiveMode(mode) {
    Object.entries(this.modeButtons).forEach(([key, btn]) => {
      btn?.classList.toggle("active", key === mode);
    });
  }

  setActiveTeam(team) {
    Object.entries(this.teamButtons).forEach(([key, btn]) => {
      btn?.classList.toggle("active", key === team);
    });
  }

  setActiveTool(tool) {
    Object.entries(this.toolButtons).forEach(([key, btn]) => {
      btn?.classList.toggle("active", key === tool);
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
