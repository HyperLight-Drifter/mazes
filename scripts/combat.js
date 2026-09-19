export class MazesCombat extends Combat {
  _sortCombatants(a, b) {
    const groupA = a.getFlag("mazes", "group") ?? (a.actor?.type === "hazard" ? "hazard" : "character");
    const groupB = b.getFlag("mazes", "group") ?? (b.actor?.type === "hazard" ? "hazard" : "character");

    if (groupA !== groupB) {
      return groupA === "character" ? -1 : 1;
    }
    return (a.name ?? "").localeCompare(b.name ?? "");
  }
}

// New round: ungrey everyone
Hooks.on("updateCombat", async (combat, changed) => {
  if (!game.user.isGM) return;
  if (!("round" in changed)) return;

  const updates = combat.combatants
    .filter(c => c.getFlag("mazes", "turnTaken"))
    .map(c => ({ _id: c.id, "flags.mazes.turnTaken": false }));

  if (updates.length) await combat.updateEmbeddedDocuments("Combatant", updates);
});