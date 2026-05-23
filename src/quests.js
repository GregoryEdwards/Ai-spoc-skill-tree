const ROTATE_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // weekly

export function createQuestEngine({ root, quests, store, onChange }) {
  function pickRandom(arr, n) {
    const pool = [...arr];
    const out = [];
    while (pool.length && out.length < n) {
      const i = Math.floor(Math.random() * pool.length);
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }

  function ensureRotation() {
    const s = store.state.quests;
    const now = Date.now();
    const last = s.lastRotatedAt ? new Date(s.lastRotatedAt).getTime() : 0;
    const expired = !s.lastRotatedAt || now - last > ROTATE_AFTER_MS;
    if (s.active.length === 0 || expired) {
      const picked = pickRandom(quests.quests, 3).map((q) => q.id);
      store.setActiveQuests(picked);
    }
  }

  function render() {
    ensureRotation();
    root.innerHTML = "";
    const active = store.state.quests.active;
    if (!active.length) {
      const empty = document.createElement("div");
      empty.className = "quest-empty";
      empty.textContent = "No active quests. Check back next week.";
      root.appendChild(empty);
      return;
    }
    for (const id of active) {
      const q = quests.quests.find((x) => x.id === id);
      if (!q) continue;
      const card = document.createElement("div");
      card.className = "quest-card";
      const title = document.createElement("div");
      title.className = "quest-title";
      title.textContent = q.title;
      const desc = document.createElement("div");
      desc.className = "quest-desc";
      desc.textContent = q.description;
      const foot = document.createElement("div");
      foot.className = "quest-foot";
      const xp = document.createElement("span");
      xp.className = "quest-xp";
      xp.textContent = `+${q.xp} XP`;
      const btn = document.createElement("button");
      btn.className = "btn primary";
      btn.textContent = "Complete";
      btn.addEventListener("click", () => {
        store.completeQuest(q.id, q.xp);
        onChange?.();
      });
      foot.appendChild(xp);
      foot.appendChild(btn);
      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(foot);
      root.appendChild(card);
    }

    const reroll = document.createElement("button");
    reroll.className = "btn ghost";
    reroll.style.alignSelf = "center";
    reroll.textContent = "↻ New quests";
    reroll.title = "Pick fresh quests (resets the weekly clock)";
    reroll.addEventListener("click", () => {
      const picked = pickRandom(quests.quests, 3).map((q) => q.id);
      store.setActiveQuests(picked);
      onChange?.();
    });
    root.appendChild(reroll);
  }

  return { render };
}
