import { attachItemDragHandlers } from "./drag-drop.js";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class MazesHazardSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["mazes", "sheet", "actor", "hazard"],
    position: { width: 600, height: 735 },
    window: { resizable: true },
    form:   { submitOnChange: true },
  };

  static PARTS = {
    sheet: { template: "systems/mazes/templates/actors/hazard.hbs" },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor  = this.actor;
    context.system = this.actor.system;

    const edges = this.actor.items.filter(i => i.type === "edge");
    context.edgesLeft  = edges.filter((_, i) => i % 2 === 0);
    context.edgesRight = edges.filter((_, i) => i % 2 !== 0);

    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;
    attachItemDragHandlers(this.actor, html);

    const body = html.querySelector(".mazes-body");
    if (body) {
      body.scrollTop = this._scrollTop ?? 0;
      body.addEventListener("scroll", () => { this._scrollTop = body.scrollTop; });
    }

    this._applyTab(html, this._activeTab ?? "sheet");
    html.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("mousedown", e => {
        e.preventDefault();
        this._activeTab = btn.dataset.tab;
        this._applyTab(html, this._activeTab);
      });
    });

    html.querySelector(".portrait")?.addEventListener("click", () => {
      new FilePicker({
        type: "image",
        current: this.actor.img,
        callback: path => this.actor.update({ img: path }),
      }).browse();
    });

    html.querySelectorAll(".item-entry").forEach(entry => {
      entry.querySelector(".fold-btn")?.addEventListener("click", () => {
        entry.classList.toggle("unfolded");
      });
    });

    html.querySelectorAll(".item-edit-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.actor.items.get(btn.dataset.itemId)?.sheet.render(true);
      });
    });

    html.querySelectorAll(".item-delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        await this.actor.deleteEmbeddedDocuments("Item", [btn.dataset.itemId]);
      });
    });

    html.querySelector(".edge-add-btn")?.addEventListener("click", async () => {
      const created = await this.actor.createEmbeddedDocuments("Item", [{ name: "New Edge", type: "edge" }]);
      if (created.length) created[0].sheet.render(true);
    });

    html.querySelectorAll(".drop-zone[data-type='edge']").forEach(zone => {
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
        if (!item || item.type !== "edge") return;
        await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
      });
    });

    html.querySelectorAll(".condition-cell[data-condition]").forEach(cell => {
      cell.addEventListener("click", async () => {
        const key = cell.dataset.condition;
        const current = this.actor.system.conditions[key];
        await this.actor.update({ [`system.conditions.${key}`]: !current });
      });
    });

    html.querySelector(".condition-wounded textarea")?.addEventListener("input", (e) => {
      e.target.closest(".condition-cell").classList.toggle("active", e.target.value.length > 0);
    });

    html.querySelectorAll(".condition-custom").forEach(cell => {
      cell.querySelector("textarea")?.addEventListener("input", (e) => {
        cell.classList.toggle("active", e.target.value.length > 0);
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