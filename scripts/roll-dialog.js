const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

/**
 * MazesRollDialog
 *
 * Two modes:
 *   "mode"     – simple advantage / normal / disadvantage picker
 *   "campaign" – action (Books/Boots/Blades/Bones) + mode picker
 *
 * Usage:
 *   MazesRollDialog.promptMode(title, callback)
 *   MazesRollDialog.promptCampaign(title, callback)
 */
export class MazesRollDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["mazes", "mazes-roll-dialog"],
    window:  { resizable: false, minimizable: false },
    position: { width: 340, height: "auto" },
  };

  static PARTS = {
    dialog: { template: "systems/mazes/templates/roll-dialog.hbs" },
  };

  /** @param {object} opts */
  constructor(opts) {
    super({});
    this._title     = opts.title ?? "Roll";
    this._variant   = opts.variant ?? "mode";  // "mode" | "campaign"
    this._callback  = opts.callback;
    this._selection = { action: null, mode: null };
  }

  get title() { return this._title; }

  async _prepareContext(options) {
    return {
      isCampaign: this._variant === "campaign",
      selection:  this._selection,
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;

    // Action buttons (campaign only)
    html.querySelectorAll(".mrd-btn[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        html.querySelectorAll(".mrd-btn[data-action]").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        this._selection.action = btn.dataset.action;        
      });
    });

    // Mode buttons
    html.querySelectorAll(".mrd-btn[data-mode]").forEach(btn => {
      btn.addEventListener("click", () => {
        html.querySelectorAll(".mrd-btn[data-mode]").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        this._selection.mode = btn.dataset.mode;
        const { action, mode } = this._selection;
        if (this._variant === "campaign" && !action) return;
        this.close();
        if (this._variant === "campaign") {
        this._callback(action, mode);
        } else {
        this._callback(mode);
        }
      });
    });

    // Confirm
    html.querySelector(".mrd-confirm")?.addEventListener("click", () => {
      const { action, mode } = this._selection;
      if (!mode) return;
      if (this._variant === "campaign" && !action) return;
      this.close();
      if (this._variant === "campaign") {
        this._callback(action, mode);
      } else {
        this._callback(mode);
      }
    });

    // Cancel
    html.querySelector(".mrd-cancel")?.addEventListener("click", () => this.close());
  }

  // ── Static factory methods ───────────────────────────────────────────────

  /**
   * Show a simple mode-picker dialog (Advantage / Normal / Disadvantage).
   * @param {string}   title
   * @param {Function} callback  called with (mode: string)
   */
  static promptMode(title, callback) {
    new MazesRollDialog({ title, variant: "mode", callback }).render(true);
  }

  /**
   * Show a campaign action+mode picker dialog.
   * @param {string}   title
   * @param {Function} callback  called with (actionKey: string, mode: string)
   */
  static promptCampaign(title, callback) {
    new MazesRollDialog({ title, variant: "campaign", callback }).render(true);
  }
}