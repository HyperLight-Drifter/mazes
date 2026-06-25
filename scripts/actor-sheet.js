import { attachItemDragHandlers } from "./drag-drop.js";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

const ACTIONS = [
  { key: "books",  label: "BOOKS",  thresholds: [2, 3] },
  { key: "boots",  label: "BOOTS",  thresholds: [3, 4, 5] },
  { key: "blades", label: "BLADES", thresholds: [4, 5, 6, 7] },
  { key: "bones",  label: "BONES",  thresholds: [5, 6, 7, 8, 9] },  
];

const RECOVERY_ACTIONS = [
  {
    key: "effect",   label: "EFFECT",      type: "effect" },
  { key: "chaos",    label: "CHAOS",       type: "chaos" },
  {
    key: "healing",
    label: "HEALING",
    type: "recovery",
    results: [
      { min: 1,  max: 1,  text: "Gasp! Knock on Death's Door." },
      { min: 2,  max: 3,  text: "Wounded! Take Wounded. Clear Down. Fill your Hearts and Stars." },
      { min: 4,  max: Infinity, text: "Stand! Clear Down. Fill your Hearts and Stars." },
    ],
  },
  {
    key: "deathdoor",
    label: "DEATH'S DOOR",
    type: "recovery",
    results: [
      { min: 1,  max: 1,  text: "Die! Death takes you!" },
      { min: 2,  max: 3,  text: "Shook! Take Marked. On your next turn, roll for Healing." },
      { min: 4,  max: Infinity, text: "Stand! Take Marked. Clear Down. Fill your Hearts and Stars." },
    ],
  },
];

const ROLE_STATS = {
  d4:  { hearts: 4,  stars: 4 },
  d6:  { hearts: 6,  stars: 3 },
  d8:  { hearts: 8,  stars: 2 },
  d10: { hearts: 10, stars: 1 },
};

export class MazesCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["mazes", "sheet", "actor", "character"],
    position: { width: 600, height: 735 },
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

    // Action roll buttons
