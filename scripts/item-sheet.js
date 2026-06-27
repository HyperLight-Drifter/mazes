const { ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

class MazesItemSheetBase extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["mazes", "sheet", "item"],
    position: { width: 420, height: 400 },
    window: { resizable: true },
    form:   { submitOnChange: true },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item   = this.item;
    context.system = this.item.system;
    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);    
    };
  }


export class MazesRoleSheet extends MazesItemSheetBase {
  static PARTS = { sheet: { template: "systems/mazes/templates/items/role.hbs" } };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const ROLE_STATS = {
      d4:  { hearts: 4,  stars: 4 },
      d6:  { hearts: 6,  stars: 3 },
      d8:  { hearts: 8,  stars: 2 },
      d10: { hearts: 10, stars: 1 },
    };
    const currentDie = this.item.system.die ?? "d6";
    const stats = ROLE_STATS[currentDie] ?? ROLE_STATS.d6;
    context.item.heartsDerived = stats.hearts;
    context.item.starsDerived  = stats.stars;
    context.dieOptions = ["d4", "d6", "d8", "d10"].map(d => ({
      value:    d,
      selected: d === currentDie,
    }));
    return context;
  }
}

export class MazesAspectSheet extends MazesItemSheetBase {
  static PARTS = { sheet: { template: "systems/mazes/templates/items/aspect.hbs" } };
}

export class MazesClassSheet extends MazesItemSheetBase {
  static PARTS = { sheet: { template: "systems/mazes/templates/items/class.hbs" } };
}

export class MazesEdgeSheet extends MazesItemSheetBase {
  static PARTS = { sheet: { template: "systems/mazes/templates/items/edge.hbs" } };
}

export class MazesCampaignActionSheet extends MazesItemSheetBase {
  static PARTS = { sheet: { template: "systems/mazes/templates/items/campaign-action.hbs" } };
}