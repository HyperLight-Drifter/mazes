// ── CONSTANTS ──────────────────────────────────────────────────────────────

export const ACTIONS = [
  { key: "books",  label: "BOOKS",  thresholds: [2, 3] },
  { key: "boots",  label: "BOOTS",  thresholds: [3, 4, 5] },
  { key: "blades", label: "BLADES", thresholds: [4, 5, 6, 7] },
  { key: "bones",  label: "BONES",  thresholds: [5, 6, 7, 8, 9] },
];

export const RECOVERY_ACTIONS = [
  { key: "effect",    label: "EFFECT",       type: "effect" },
  { key: "chaos",     label: "CHAOS",        type: "chaos" },
  {
    key: "healing",
    label: "HEALING",
    type: "recovery",
    results: [
      { min: 1, max: 1,        text: "Gasp! Knock on Death's Door." },
      { min: 2, max: 3,        text: "Wounded! Take Wounded. Clear Down. Fill your Hearts and Stars." },
      { min: 4, max: Infinity, text: "Stand! Clear Down. Fill your Hearts and Stars." },
    ],
  },
  {
    key: "deathdoor",
    label: "DEATH'S DOOR",
    type: "recovery",
    results: [
      { min: 1, max: 1,        text: "Die! Death takes you!" },
      { min: 2, max: 3,        text: "Shook! Take Marked. On your next turn, roll for Healing." },
      { min: 4, max: Infinity, text: "Stand! Take Marked. Clear Down. Fill your Hearts and Stars." },
    ],
  },
];

export const ROLE_STATS = {
  d4:  { hearts: 4,  stars: 4 },
  d6:  { hearts: 6,  stars: 3 },
  d8:  { hearts: 8,  stars: 2 },
  d10: { hearts: 10, stars: 1 },
};

// ── HELPERS ─────────────────────────────────────────────────────────────────

/** Roll one or two dice, returning { rollA, rollB, a, b }. rollB/b are null for normal mode. */
async function _rollDice(die, mode) {
  const rollA = new Roll(`1${die}`);
  await rollA.evaluate();
  const a = rollA.total;

  if (mode === "normal") return { rollA, rollB: null, a, b: null };

  const rollB = new Roll(`1${die}`);
  await rollB.evaluate();
  const b = rollB.total;

  return { rollA, rollB, a, b };
}

/** Pick advantage/disadvantage/normal result, returning { chosen, other }. */
function _pickResult(a, b, mode, preferCrown = false) {
  if (b === null) return { chosen: a, other: null };

  if (preferCrown) {
    // Supply Test: Crown is bad — disadvantage avoids it when possible
    const maxVal = Math.max(a, b);
    if (mode === "advantage") {
      // avoid Crown (highest); but for supply we want the non-Crown
      // Caller handles this specifically; fall through to standard logic
    }
  }

  if (mode === "advantage") {
    return a >= b ? { chosen: a, other: b } : { chosen: b, other: a };
  } else {
    return a <= b ? { chosen: a, other: b } : { chosen: b, other: a };
  }
}

function _modeLabel(mode) {
  return mode === "advantage" ? "ADVANTAGE" : mode === "disadvantage" ? "DISADVANTAGE" : "NORMAL";
}

function _diceDisplay(chosen, other) {
  return other !== null
    ? `${chosen} <span class="roll-dice-dim">${other}</span>`
    : `${chosen}`;
}

async function _sendChat(actor, content, rolls) {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls,
    sound: CONFIG.sounds.dice,
  });
}

function _chatHtml(lines) {
  const inner = lines
    .filter(Boolean)
    .map(([cls, text]) => `<p class="${cls}">${text}</p>`)
    .join("\n");
  return `<div class="mazes-roll-chat">\n${inner}\n</div>`;
}

// ── EVALUATE FUNCTIONS ───────────────────────────────────────────────────────

/** Standard action roll evaluation: success / key / crown / failure */
function _evaluateAction(result, thresholds, max) {
  if (thresholds.includes(result)) return "success";
  if (result === 1)   return "key";
  if (result === max) return "crown";
  return "failure";
}

const _evLabel = ev =>
  ev === "success" ? "SUCCESS" : ev === "key" ? "KEY" : ev === "crown" ? "CROWN" : "FAILURE";