const allActions = [...ACTIONS, ...RECOVERY_ACTIONS];
html.querySelectorAll(".action-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const key    = btn.dataset.action;
    const action = allActions.find(a => a.key === key);
    if (!action) return;

    const role = this.actor.items.find(i => i.type === "role");
    const die  = role?.system?.die ?? "d6";
    const max  = parseInt(die.slice(1));

    // ── CHAOS ──
    if (action.type === "chaos") {
      const roll = new Roll(`1${die}`);
      await roll.evaluate();
      const result     = roll.total;
      const resolution = result % 2 === 0 ? "SUCCESS" : "FAILURE";
      const content = `
        <div class="mazes-roll-chat">
          <p class="roll-action">CHAOS</p>
          <p class="roll-mode">1${die}</p>
          <p class="roll-dice">${result}</p>
          <p class="roll-resolution">${resolution}</p>
        </div>
      `;
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content,
        rolls: [roll],
        sound: CONFIG.sounds.dice,
      });
      return;
    }

    // ── EFFECT ──
    if (action.type === "effect") {
      new Dialog({
        title: "EFFECT",
        content: `<p style="font-family:'Ruslan Display',serif; font-size:18px; text-transform:uppercase; text-align:center; margin:8px 0;">Choose roll mode</p>`,
        buttons: {
          advantage:    { label: "Advantage",    callback: () => _doEffect("advantage") },
          normal:       { label: "Normal",       callback: () => _doEffect("normal") },
          disadvantage: { label: "Disadvantage", callback: () => _doEffect("disadvantage") },
        },
      }).render(true);

      const _explode = async () => {
        const allRolls = [];
        let total = 0;
        let current = max;
        while (current === max) {
          const r = new Roll(`1${die}`);
          await r.evaluate();
          allRolls.push(r);
          current = r.total;
          total += current;
        }
        return { total, rolls: allRolls };
      };

      const _doEffect = async (mode) => {
        const resA = await _explode();
        let resB = null;
        if (mode !== "normal") resB = await _explode();

        let chosen, other;
        if (mode === "normal") {
          chosen = resA.total; other = null;
        } else if (mode === "advantage") {
          if (resA.total >= resB.total) { chosen = resA.total; other = resB.total; }
          else                          { chosen = resB.total; other = resA.total; }
        } else {
          if (resA.total <= resB.total) { chosen = resA.total; other = resB.total; }
          else                          { chosen = resB.total; other = resA.total; }
        }

        const modeLabel   = mode === "advantage" ? "ADVANTAGE" : mode === "disadvantage" ? "DISADVANTAGE" : "NORMAL";
        const diceDisplay = other !== null
          ? `${chosen} <span class="roll-dice-dim">${other}</span>`
          : `${chosen}`;

        const content = `
          <div class="mazes-roll-chat">
            <p class="roll-action">EFFECT</p>
            <p class="roll-mode">1${die}, ${modeLabel}</p>
            <p class="roll-dice">${diceDisplay}</p>
          </div>
        `;

        const rolls = [...resA.rolls, ...(resB?.rolls ?? [])];
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content,
          rolls,
          sound: CONFIG.sounds.dice,
        });
      };

      return;
    }

    // ── RECOVERY ROLLS (Healing, Death's Door) ──
    if (action.type === "recovery") {
      new Dialog({
        title: action.label,
        content: `<p style="font-family:'Ruslan Display',serif; font-size:18px; text-transform:uppercase; text-align:center; margin:8px 0;">Choose roll mode</p>`,
        buttons: {
          advantage:    { label: "Advantage",    callback: () => _doRecovery("advantage") },
          normal:       { label: "Normal",       callback: () => _doRecovery("normal") },
          disadvantage: { label: "Disadvantage", callback: () => _doRecovery("disadvantage") },
        },
      }).render(true);

      const _doRecovery = async (mode) => {
        const rollA = new Roll(`1${die}`);
        await rollA.evaluate();
        const a = rollA.total;

        let rollB = null;
        let b = null;
        if (mode !== "normal") {
          rollB = new Roll(`1${die}`);
          await rollB.evaluate();
          b = rollB.total;
        }

        let chosen, other;
        if (mode === "normal") {
          chosen = a; other = null;
        } else if (mode === "advantage") {
          if (a >= b) { chosen = a; other = b; }
          else        { chosen = b; other = a; }
        } else {
          if (a <= b) { chosen = a; other = b; }
          else        { chosen = b; other = a; }
        }

        const entry      = action.results.find(r => chosen >= r.min && chosen <= r.max);
        const fullText   = entry?.text ?? "";
        const splitAt    = fullText.indexOf(" ", fullText.indexOf("!"));
        const titlePart  = splitAt !== -1 ? fullText.slice(0, splitAt) : fullText;
        const bodyPart   = splitAt !== -1 ? fullText.slice(splitAt + 1) : "";

        const modeLabel   = mode === "advantage" ? "ADVANTAGE" : mode === "disadvantage" ? "DISADVANTAGE" : "NORMAL";
        const diceDisplay = other !== null
          ? `${chosen} <span class="roll-dice-dim">${other}</span>`
          : `${chosen}`;

        const content = `
          <div class="mazes-roll-chat">
            <p class="roll-action">${action.label}</p>
            <p class="roll-mode">1${die}, ${modeLabel}</p>
            <p class="roll-dice">${diceDisplay}</p>
            <p class="roll-resolution-title">${titlePart}</p>
            ${bodyPart ? `<p class="roll-resolution-body">${bodyPart}</p>` : ""}
          </div>
        `;

        const rolls = rollB ? [rollA, rollB] : [rollA];
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content,
          rolls,
          sound: CONFIG.sounds.dice,
        });
      };

      return;
    }

    // ── ACTION ROLLS (Books, Boots, Blades, Bones) ──
    new Dialog({
      title: action.label,
      content: `<p style="font-family:'Ruslan Display',serif; font-size:18px; text-transform:uppercase; text-align:center; margin:8px 0;">Choose roll mode</p>`,
      buttons: {
        advantage:    { label: "Advantage",    callback: () => _doRoll("advantage") },
        normal:       { label: "Normal",       callback: () => _doRoll("normal") },
        disadvantage: { label: "Disadvantage", callback: () => _doRoll("disadvantage") },
      },
    }).render(true);

    const _evaluate = (result) => {
      if (action.thresholds.includes(result)) return "success";
      if (result === 1)   return "key";
      if (result === max) return "crown";
      return "failure";
    };

    const _doRoll = async (mode) => {
      const rollA = new Roll(`1${die}`);
      await rollA.evaluate();
      const a = rollA.total;

      let rollB = null;
      let b = null;
      if (mode !== "normal") {
        rollB = new Roll(`1${die}`);
        await rollB.evaluate();
        b = rollB.total;
      }

      const evA = _evaluate(a);
      const evB = b !== null ? _evaluate(b) : null;

      const _tags = (...evals) => {
        const tags = [];
        if (evals.includes("key"))   tags.push("KEY");
        if (evals.includes("crown")) tags.push("CROWN");
        return tags;
      };

      let resolution;
      let tags = [];

      if (mode === "normal") {
        if      (evA === "success") { resolution = "SUCCESS"; tags = []; }
        else if (evA === "key")     { resolution = "FAILURE"; tags = ["KEY"]; }
        else if (evA === "crown")   { resolution = "FAILURE"; tags = ["CROWN"]; }
        else                        { resolution = "FAILURE"; tags = []; }

      } else if (mode === "advantage") {
        const aSuccess = evA === "success";
        const bSuccess = evB === "success";
        if (aSuccess && bSuccess) {
          resolution = "CRITICAL"; tags = [];
        } else if (aSuccess || bSuccess) {
          resolution = "SUCCESS";
          tags = _tags(aSuccess ? evB : evA);
        } else {
          resolution = "FAILURE";
          tags = _tags(evA, evB);
        }

      } else {
        const aSuccess = evA === "success";
        const bSuccess = evB === "success";
        if (aSuccess && bSuccess) {
          resolution = "SUCCESS"; tags = [];
        } else if (!aSuccess && !bSuccess) {
          resolution = "FUMBLE";
          tags = _tags(evA, evB);
        } else {
          resolution = "FAILURE";
          tags = _tags(aSuccess ? evB : evA);
        }
      }

      const modeLabel   = mode === "advantage" ? "ADVANTAGE" : mode === "disadvantage" ? "DISADVANTAGE" : "NORMAL";
      const diceDisplay = b !== null ? `${a} · ${b}` : `${a}`;
      const tagLine     = tags.length ? ` + ${tags.join(" + ")}` : "";

      const content = `
        <div class="mazes-roll-chat">
          <p class="roll-action">${action.label}</p>
          <p class="roll-mode">1${die}, ${modeLabel}</p>
          <p class="roll-dice">${diceDisplay}</p>
          <p class="roll-resolution">${resolution}${tagLine}</p>
        </div>
      `;

      const rolls = rollB ? [rollA, rollB] : [rollA];
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content,
        rolls,
        sound: CONFIG.sounds.dice,
      });
    };
  });
});

    // Condition toggles (boolean conditions)
    html.querySelectorAll(".condition-cell[data-condition]").forEach(cell => {
      cell.addEventListener("click", async () => {
        const key = cell.dataset.condition;
        const current = this.actor.system.conditions[key];
        await this.actor.update({ [`system.conditions.${key}`]: !current });
      });
    });

    // Wounded - active state driven by text content
    html.querySelector(".condition-wounded textarea")?.addEventListener("input", (e) => {
      e.target.closest(".condition-cell").classList.toggle("active", e.target.value.length > 0);
    });

    // Custom conditions - active state driven by text content
    html.querySelectorAll(".condition-custom").forEach(cell => {
      cell.querySelector("textarea")?.addEventListener("input", (e) => {
        cell.classList.toggle("active", e.target.value.length > 0);
      });
    });

     // Milestone add
    html.querySelector(".milestone-add-btn")?.addEventListener("click", async () => {
      const milestones = foundry.utils.deepClone(this.actor.system.milestones ?? []);
      milestones.push({ text: "", checked: false });
      await this.actor.update({ "system.milestones": milestones });
    });

    // Milestone check toggle
    html.querySelectorAll(".milestone-check-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const idx        = parseInt(btn.dataset.index);
        const milestones = foundry.utils.deepClone(this.actor.system.milestones ?? []);
        milestones[idx].checked = !milestones[idx].checked;
        await this.actor.update({ "system.milestones": milestones });
      });
    });

    // Milestone delete
    html.querySelectorAll(".milestone-delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const idx        = parseInt(btn.dataset.index);
        const milestones = foundry.utils.deepClone(this.actor.system.milestones ?? []);
        milestones.splice(idx, 1);
        await this.actor.update({ "system.milestones": milestones });
      });
    });

    // Milestone text change
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


