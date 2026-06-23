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
    const html = this.element;
    html.querySelectorAll("textarea").forEach(ta => {
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
      ta.addEventListener("input", () => {
        ta.style.height = "auto";
        ta.style.height = ta.scrollHeight + "px";
      });
    });
  }
}

export class MazesRoleSheet extends MazesItemSheetBase {
  static PARTS = { sheet: { template: "systems/mazes/templates/items/role.hbs" } };
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
