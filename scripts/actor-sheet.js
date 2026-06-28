import { attachItemDragHandlers } from "./drag-drop.js";
import {
  ACTIONS,
  RECOVERY_ACTIONS,
  ROLE_STATS,
  rollAction,
  rollChaos,
  rollEffect,
  rollRecovery,
  rollSupplyTest,
  rollCampaignAction,
  rollDrive,
} from "./rolls.js";
import { MazesRollDialog } from "./roll-dialog.js";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class MazesCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["mazes", "sheet", "actor", "character"],
    position: { width: 600, height: 770 },
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
    context.recoveryActions = RECOVERY_ACTIONS;
    context.role    = this.actor.items.find(i => i.type === "role")   ?? null;
    context.aspect  = this.actor.items.find(i => i.type === "aspect") ?? null;
    context.cls     = this.actor.items.find(i => i.type === "class")  ?? null;
    context.edges   = this.actor.items.filter(i => i.type === "edge");
    context.hexcrawlActions = this.actor.items.filter(i => i.type === "campaignAction" && i.system.slot === "hexcrawl");
    context.downtimeActions = this.actor.items.filter(i => i.type === "campaignAction" && i.system.slot === "downtime");
    context.companyDieOptions = ["d4", "d6", "d8", "d10"].map(d => ({
      value:    d,
      selected: d === (this.actor.system.companyDie ?? "d6"),
    }));
    return context;
  }

  async _onDropItem(event, data) {
    const item = await fromUuid(data.uuid);
    if (!item) return;

    // Campaign actions are handled by the column drop zones
    if (item.type === "campaignAction") return;

    // Single-slot types: remove existing first
    if (["role", "aspect", "class"].includes(item.type)) {
      const existing = this.actor.items.filter(i => i.type === item.type).map(i => i.id);
      if (existing.length) await this.actor.deleteEmbeddedDocuments("Item", existing);
    }

    const created = await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);

    // Role drop: sync hearts/stars
    if (item.type === "role" && created.length) {
      const roleItem = this.actor.items.get(created[0].id);
      if (roleItem) {
        const stats = ROLE_STATS[roleItem.system.die] ?? ROLE_STATS.d6;
        await this.actor.update({
          "system.hearts.max":   stats.hearts,
          "system.hearts.value": stats.hearts,
          "system.stars.max":    stats.stars,
          "system.stars.value":  stats.stars,
        });
      }
    }
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;
    attachItemDragHandlers(this.actor, html);

    // ── Scroll persistence ──────────────────────────────────────────────────
    const body = html.querySelector(".mazes-body");
    if (body) {
      body.scrollTop = this._scrollTop ?? 0;
      body.addEventListener("scroll", () => { this._scrollTop = body.scrollTop; });
    }

    // ── Tab switching ───────────────────────────────────────────────────────
    this._applyTab(html, this._activeTab ?? "sheet");
    html.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("mousedown", e => {
        e.preventDefault();
        this._activeTab = btn.dataset.tab;
        this._applyTab(html, this._activeTab);
      });
    });

    // ── Portrait click ──────────────────────────────────────────────────────
    html.querySelector(".portrait")?.addEventListener("click", () => {
      new FilePicker({
        type: "image",
        current: this.actor.img,
        callback: path => this.actor.update({ img: path }),
      }).browse();
    });

    // ── Fold toggles ────────────────────────────────────────────────────────
    html.querySelectorAll(".item-entry").forEach(entry => {
      entry.querySelector(".fold-btn")?.addEventListener("click", () => {
        entry.classList.toggle("unfolded");
      });
    });

    // ── Item edit / delete ──────────────────────────────────────────────────
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

    // ── Section add buttons ─────────────────────────────────────────────────
    html.querySelectorAll(".section-add-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const type = btn.dataset.type;
        if (!type) return;
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

    // ── Edge add ───────────────────────────────────────────────────────────
    html.querySelector(".edge-add-btn")?.addEventListener("click", async () => {
      const created = await this.actor.createEmbeddedDocuments("Item", [{ name: "New Edge", type: "edge" }]);
      if (created.length) created[0].sheet.render(true);
    });

    // ── Drop zones (role / aspect / class / edge) ───────────────────────────
    html.querySelectorAll(".drop-zone:not(.campaign-drop-zone)").forEach(zone => {
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

        // Role drop: sync hearts/stars max from role die
        if (type === "role" && created.length) {
          const roleItem = this.actor.items.get(created[0].id);
          if (roleItem) {
            const stats = ROLE_STATS[roleItem.system.die] ?? ROLE_STATS.d6;
            await this.actor.update({
              "system.hearts.max":   stats.hearts,
              "system.hearts.value": stats.hearts,
              "system.stars.max":    stats.stars,
              "system.stars.value":  stats.stars,
            });
          }
        }
      });
    });

    // ── Action roll buttons ─────────────────────────────────────────────────
    const allActions = [...ACTIONS, ...RECOVERY_ACTIONS];

    html.querySelectorAll(".action-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const key    = btn.dataset.action;
        const action = allActions.find(a => a.key === key);
        if (!action) return;

        const role = this.actor.items.find(i => i.type === "role");
        const die  = role?.system?.die ?? "d6";

        // Chaos
        if (action.type === "chaos") {
          MazesRollDialog.promptMode("CHAOS", mode => rollChaos(this.actor, die, mode));
          return;
        }

        // Effect
        if (action.type === "effect") {
          MazesRollDialog.promptMode("EFFECT", mode => rollEffect(this.actor, die, mode));
          return;
        }

        // Recovery (Healing / Death's Door)
        if (action.type === "recovery") {
          MazesRollDialog.promptMode(action.label, mode => rollRecovery(this.actor, action, die, mode));
          return;
        }

        // Standard action (Books / Boots / Blades / Bones)
        MazesRollDialog.promptMode(action.label, mode => rollAction(this.actor, action, die, mode));
      });
    });

    // ── Condition toggles ───────────────────────────────────────────────────
    html.querySelectorAll(".condition-cell[data-condition]").forEach(cell => {
      cell.addEventListener("click", async () => {
        const key     = cell.dataset.condition;
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

    // ── Supply Test ─────────────────────────────────────────────────────────
    html.querySelector(".supply-test-btn")?.addEventListener("click", () => {
      const role = this.actor.items.find(i => i.type === "role");
      const die  = role?.system?.die ?? "d6";
      MazesRollDialog.promptMode("SUPPLY TEST", mode => rollSupplyTest(this.actor, die, mode));
    });

    // ── Drive die roll ──────────────────────────────────────────────────────
    html.querySelector(".drive-roll-btn")?.addEventListener("click", () => {
      const die = this.actor.system.companyDie ?? "d6";
      rollDrive(this.actor, die);
    });

    // ── Campaign action roll buttons ────────────────────────────────────────
    html.querySelectorAll(".campaign-action-roll-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const item = this.actor.items.get(btn.dataset.itemId);
        if (!item) return;
        rollCampaignAction(this.actor, item);
      });
    });

    // ── Campaign drop zones ─────────────────────────────────────────────────
    html.querySelectorAll(".campaign-drop-zone").forEach(zone => {
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
        if (!item || item.type !== "campaignAction") return;
        const slot     = zone.dataset.slot;
        const itemData = item.toObject();
        itemData.system.slot = slot;
        await this.actor.createEmbeddedDocuments("Item", [itemData]);
      });
    });

    // ── Campaign action edit / delete ───────────────────────────────────────
    html.querySelectorAll(".campaign-action-edit-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.actor.items.get(btn.dataset.itemId)?.sheet.render(true);
      });
    });

    html.querySelectorAll(".campaign-action-delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        await this.actor.deleteEmbeddedDocuments("Item", [btn.dataset.itemId]);
      });
    });

    // ── Milestones ──────────────────────────────────────────────────────────
    html.querySelector(".milestone-add-btn")?.addEventListener("click", async () => {
      const milestones = foundry.utils.deepClone(this.actor.system.milestones ?? []);
      milestones.push({ text: "", checked: false });
      await this.actor.update({ "system.milestones": milestones });
    });

    html.querySelectorAll(".milestone-check-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const idx        = parseInt(btn.dataset.index);
        const milestones = foundry.utils.deepClone(this.actor.system.milestones ?? []);
        milestones[idx].checked = !milestones[idx].checked;
        await this.actor.update({ "system.milestones": milestones });
      });
    });

    html.querySelectorAll(".milestone-delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const idx        = parseInt(btn.dataset.index);
        const milestones = foundry.utils.deepClone(this.actor.system.milestones ?? []);
        milestones.splice(idx, 1);
        await this.actor.update({ "system.milestones": milestones });
      });
    });

    html.querySelectorAll(".milestone-textarea").forEach(textarea => {
      textarea.addEventListener("change", async (e) => {
        const idx        = parseInt(textarea.dataset.index);
        const milestones = foundry.utils.deepClone(this.actor.system.milestones ?? []);
        milestones[idx].text = e.target.value;
        await this.actor.update({ "system.milestones": milestones });
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