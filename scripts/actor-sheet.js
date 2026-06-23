import { attachItemDragHandlers } from "./drag-drop.js";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

const ACTIONS = [
  { key: "books",  label: "BOOKS",  thresholds: [2, 3] },
  { key: "boots",  label: "BOOTS",  thresholds: [3, 4, 5] },
  { key: "blades", label: "BLADES", thresholds: [4, 5, 6, 7] },
  { key: "bones",  label: "BONES",  thresholds: [5, 6, 7, 8, 9] },
  { key: "effect", label: "EFFECT", thresholds: [] },
  { key: "chaos",  label: "CHAOS",  thresholds: [] },
];

export class MazesCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["mazes", "sheet", "actor", "character"],
    position: { width: 720, height: 620 },
    window: { resizable: true },
    form:   { submitOnChange: true },
  };

  static PARTS = {
    sheet: { template: "systems/mazes/templates/actors/character.hbs" },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor   = this.actor;
    context.system  = this.actor.system;
    context.actions = ACTIONS;
    context.role    = this.actor.items.find(i => i.type === "role")   ?? null;
    context.aspect  = this.actor.items.find(i => i.type === "aspect") ?? null;
    context.cls     = this.actor.items.find(i => i.type === "class")  ?? null;
    context.edges   = this.actor.items.filter(i => i.type === "edge");
    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;
    attachItemDragHandlers(this.actor, html);

    // Scroll persistence
    const body = html.querySelector(".mazes-body");
    if (body) {
      body.scrollTop = this._scrollTop ?? 0;
      body.addEventListener("scroll", () => { this._scrollTop = body.scrollTop; });
    }

    // Tab switching — default to "sheet"
    this._applyTab(html, this._activeTab ?? "sheet");
    html.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("mousedown", e => {
        e.preventDefault();
        this._activeTab = btn.dataset.tab;
        this._applyTab(html, this._activeTab);
      });
    });

    // Portrait click
    html.querySelector(".portrait")?.addEventListener("click", () => {
      new FilePicker({
        type: "image",
        current: this.actor.img,
        callback: path => this.actor.update({ img: path }),
      }).browse();
    });

    // Fold toggles
    html.querySelectorAll(".item-entry").forEach(entry => {
      entry.querySelector(".fold-btn")?.addEventListener("click", () => {
        entry.classList.toggle("unfolded");
      });
    });

    // Edit buttons
    html.querySelectorAll(".item-edit-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.actor.items.get(btn.dataset.itemId)?.sheet.render(true);
      });
    });

    // Delete buttons
    html.querySelectorAll(".item-delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        await this.actor.deleteEmbeddedDocuments("Item", [btn.dataset.itemId]);
      });
    });

    // Section add buttons (create blank item and open sheet)
    html.querySelectorAll(".section-add-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const type = btn.dataset.type;
        // Single-slot types: remove existing first
        if (["role", "aspect", "class"].includes(type)) {
          const existing = this.actor.items.filter(i => i.type === type).map(i => i.id);
          if (existing.length) await this.actor.deleteEmbeddedDocuments("Item", existing);
        }
        const created = await this.actor.createEmbeddedDocuments("Item", [{
          name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          type,
        }]);
        if (created.length) created[0].sheet.render(true);
      });
    });

    // Edge add button
    html.querySelector(".edge-add-btn")?.addEventListener("click", async () => {
      const created = await this.actor.createEmbeddedDocuments("Item", [{ name: "New Edge", type: "edge" }]);
      if (created.length) created[0].sheet.render(true);
    });

    // Drop zones
    html.querySelectorAll(".drop-zone").forEach(zone => {
      const type = zone.dataset.type;
      zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("dragover"); });
      zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
      zone.addEventListener("drop", async e => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove("dragover");
        let data;
        try { data = JSON.parse(e.dataTransfer.getData("text/plain")); } catch { return; }
        if (data.type !== "Item") return;
        const item = await fromUuid(data.uuid);
        if (!item || item.type !== type) return;

        if (["role", "aspect", "class"].includes(type)) {
          const existing = this.actor.items.filter(i => i.type === type).map(i => i.id);
          if (existing.length) await this.actor.deleteEmbeddedDocuments("Item", existing);
        }

        const created = await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);

        // Role drop: set hearts/stars max and current
        if (type === "role" && created.length) {
          const roleItem = this.actor.items.get(created[0].id);
          if (roleItem) {
            await this.actor.update({
              "system.hearts.max":   roleItem.system.heartsMax,
              "system.hearts.value": roleItem.system.heartsMax,
              "system.stars.max":    roleItem.system.starsMax,
              "system.stars.value":  roleItem.system.starsMax,
            });
          }
        }
      });
    });

    // Action roll buttons
    html.querySelectorAll(".action-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const key    = btn.dataset.action;
        const action = ACTIONS.find(a => a.key === key);
        if (!action) return;

        const role = this.actor.items.find(i => i.type === "role");
        const die  = role?.system?.die ?? "d6";

        const roll = new Roll(`1${die}`);
        await roll.evaluate();
        const diceHtml = await roll.render();

        const content = `
          <div class="mazes-roll-chat">
            <p class="roll-label-text">${action.label}${action.thresholds.length ? " — " + action.thresholds.join(", ") : ""}</p>
            ${diceHtml}
          </div>
        `;
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content,
          rolls: [roll],
          sound: CONFIG.sounds.dice,
        });
      });
    });
  }

  _applyTab(html, tab) {
    html.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    html.querySelectorAll(".tab-content").forEach(c => c.classList.toggle("active", c.dataset.tab === tab));
  }

  _onResize(event) {
    const { left, top } = this.position;
    super._onResize(event);
    this.setPosition({ left, top, width: this.position.width });
  }
}
