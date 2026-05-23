export function createNodePanel({ root, skills, store, computeStatus, onChange, showPrompt }) {
  let currentNodeId = null;

  function nodeById(id) { return skills.nodes.find((n) => n.id === id); }
  function tierById(id) { return skills.tiers.find((t) => t.id === id); }

  function isURL(s) {
    return /^https?:\/\//i.test(String(s).trim());
  }

  function render() {
    root.innerHTML = "";
    if (!currentNodeId) {
      root.classList.add("empty");
      const empty = document.createElement("div");
      empty.className = "panel-empty";
      empty.textContent = "Click a skill to view details.";
      root.appendChild(empty);
      return;
    }
    root.classList.remove("empty");

    const node = nodeById(currentNodeId);
    if (!node) return;
    const tier = tierById(node.tier);
    const status = computeStatus(node.id);
    const saved = store.getNode(node.id);

    // Header
    const tierLabel = document.createElement("div");
    tierLabel.className = "panel-tier";
    tierLabel.textContent = `${tier?.name ?? node.tier} — ${tier?.subtitle ?? ""}`;
    root.appendChild(tierLabel);

    const title = document.createElement("h2");
    title.textContent = node.title;
    root.appendChild(title);

    const statusRow = document.createElement("div");
    const statusBadge = document.createElement("span");
    statusBadge.className = `panel-status ${status}`;
    statusBadge.textContent = status.replace("-", " ");
    statusRow.appendChild(statusBadge);
    const xpSpan = document.createElement("span");
    xpSpan.style.marginLeft = "10px";
    xpSpan.style.color = "var(--gold)";
    xpSpan.style.fontSize = "12px";
    xpSpan.textContent = `+${node.xp} XP`;
    statusRow.appendChild(xpSpan);
    root.appendChild(statusRow);

    const summary = document.createElement("p");
    summary.className = "panel-summary";
    summary.textContent = node.summary;
    root.appendChild(summary);

    // Prerequisites
    if (node.prerequisites && node.prerequisites.length) {
      const prereqSection = section("Prerequisites");
      const list = document.createElement("div");
      list.className = "prereqs";
      for (const pid of node.prerequisites) {
        const p = nodeById(pid);
        if (!p) continue;
        const met = computeStatus(pid) === "mastered";
        const row = document.createElement("div");
        row.className = `prereq ${met ? "met" : ""}`;
        const name = document.createElement("span");
        name.textContent = p.title;
        const check = document.createElement("span");
        check.className = met ? "prereq-check" : "prereq-x";
        check.textContent = met ? "✓ mastered" : "○ not yet";
        row.appendChild(name);
        row.appendChild(check);
        list.appendChild(row);
      }
      prereqSection.appendChild(list);
      root.appendChild(prereqSection);
    }

    // Evidence criteria
    if (node.evidenceCriteria && node.evidenceCriteria.length) {
      const sec = section("Mastery criteria");
      const ul = document.createElement("ul");
      ul.className = "criteria";
      for (const c of node.evidenceCriteria) {
        const li = document.createElement("li");
        li.textContent = c;
        ul.appendChild(li);
      }
      sec.appendChild(ul);
      root.appendChild(sec);
    }

    // Resources
    if (node.resources && node.resources.length) {
      const sec = section("Resources");
      const ul = document.createElement("ul");
      ul.className = "resources";
      for (const r of node.resources) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = r.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = `↗ ${r.label}`;
        li.appendChild(a);
        ul.appendChild(li);
      }
      sec.appendChild(ul);
      root.appendChild(sec);
    }

    // Evidence log
    const evidenceSec = section("Evidence log");
    const evList = document.createElement("ul");
    evList.className = "evidence-list";
    for (const entry of saved.evidence ?? []) {
      const li = document.createElement("li");
      li.className = "evidence-item";
      const body = document.createElement("div");
      body.className = "evidence-body";
      if (isURL(entry.body)) {
        const a = document.createElement("a");
        a.href = entry.body;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = entry.body;
        body.appendChild(a);
      } else {
        body.textContent = entry.body;
      }
      const meta = document.createElement("span");
      meta.className = "evidence-meta";
      meta.textContent = new Date(entry.createdAt).toLocaleDateString();
      const del = document.createElement("button");
      del.className = "evidence-del";
      del.textContent = "×";
      del.title = "Remove";
      del.addEventListener("click", () => {
        store.removeEvidence(node.id, entry.id);
        onChange?.();
      });
      li.appendChild(body);
      li.appendChild(meta);
      li.appendChild(del);
      evList.appendChild(li);
    }
    evidenceSec.appendChild(evList);

    if (status !== "locked") {
      const form = document.createElement("form");
      form.className = "evidence-form";
      const input = document.createElement("input");
      input.className = "evidence-input";
      input.type = "text";
      input.placeholder = "Add a note or link…";
      const addBtn = document.createElement("button");
      addBtn.type = "submit";
      addBtn.className = "btn primary";
      addBtn.textContent = "Add";
      form.appendChild(input);
      form.appendChild(addBtn);
      form.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const value = input.value.trim();
        if (!value) return;
        store.addEvidence(node.id, {
          type: isURL(value) ? "link" : "note",
          body: value
        });
        input.value = "";
        onChange?.();
      });
      evidenceSec.appendChild(form);
    }

    root.appendChild(evidenceSec);

    // Action buttons
    const actions = document.createElement("div");
    actions.className = "panel-actions";

    if (status === "unlocked") {
      const btn = document.createElement("button");
      btn.className = "btn primary";
      btn.textContent = "Start learning";
      btn.addEventListener("click", () => {
        store.setNodeStatus(node.id, "in-progress");
        onChange?.();
      });
      actions.appendChild(btn);
    }
    if (status === "in-progress") {
      const btn = document.createElement("button");
      btn.className = "btn primary";
      btn.textContent = `Mark mastered (+${node.xp} XP)`;
      btn.addEventListener("click", () => {
        store.setNodeStatus(node.id, "mastered");
        store.addXP(node.xp);
        onChange?.();
      });
      actions.appendChild(btn);

      const reset = document.createElement("button");
      reset.className = "btn ghost";
      reset.textContent = "Back to unlocked";
      reset.addEventListener("click", () => {
        store.setNodeStatus(node.id, "unlocked");
        onChange?.();
      });
      actions.appendChild(reset);
    }
    if (status === "mastered") {
      const btn = document.createElement("button");
      btn.className = "btn ghost";
      btn.textContent = "Revert to in progress";
      btn.addEventListener("click", () => {
        store.setNodeStatus(node.id, "in-progress");
        store.addXP(-node.xp);
        onChange?.();
      });
      actions.appendChild(btn);
    }

    const refineBtn = document.createElement("button");
    refineBtn.className = "btn ghost";
    refineBtn.textContent = "✦ Get a coaching prompt";
    refineBtn.title = "Copy a prompt to paste into Claude/ChatGPT to refine this skill";
    refineBtn.addEventListener("click", () => showPrompt?.(node));
    actions.appendChild(refineBtn);

    root.appendChild(actions);
  }

  function section(titleText) {
    const wrap = document.createElement("div");
    wrap.className = "panel-section";
    const t = document.createElement("div");
    t.className = "panel-section-title";
    t.textContent = titleText;
    wrap.appendChild(t);
    return wrap;
  }

  return {
    show(nodeId) { currentNodeId = nodeId; render(); },
    refresh() { render(); },
    get currentNodeId() { return currentNodeId; }
  };
}