/** Full advantage/disadvantage resolution for action rolls. */
function _resolveAction(evA, evB, mode) {
  const label = _evLabel;

  if (mode === "normal") {
    return label(evA);
  }

  if (mode === "advantage") {
    const aS = evA === "success", bS = evB === "success";
    if (aS && bS)     return "CRITICAL";
    if (aS || bS) {
      const other = aS ? evB : evA;
      return (other === "key" || other === "crown") ? `SUCCESS · ${label(other)}` : "SUCCESS";
    }
    return `${label(evA)} · ${label(evB)}`;
  }

  // disadvantage
  const aS = evA === "success", bS = evB === "success";
  if (aS && bS)       return "SUCCESS";
  if (!aS && !bS)     return (evA === "failure" && evB === "failure") ? "FUMBLE" : `${label(evA)} · ${label(evB)}`;
  const other = aS ? evB : evA;
  return (other === "key" || other === "crown") ? `FAILURE · ${label(other)}` : "FAILURE";
}

// ── ROLL FUNCTIONS ───────────────────────────────────────────────────────────

/**
 * Standard action roll (Books / Boots / Blades / Bones).
 * @param {Actor}  actor
 * @param {object} action  – one entry from ACTIONS
 * @param {string} die     – "d4" | "d6" | "d8" | "d10"
 * @param {string} mode    – "normal" | "advantage" | "disadvantage"
 */
export async function rollAction(actor, action, die, mode) {
  const max  = parseInt(die.slice(1));
  const { rollA, rollB, a, b } = await _rollDice(die, mode);

  const evA = _evaluateAction(a, action.thresholds, max);
  const evB = b !== null ? _evaluateAction(b, action.thresholds, max) : null;
  const resolution = _resolveAction(evA, evB, mode);

  const content = _chatHtml([
    ["roll-action",     action.label],
    ["roll-mode",       `1${die}, ${_modeLabel(mode)}`],
    ["roll-dice",       b !== null ? `${a} · ${b}` : `${a}`],
    ["roll-resolution", resolution],
  ]);

  await _sendChat(actor, content, rollB ? [rollA, rollB] : [rollA]);
}

/**
 * Chaos roll: even = SUCCESS, odd = FAILURE. Uses advantage/disadvantage selection.
 */
export async function rollChaos(actor, die, mode) {
  const { rollA, rollB, a, b } = await _rollDice(die, mode);
  const { chosen, other }      = _pickResult(a, b, mode);
  const resolution             = chosen % 2 === 0 ? "SUCCESS" : "FAILURE";

  const content = _chatHtml([
    ["roll-action",     "CHAOS"],
    ["roll-mode",       `1${die}, ${_modeLabel(mode)}`],
    ["roll-dice",       _diceDisplay(chosen, other)],
    ["roll-resolution", resolution],
  ]);

  await _sendChat(actor, content, rollB ? [rollA, rollB] : [rollA]);
}

/**
 * Effect roll: exploding die (re-roll on max), total is the effect value.
 */
export async function rollEffect(actor, die, mode) {
  const max = parseInt(die.slice(1));

  const _explode = async () => {
    const rolls = [];
    let total = 0, current = max;
    while (current === max) {
      const r = new Roll(`1${die}`);
      await r.evaluate();
      rolls.push(r);
      current = r.total;
      total  += current;
    }
    return { total, rolls };
  };

  const resA = await _explode();
  const resB = mode !== "normal" ? await _explode() : null;

  let chosen, other;
  if (!resB) {
    chosen = resA.total; other = null;
  } else if (mode === "advantage") {
    chosen = resA.total >= resB.total ? resA.total : resB.total;
    other  = resA.total >= resB.total ? resB.total : resA.total;
  } else {
    chosen = resA.total <= resB.total ? resA.total : resB.total;
    other  = resA.total <= resB.total ? resB.total : resA.total;
  }

  const content = _chatHtml([
    ["roll-action", "EFFECT"],
    ["roll-mode",   `1${die}, ${_modeLabel(mode)}`],
    ["roll-dice",   _diceDisplay(chosen, other)],
  ]);

  await _sendChat(actor, content, [...resA.rolls, ...(resB?.rolls ?? [])]);
}

/**
 * Recovery roll (Healing / Death's Door). Picks from action.results table.
 */
