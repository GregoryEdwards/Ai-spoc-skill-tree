import { createStore } from "./store.js";
import { createTreeRenderer } from "./tree.js";
import { createNodePanel } from "./nodePanel.js";
import { createQuestEngine } from "./quests.js";
import { levelFromXP, progressWithinLevel } from "./leveling.js";
import { buildNodeCoachingPrompt } from "./prompts.js";

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function computeStatusFn(skills, store) {
  // A node is unlocked when all its prerequisites are mastered (no prereqs = unlocked).
  // Status priority: explicit save state wins, otherwise derived from prereqs.
  return function status(nodeId) {
    const saved = store.state.nodes[nodeId];
    if (saved?.status === "mastered") return "mastered";
    if (saved?.status === "in-progress") return "in-progress";
    const node = skills.nodes.find((n) => n.id === nodeId);
    if (!node) return "locked";
    const prereqs = node.prerequisites ?? [];
    if (prereqs.length === 0) return saved?.status === "unlocked" ? "unlocked" : "unlocked";
    const allMet = prereqs.every((pid) => status(pid) === "mastered");
    return allMet ? "unlocked" : "locked";
  };
}

async function main() {
  const [skills, quests] = await Promise.all([
    loadJSON("./data/skills.json"),
    loadJSON("./data/quests.json")
  ]);

  const store = createStore();
  const computeStatus = computeStatusFn(skills, store);

  // Recompute level whenever XP changes (driven by store updates).
  function syncLevel() {
    const lvl = levelFromXP(store.state.profile.totalXP);
    if (lvl !== store.state.profile.level) store.setLevel(lvl);
  }

  // Header UI
  const nameInput = document.getElementById("profile-name");
  const xpFill = document.getElementById("xp-fill");
  const xpText = document.getElementById("xp-text");
  const totalXP = document.getElementById("total-xp");
  const levelBadge = document.getElementById("level-badge");

  nameInput.value = store.state.profile.name;
  nameInput.addEventListener("input", (e) => store.setProfileName(e.target.value));

  const streakChip = document.getElementById("streak-chip");
  const streakDaysEl = document.getElementById("streak-days");

  function renderHeader() {
    const { totalXP: xp, level } = store.state.profile;
    const { intoLevel, span, percent } = progressWithinLevel(xp);
    xpFill.style.width = `${percent}%`;
    xpText.textContent = `${intoLevel} / ${span} XP`;
    totalXP.textContent = `${xp.toLocaleString()} XP total`;
    levelBadge.textContent = `Lv ${level}`;
    const streak = store.effectiveStreak();
    streakDaysEl.textContent = String(streak);
    streakChip.classList.toggle("alive", streak > 0);
  }

  // Tree
  const svg = document.getElementById("tree");
  const panelEl = document.getElementById("panel");

  const panel = createNodePanel({
    root: panelEl,
    skills,
    store,
    computeStatus,
    onChange: () => {
      syncLevel();
      renderAll();
    },
    showPrompt: async (node) => {
      const text = await buildNodeCoachingPrompt(node, store.getNode(node.id), skills);
      showPromptDialog(`Coaching prompt — ${node.title}`, text);
    }
  });

  const tree = createTreeRenderer({
    svg,
    skills,
    store,
    onNodeClick: (node) => panel.show(node.id),
    getStatus: computeStatus,
    tooltipEl: document.getElementById("node-tooltip")
  });

  function detectTierCompletions() {
    for (const tier of skills.tiers) {
      if (store.state.celebratedTiers.includes(tier.id)) continue;
      const tierNodes = skills.nodes.filter((n) => n.tier === tier.id);
      if (!tierNodes.length) continue;
      const allMastered = tierNodes.every((n) => computeStatus(n.id) === "mastered");
      if (allMastered) store.celebrateTier(tier);
    }
  }

  function renderAll() {
    detectTierCompletions();
    syncLevel();
    renderHeader();
    tree.render();
    if (panel.currentNodeId) panel.refresh();
    questEngine.render();
    maybeShowCelebration();
  }

  const questEngine = createQuestEngine({
    root: document.getElementById("quest-strip"),
    quests,
    store,
    onChange: () => {
      syncLevel();
      renderAll();
    }
  });

  store.subscribe(renderHeader);

  // Toolbar
  document.getElementById("btn-zoom-in").addEventListener("click", () => tree.zoomIn());
  document.getElementById("btn-zoom-out").addEventListener("click", () => tree.zoomOut());
  document.getElementById("btn-fit").addEventListener("click", () => tree.fit());

  const searchInput = document.getElementById("tree-search");
  const filterSelect = document.getElementById("tree-filter");
  searchInput.addEventListener("input", (e) => tree.setSearch(e.target.value.trim()));
  filterSelect.addEventListener("change", (e) => tree.setStatusFilter(e.target.value));

  // Save management
  document.getElementById("btn-export").addEventListener("click", () => {
    const blob = new Blob([store.exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `aispoc-save-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  const importFile = document.getElementById("import-file");
  document.getElementById("btn-import").addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      store.importJSON(text);
      nameInput.value = store.state.profile.name;
      renderAll();
    } catch (err) {
      alert(`Failed to import save: ${err.message}`);
    } finally {
      importFile.value = "";
    }
  });

  document.getElementById("btn-reset").addEventListener("click", () => {
    if (!confirm("Wipe all local progress? This cannot be undone (unless you exported first).")) return;
    store.reset();
    nameInput.value = "";
    renderAll();
  });

  // Prompt dialog
  const dialog = document.getElementById("prompt-dialog");
  const dialogTitle = document.getElementById("prompt-dialog-title");
  const dialogBody = document.getElementById("prompt-dialog-body");
  document.getElementById("prompt-close").addEventListener("click", () => dialog.close());
  document.getElementById("prompt-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(dialogBody.textContent);
      const btn = document.getElementById("prompt-copy");
      const orig = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = orig), 1200);
    } catch (e) {
      alert("Clipboard blocked — select the text and copy manually.");
    }
  });
  function showPromptDialog(title, body) {
    dialogTitle.textContent = title;
    dialogBody.textContent = body;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  // Tier-completion celebration
  const celebrationDialog = document.getElementById("celebration-dialog");
  const celebrationEyebrow = document.getElementById("celebration-eyebrow");
  const celebrationTitle = document.getElementById("celebration-title");
  const celebrationFlavor = document.getElementById("celebration-flavor");
  const celebrationXP = document.getElementById("celebration-xp");
  const celebrationGlow = celebrationDialog.querySelector(".celebration-glow");
  document.getElementById("celebration-close").addEventListener("click", () => {
    store.dismissCelebration();
    if (celebrationDialog.open) celebrationDialog.close();
    renderAll();
  });
  function maybeShowCelebration() {
    const c = store.state.pendingCelebration;
    if (!c || celebrationDialog.open) return;
    celebrationEyebrow.textContent = `${c.tierName.toUpperCase()} — ${c.subtitle.toUpperCase()} COMPLETE`;
    celebrationTitle.textContent = c.title;
    celebrationFlavor.textContent = c.flavor;
    celebrationXP.textContent = `+${c.bonusXP} XP`;
    celebrationGlow.setAttribute("data-tier", c.tierId);
    if (typeof celebrationDialog.showModal === "function") celebrationDialog.showModal();
    else celebrationDialog.setAttribute("open", "");
  }

  renderAll();
}

main().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<div style="padding:40px;color:#f87171;font-family:ui-sans-serif">
    <h2>Failed to start</h2>
    <p>${err.message}</p>
    <p>If you opened this file with <code>file://</code>, run a static server instead:<br/>
    <code>python3 -m http.server 8000</code> in the repo root, then visit
    <a href="http://localhost:8000" style="color:#6ee7ff">http://localhost:8000</a>.</p>
  </div>`;
});
