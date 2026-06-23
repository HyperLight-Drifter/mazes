import { MazesActor, actorDataModels } from "./actor.js";
import { MazesCharacterSheet } from "./actor-sheet.js";
import { MazesItem, itemDataModels } from "./item.js";
import { MazesRoleSheet, MazesAspectSheet, MazesClassSheet, MazesEdgeSheet } from "./item-sheet.js";

Hooks.once("init", () => {
  console.log("Mazes | Initialising Mazes");

  CONFIG.Actor.documentClass = MazesActor;
  CONFIG.Actor.dataModels    = actorDataModels;

  CONFIG.Actor.trackableAttributes = {
    character: {
      bar:   ["hearts", "stars"],
      value: ["gears", "lore", "wealth"],
    },
    hazard: {
      bar:   ["hearts"],
      value: [],
    },
  };

  CONFIG.Item.documentClass = MazesItem;
  CONFIG.Item.dataModels    = itemDataModels;

  Handlebars.registerHelper("eq",   (a, b) => a === b);
  Handlebars.registerHelper("join", (arr, sep) => Array.isArray(arr) ? arr.join(sep ?? ", ") : "");

  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("mazes", MazesCharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "Mazes Character Sheet",
  });
  foundry.documents.collections.Actors.registerSheet("mazes", MazesHazardSheet, {
    types: ["hazard"],
    makeDefault: true,
    label: "Mazes Hazard Sheet",
  });

  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet("mazes", MazesRoleSheet, {
    types: ["role"],
    makeDefault: true,
    label: "Mazes Role Sheet",
  });
  foundry.documents.collections.Items.registerSheet("mazes", MazesAspectSheet, {
    types: ["aspect"],
    makeDefault: true,
    label: "Mazes Aspect Sheet",
  });
  foundry.documents.collections.Items.registerSheet("mazes", MazesClassSheet, {
    types: ["class"],
    makeDefault: true,
    label: "Mazes Class Sheet",
  });
  foundry.documents.collections.Items.registerSheet("mazes", MazesEdgeSheet, {
    types: ["edge"],
    makeDefault: true,
    label: "Mazes Edge Sheet",
  });
});

Hooks.on("preCreateActor", (document, data) => {
  if (data.name && data.name !== "New Actor") return;
  document.updateSource({ name: game.i18n.localize(`TYPES.Actor.${document.type}`) });
});

Hooks.on("preCreateItem", (document, data) => {
  if (data.name && data.name !== "New Item") return;
  document.updateSource({ name: game.i18n.localize(`TYPES.Item.${document.type}`) });
});