export async function rollRecovery(actor, action, die, mode) {
  const { rollA, rollB, a, b } = await _rollDice(die, mode);
  const { chosen, other }      = _pickResult(a, b, mode);

  const entry    = action.results.find(r => chosen >= r.min && chosen <= r.max);
  const fullText = entry?.text ?? "";
  const splitAt  = fullText.indexOf(" ", fullText.indexOf("!"));
  const title    = splitAt !== -1 ? fullText.slice(0, splitAt) : fullText;
  const body     = splitAt !== -1 ? fullText.slice(splitAt + 1) : "";

  const content = _chatHtml([
    ["roll-action",           action.label],
    ["roll-mode",             `1${die}, ${_modeLabel(mode)}`],
    ["roll-dice",             _diceDisplay(chosen, other)],
    ["roll-resolution-title", title],
    body ? ["roll-resolution-body", body] : null,
  ]);

  await _sendChat(actor, content, rollB ? [rollA, rollB] : [rollA]);
}

/**
 * Supply Test. Crown depletes a Supply; all results clear HUNGRY.
 * Advantage avoids the Crown; Disadvantage seeks it.
 */
export async function rollSupplyTest(actor, die, mode) {
  const max = parseInt(die.slice(1));
  const { rollA, rollB, a, b } = await _rollDice(die, mode);

  // Crown (max) is the bad result — invert standard pick logic
  let chosen, other;
  if (b === null) {
    chosen = a; other = null;
  } else if (mode === "advantage") {
    // Prefer non-Crown
    const aCrown = a === max, bCrown = b === max;
    if (aCrown && !bCrown) { chosen = b; other = a; }
    else                   { chosen = a; other = b; }
  } else {
    // Disadvantage: prefer Crown
    const aCrown = a === max, bCrown = b === max;
    if (!aCrown && bCrown) { chosen = b; other = a; }
    else                   { chosen = a; other = b; }
  }

  const crown      = chosen === max;
  const resolution = crown
    ? "A Supply was depleted. Clear HUNGRY."
    : "You rationed your Supplies. Clear HUNGRY.";

  const content = _chatHtml([
    ["roll-action",     "SUPPLY TEST"],
    ["roll-mode",       `1${die}, ${_modeLabel(mode)}`],
    ["roll-dice",       _diceDisplay(chosen, other)],
    ["roll-resolution", resolution],
  ]);

  await _sendChat(actor, content, rollB ? [rollA, rollB] : [rollA]);
}

/**
 * Campaign action roll. Pops a dialog to select action + mode, then resolves.
 */
export async function rollCampaignAction(actor, item) {
  const role = actor.items.find(i => i.type === "role");
  const die  = role?.system?.die ?? "d6";
  const max  = parseInt(die.slice(1));

  const actionDefs = Object.fromEntries(ACTIONS.map(a => [a.key, a]));

  // Show the combined dialog (action + mode selection)
  return new Promise(resolve => {
    const { MazesRollDialog } = foundry.applications?.api
      ? { MazesRollDialog: null }   // replaced below
      : {};

    // Import lazily to avoid circular deps — the dialog module imports nothing from rolls
    import("./roll-dialog.js").then(({ MazesRollDialog }) => {
      MazesRollDialog.promptCampaign(item.name, async (actionKey, mode) => {
        const action     = actionDefs[actionKey];
        const thresholds = action.thresholds;

        const { rollA, rollB, a, b } = await _rollDice(die, mode);
        const evA = _evaluateAction(a, thresholds, max);
        const evB = b !== null ? _evaluateAction(b, thresholds, max) : null;
        const resolution = _resolveAction(evA, evB, mode);

        const content = _chatHtml([
          ["roll-action",     `${item.name} — ${action.label}`],
          ["roll-mode",       `1${die}, ${_modeLabel(mode)}`],
          ["roll-dice",       b !== null ? `${a} · ${b}` : `${a}`],
          ["roll-resolution", resolution],
        ]);

        await _sendChat(actor, content, rollB ? [rollA, rollB] : [rollA]);
        resolve();
      });
    });
  });
}

/**
 * Drive die roll (no mode selection — straight single roll).
 */
export async function rollDrive(actor, die) {
  const roll = new Roll(`1${die}`);
  await roll.evaluate();

  const content = _chatHtml([
    ["roll-action", "DRIVE DIE"],
    ["roll-mode",   `1${die}`],
    ["roll-dice",   `${roll.total}`],
  ]);

  await _sendChat(actor, content, [roll]);
}