const SETTINGS = {
  darkness:    "darkness",
  treasure:    "treasure",
  playerCount: "playerCount",
  supply:      "supply",
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
  if (treasure < players) return "SKINT";
  if (treasure > players * 2) return "ENCUMBERED";
  return "FLUSH";
}

function getTreasureComment(players, treasure) {
  const label = getTreasureLabel(players, treasure);
  if (label === "SKINT" || label === "ENCUMBERED") return "Add Darkness.";
  return "";
}

export class GameSheet extends Application {
  static get defaultOptions() {
    const pos = game.settings.get("mazes", "gameSheetPos");
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:          "mazes-game-sheet",
      title:       "Game Sheet",
      template:    "systems/mazes/templates/game-sheet.hbs",
      popOut:      true,
      resizable:   false,
      minimizable: true,
      closable: false,
      width:  210,
      height: "auto",
      ...( pos.top !== null
        ? { top: pos.top,    left: pos.left }
        : { bottom: pos.bottom ?? 60, left: pos.left ?? 20 }
      ),
    });
  }

  getData() {
    const darkness    = game.settings.get("mazes", "darkness");
    const treasure    = game.settings.get("mazes", "treasure");
    const playerCount = game.settings.get("mazes", "playerCount");
    const supply      = game.settings.get("mazes", "supply");
    const isGM        = game.user.isGM;

    return {
      darkness,
      darknessLabel:   getDarknessLabel(darkness),
      darknessComment: getDarknessComment(darkness),
      treasure,
      playerCount,
      treasureLabel:   getTreasureLabel(playerCount, treasure),
      treasureComment: getTreasureComment(playerCount, treasure),
      supply,
      isGM,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!game.user.isGM) return;

    // Scroll to modify number inputs
    html.find(".gs-input").on("wheel", (e) => {
      e.preventDefault();
      const input = e.currentTarget;
      const key   = input.dataset.setting;
      const delta = e.originalEvent.deltaY < 0 ? 1 : -1;
      const min   = parseInt(input.dataset.min ?? 0);
      const current = game.settings.get("mazes", key);
      const next    = Math.max(min, current + delta);
      this._setSetting(key, next);
    });

    // Plus/minus buttons
    html.find(".gs-btn").on("click", (e) => {
      const btn   = e.currentTarget;
      const key   = btn.dataset.setting;
      const delta = btn.dataset.dir === "up" ? 1 : -1;
      const min   = parseInt(btn.dataset.min ?? 0);
      const current = game.settings.get("mazes", key);
      const next    = Math.max(min, current + delta);
      this._setSetting(key, next);
    });

    // Manual input
    html.find(".gs-input").on("change", (e) => {
      const input = e.currentTarget;
      const key   = input.dataset.setting;
      const min   = parseInt(input.dataset.min ?? 0);
      const next  = Math.max(min, parseInt(input.value) || 0);
      this._setSetting(key, next);
    });
  }

  async _setSetting(key, value) {
    await game.settings.set("mazes", key, value);
    this.render(false);
  }

  async close(options={}) {
  return this;
}

  setPosition(pos = {}) {
    const result = super.setPosition(pos);
    const el     = this.element[0];
    if (!el) return result;
    const saved = {
      left:   parseInt(el.style.left),
      top:    parseInt(el.style.top),
      bottom: null,
    };
    game.settings.set("mazes", "gameSheetPos", saved);
    return result;
  }
}