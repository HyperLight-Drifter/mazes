const SCOPE = "mazes";

const groupOf = (combatant) =>
  combatant.getFlag(SCOPE, "group") ?? (combatant.actor?.type === "hazard" ? "hazard" : "character");

const resourceInput = (label, field, value, max, canEdit) => `
  <label class="mazes-resource">
    <span class="mazes-resource-label">${label}</span>
    <input type="text" inputmode="numeric" pattern="\\d*" class="mazes-resource-input"
           value="${value}" data-field="${field}" ${canEdit ? "" : "readonly"}>
    <span class="mazes-resource-max">/ ${max}</span>
  </label>`;

const resourceStatic = (label, value) => `
  <span class="mazes-resource">
    <span class="mazes-resource-label">${label}</span>
    <span>${value}</span>
  </span>`;

function makeGroup(key, label) {
  const el = document.createElement("div");
  el.className = "mazes-tracker-group";
  el.dataset.group = key;
  el.innerHTML = `<h4 class="mazes-tracker-group-label">${label}</h4><ol class="mazes-tracker-sublist"></ol>`;
  return el;
}

Hooks.on("renderCombatTracker", (app, html) => {
  const root = html instanceof HTMLElement ? html : html[0];
  const combat = app.viewed;
  if (!combat) return;

  const tracker = root.querySelector(".combat-tracker");
  if (!tracker) return;

  const rows = Array.from(tracker.querySelectorAll("li.combatant"));
  if (!rows.length) return;

  const groups = {
    character: makeGroup("character", "Characters"),
    hazard: makeGroup("hazard", "Hazards"),
  };

  const ignore = "button, input, a, .mazes-resource";

  for (const row of rows) {
    const combatant = combat.combatants.get(row.dataset.combatantId);
    if (!combatant) continue;

    row.querySelector('[data-action="pingCombatant"]')?.remove();

    // Grey out a combatant who has acted
    if (combatant.getFlag(SCOPE, "turnTaken")) row.classList.add("mazes-turn-taken");

    row.addEventListener("click", async (event) => {
      if (event.target.closest(ignore)) return;
      await combatant.setFlag(SCOPE, "turnTaken", true);
    });

    row.addEventListener("contextmenu", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.target.closest(ignore)) return;
      await combatant.setFlag(SCOPE, "turnTaken", false);
    });

    // Hearts / Stars (characters), Danger + Hearts (hazards)
    const actor = combatant.actor;
    if (actor) {
      const s = actor.system;
      const canEdit = actor.isOwner;
      let markup = "";

            if (actor.type === "character") {
        markup += resourceInput("Stars", "system.stars.value", s.stars.value, s.stars.max, canEdit);
        markup += resourceInput("Hearts", "system.hearts.value", s.hearts.value, s.hearts.max, canEdit);
      } else if (actor.type === "hazard") {
        markup += resourceStatic("Danger", s.danger);
        markup += resourceInput("Hearts", "system.hearts.value", s.hearts.value, s.hearts.max, canEdit);
      }

      const block = document.createElement("div");
      block.className = "mazes-resource-block";
      block.innerHTML = markup;

      block.querySelectorAll(".mazes-resource-input").forEach(input => {
        const size = () => { input.style.width = `${Math.max(2, input.value.length) + 1}ch`; };
        size();
        input.addEventListener("click", (event) => event.stopPropagation());
        input.addEventListener("input", size);

        input.addEventListener("change", async (event) => {
          const value = Math.max(0, Math.trunc(Number(event.target.value)));
          if (Number.isNaN(value)) return;
          await actor.update({ [event.target.dataset.field]: value });
        });

        input.addEventListener("wheel", async (event) => {
          if (input.readOnly) return;
          event.preventDefault();
          event.stopPropagation();

          const field = input.dataset.field;
          const current = Number(foundry.utils.getProperty(actor, field)) || 0;
          const next = Math.max(0, current + (event.deltaY < 0 ? 1 : -1));
          if (next === current) return;

          await actor.update({ [field]: next });
        }, { passive: false });
      });

      row.querySelector(".token-name")?.appendChild(block);
    }

    // Drag between sections
    row.setAttribute("draggable", "true");
    row.addEventListener("dragstart", (event) => {
      if (event.target.closest("button, input")) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.setData("text/plain", JSON.stringify({ mazesCombatantId: combatant.id }));
    });

    groups[groupOf(combatant)].querySelector("ol").appendChild(row);
  }

  for (const [key, groupEl] of Object.entries(groups)) {
    groupEl.addEventListener("dragover", (event) => event.preventDefault());
    groupEl.addEventListener("drop", async (event) => {
      event.preventDefault();
      let data;
      try {
        data = JSON.parse(event.dataTransfer.getData("text/plain"));
      } catch (e) {
        return;
      }
      if (!data?.mazesCombatantId) return;
      const dropped = combat.combatants.get(data.mazesCombatantId);
      if (!dropped) return;
      await dropped.setFlag(SCOPE, "group", key);
    });
  }

  tracker.innerHTML = "";
  tracker.append(groups.character, groups.hazard);
});