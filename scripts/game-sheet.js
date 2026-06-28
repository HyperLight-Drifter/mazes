const SETTINGS = {
  darkness:    "darkness",
  treasure:    "treasure",
  playerCount: "playerCount",
  supply:      "supply",
  artifacts:   "artifacts",
};

export function registerGameSheetSettings() {
  game.settings.register("mazes", SETTINGS.darkness, {
    scope: "world", config: false, type: Number, default: 0,
  });
  game.settings.register("mazes", SETTINGS.treasure, {
    scope: "world", config: false, type: Number, default: 0,
  });
  game.settings.register("mazes", SETTINGS.playerCount, {
    scope: "world", config: false, type: Number, default: 1,
  });
  game.settings.register("mazes", SETTINGS.supply, {
    scope: "world", config: false, type: Number, default: 0,
  });
  game.settings.register("mazes", "artifacts", {
    scope: "world", config: false, type: Number, default: 0,
  });
  game.settings.register("mazes", "gameSheetTab", {
    scope: "client", config: false, type: String, default: "core",
  });
  game.settings.register("mazes", "gameSheetPos", {
    scope: "client", config: false, type: Object, default: { left: 20, top: null, bottom: 60 },
  });
}

function getDarknessLabel(d) {
  if (d <= 3) return "BRIGHT";
  if (d <= 6) return "TORCHLIT";
  return "BLEAK";
}

function getDarknessComment(d) {
  if (d <= 3) return "Succeed on Crown. Advantage at Death's Door. Treasure affects party.";
  if (d <= 6) return "Negotiate on Crown. Treasure affects party.";
  return "Fail on Crown. Disadvantage on Death's Door. Treasure affects self.";
}

function getTreasureLabel(players, treasure) {
  if (treasure < players)      return "SKINT";
  if (treasure > players * 2)  return "ENCUMBERED";
  return "FLUSH";
}

function getTreasureComment(players, treasure) {
  const label = getTreasureLabel(players, treasure);
  return (label === "SKINT" || label === "ENCUMBERED") ? "Add Darkness." : "";
}

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class GameSheet extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id:       "mazes-game-sheet",
    classes:  ["mazes"],
    window:   { title: "Game Sheet", resizable: false, minimizable: true },
    position: { width: 210 },
  };

  static PARTS = {
    sheet: { template: "systems/mazes/templates/game-sheet.hbs" },
  };

  async _prepareContext(options) {
    const darkness    = game.settings.get("mazes", "darkness");
    const treasure    = game.settings.get("mazes", "treasure");
    const playerCount = game.settings.get("mazes", "playerCount");
    const supply      = game.settings.get("mazes", "supply");
    const artifacts   = game.settings.get("mazes", "artifacts");
    const isGM        = game.user.isGM;
    const activeTab   = game.settings.get("mazes", "gameSheetTab");

    return {
      darkness,
      darknessLabel:   getDarknessLabel(darkness),
      darknessComment: getDarknessComment(darkness),
      treasure,
      playerCount,
      treasureLabel:   getTreasureLabel(playerCount, treasure),
      treasureComment: getTreasureComment(playerCount, treasure),
      supply,
      artifacts,
      isGM,
      activeTab,
      isCore:   activeTab === "core",
      isBeyond: activeTab === "beyond",
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;
    if (!game.user.isGM) return;

    // Restore saved position
    const pos = game.settings.get("mazes", "gameSheetPos");
    if (pos.top !== null) {
      this.setPosition({ left: pos.left, top: pos.top });
    } else {
      this.setPosition({ left: pos.left ?? 20 });
    }

    // Tab buttons
    html.querySelectorAll(".gs-tab-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        await game.settings.set("mazes", "gameSheetTab", btn.dataset.tab);
        this.render(false);
      });
    });

    // Scroll to modify number inputs
    html.querySelectorAll(".gs-input").forEach(input => {
      input.addEventListener("wheel", async (e) => {
        e.preventDefault();
        const key     = input.dataset.setting;
        const delta   = e.deltaY < 0 ? 1 : -1;
        const min     = parseInt(input.dataset.min ?? 0);
        const current = game.settings.get("mazes", key);
        const next    = Math.max(min, current + delta);
        await this._setSetting(key, next);
      });
    });

    // Plus/minus buttons
    html.querySelectorAll(".gs-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const key     = btn.dataset.setting;
        const delta   = btn.dataset.dir === "up" ? 1 : -1;
        const min     = parseInt(btn.dataset.min ?? 0);
        const current = game.settings.get("mazes", key);
        const next    = Math.max(min, current + delta);
        await this._setSetting(key, next);
      });
    });

    // Manual input
    html.querySelectorAll(".gs-input").forEach(input => {
      input.addEventListener("change", async () => {
        const key  = input.dataset.setting;
        const min  = parseInt(input.dataset.min ?? 0);
        const next = Math.max(min, parseInt(input.value) || 0);
        await this._setSetting(key, next);
      });
    });
  }

  async _setSetting(key, value) {
    await game.settings.set("mazes", key, value);
    this.render(false);
  }

  // Prevent closing
  async close(options = {}) {
    return this;
  }

  // Save position on move
  _onPosition(position) {
    super._onPosition?.(position);
    game.settings.set("mazes", "gameSheetPos", {
      left:   position.left,
      top:    position.top,
      bottom: null,
    });
  }
}