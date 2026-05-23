// Branching tree renderer: top-down SVG layout grouped by tier.
// Nodes within a tier are arranged in a row; prerequisites draw curved edges
// from the parent's bottom to the child's top.

const SVG_NS = "http://www.w3.org/2000/svg";

const NODE_W = 200;
const NODE_H = 70;
const NODE_GAP_X = 32;
const TIER_GAP_Y = 140;
const TIER_HEADER_OFFSET = 60;
const PADDING_X = 80;
const PADDING_Y = 60;

export function createTreeRenderer({ svg, skills, store, onNodeClick, getStatus, tooltipEl }) {
  let layout = null;
  let viewport = { x: 0, y: 0, scale: 1 };
  let selectedId = null;
  let searchQuery = "";
  let statusFilter = "all";

  const nodeById = (id) => skills.nodes.find((n) => n.id === id);

  function statusOf(nodeId) { return getStatus(nodeId); }

  function matchesFilter(node) {
    if (statusFilter !== "all" && statusOf(node.id) !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const hay = `${node.title} ${node.summary ?? ""} ${node.whyItMatters ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function computeLayout() {
    const tiers = [...skills.tiers].sort((a, b) => a.order - b.order);
    const nodesByTier = new Map(tiers.map((t) => [t.id, []]));
    for (const n of skills.nodes) {
      const list = nodesByTier.get(n.tier);
      if (list) list.push(n);
    }

    const positions = new Map();
    let maxRowWidth = 0;
    const tierY = new Map();

    tiers.forEach((tier, tierIdx) => {
      const nodes = nodesByTier.get(tier.id) ?? [];
      const rowWidth = nodes.length * NODE_W + Math.max(0, nodes.length - 1) * NODE_GAP_X;
      maxRowWidth = Math.max(maxRowWidth, rowWidth);
      const y = PADDING_Y + TIER_HEADER_OFFSET + tierIdx * (NODE_H + TIER_GAP_Y);
      tierY.set(tier.id, y);
    });

    const canvasWidth = maxRowWidth + PADDING_X * 2;

    tiers.forEach((tier) => {
      const nodes = nodesByTier.get(tier.id) ?? [];
      const rowWidth = nodes.length * NODE_W + Math.max(0, nodes.length - 1) * NODE_GAP_X;
      const startX = (canvasWidth - rowWidth) / 2;
      const y = tierY.get(tier.id);
      nodes.forEach((node, i) => {
        const x = startX + i * (NODE_W + NODE_GAP_X);
        positions.set(node.id, { x, y, node });
      });
    });

    const canvasHeight =
      PADDING_Y + TIER_HEADER_OFFSET + tiers.length * (NODE_H + TIER_GAP_Y) + PADDING_Y;

    return { positions, tiers, nodesByTier, tierY, canvasWidth, canvasHeight };
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function el(tag, attrs = {}, children = []) {
    const e = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined) continue;
      e.setAttribute(k, String(v));
    }
    for (const c of children) {
      if (c) e.appendChild(c);
    }
    return e;
  }

  function render() {
    layout = computeLayout();
    clear(svg);
    svg.setAttribute("viewBox", `0 0 ${layout.canvasWidth} ${layout.canvasHeight}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const root = el("g", { id: "tree-root" });
    svg.appendChild(root);

    // tier headers + dividers + per-tier progress counters
    for (const tier of layout.tiers) {
      const y = layout.tierY.get(tier.id);
      const tierNodes = layout.nodesByTier.get(tier.id) ?? [];
      const total = tierNodes.length;
      const totalXP = tierNodes.reduce((s, n) => s + (n.xp || 0), 0);
      const mastered = tierNodes.filter((n) => statusOf(n.id) === "mastered");
      const masteredXP = mastered.reduce((s, n) => s + (n.xp || 0), 0);
      const pct = total ? Math.round((mastered.length / total) * 100) : 0;

      root.appendChild(
        el("text", {
          x: PADDING_X,
          y: y - 20,
          class: "tier-label"
        }, [document.createTextNode(`${tier.name.toUpperCase()} — ${tier.subtitle.toUpperCase()}`)])
      );

      // progress counter at right
      const counterText = `${mastered.length}/${total} MASTERED · ${masteredXP}/${totalXP} XP`;
      root.appendChild(
        el("text", {
          x: layout.canvasWidth - PADDING_X,
          y: y - 20,
          class: "tier-counter",
          "text-anchor": "end"
        }, [document.createTextNode(counterText)])
      );

      // progress bar background
      const barX = PADDING_X;
      const barY = y - 12;
      const barW = layout.canvasWidth - PADDING_X * 2;
      const barH = 3;
      root.appendChild(
        el("rect", {
          x: barX, y: barY, width: barW, height: barH,
          class: "tier-bar-bg", rx: 1.5, ry: 1.5
        })
      );
      if (pct > 0) {
        root.appendChild(
          el("rect", {
            x: barX, y: barY, width: barW * (pct / 100), height: barH,
            class: `tier-bar-fill tier-bar-fill-${tier.id}`, rx: 1.5, ry: 1.5
          })
        );
      }
    }

    // edges first so they sit behind nodes
    const edgesGroup = el("g", { class: "edges" });
    root.appendChild(edgesGroup);
    const filterActive = statusFilter !== "all" || searchQuery !== "";
    const visibleIds = new Set(
      filterActive ? skills.nodes.filter(matchesFilter).map((n) => n.id) : skills.nodes.map((n) => n.id)
    );

    for (const node of skills.nodes) {
      const toPos = layout.positions.get(node.id);
      if (!toPos) continue;
      for (const prereqId of node.prerequisites ?? []) {
        const fromPos = layout.positions.get(prereqId);
        if (!fromPos) continue;
        const x1 = fromPos.x + NODE_W / 2;
        const y1 = fromPos.y + NODE_H;
        const x2 = toPos.x + NODE_W / 2;
        const y2 = toPos.y;
        const midY = (y1 + y2) / 2;
        const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
        const fromStatus = statusOf(prereqId);
        const toStatus = statusOf(node.id);
        let cls = "edge";
        if (fromStatus === "mastered") cls += " mastered";
        if (toStatus === "in-progress" || toStatus === "unlocked") cls += " active";
        if (filterActive && !(visibleIds.has(node.id) && visibleIds.has(prereqId))) cls += " filtered-out";
        edgesGroup.appendChild(el("path", { d, class: cls, "data-from": prereqId, "data-to": node.id }));
      }
    }

    // nodes
    const nodesGroup = el("g", { class: "nodes" });
    root.appendChild(nodesGroup);
    for (const node of skills.nodes) {
      const pos = layout.positions.get(node.id);
      if (!pos) continue;
      const status = statusOf(node.id);
      const tier = layout.tiers.find((t) => t.id === node.tier);
      const isFiltered = filterActive && !visibleIds.has(node.id);
      const group = el(
        "g",
        {
          class: `node ${status}${selectedId === node.id ? " selected" : ""}${isFiltered ? " filtered-out" : ""}`,
          transform: `translate(${pos.x}, ${pos.y})`,
          "data-id": node.id,
          "data-tier": node.tier
        },
        [
          el("rect", {
            class: "node-bg",
            width: NODE_W,
            height: NODE_H,
            rx: 10,
            ry: 10
          }),
          el("text", { class: "node-tier", x: 12, y: 18 }, [
            document.createTextNode(tier ? tier.name.toUpperCase() : node.tier.toUpperCase())
          ]),
          el("text", { class: "node-title", x: 12, y: 40 }, [
            document.createTextNode(truncate(node.title, 26))
          ]),
          el("text", { class: "node-xp", x: 12, y: 58 }, [
            document.createTextNode(`+${node.xp} XP`)
          ])
        ]
      );
      group.addEventListener("click", (ev) => {
        ev.stopPropagation();
        selectedId = node.id;
        render();
        onNodeClick?.(node);
      });
      group.addEventListener("mouseenter", (ev) => showTooltip(node, ev));
      group.addEventListener("mousemove", (ev) => positionTooltip(ev));
      group.addEventListener("mouseleave", hideTooltip);
      nodesGroup.appendChild(group);
    }

    applyViewport();
  }

  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  function showTooltip(node, ev) {
    if (!tooltipEl) return;
    const status = statusOf(node.id);
    const prereqs = node.prerequisites ?? [];
    // only worth showing the tooltip for locked nodes (the why-locked story)
    if (status !== "locked" || !prereqs.length) {
      tooltipEl.hidden = true;
      return;
    }
    tooltipEl.innerHTML = "";
    const title = document.createElement("div");
    title.className = "node-tooltip-title";
    title.textContent = node.title;
    const label = document.createElement("div");
    label.className = "node-tooltip-label";
    label.textContent = "Unlocks when mastered";
    const list = document.createElement("div");
    list.className = "node-tooltip-prereqs";
    for (const pid of prereqs) {
      const p = nodeById(pid);
      if (!p) continue;
      const met = statusOf(pid) === "mastered";
      const row = document.createElement("div");
      row.className = `node-tooltip-prereq ${met ? "met" : "unmet"}`;
      row.textContent = `${met ? "✓" : "○"}  ${p.title}`;
      list.appendChild(row);
    }
    tooltipEl.appendChild(title);
    tooltipEl.appendChild(label);
    tooltipEl.appendChild(list);
    tooltipEl.hidden = false;
    positionTooltip(ev);
  }

  function positionTooltip(ev) {
    if (!tooltipEl || tooltipEl.hidden) return;
    const wrap = svg.parentElement;
    if (!wrap) return;
    const wrapRect = wrap.getBoundingClientRect();
    const x = ev.clientX - wrapRect.left + 14;
    const y = ev.clientY - wrapRect.top + 14;
    const ttRect = tooltipEl.getBoundingClientRect();
    const maxX = wrapRect.width - ttRect.width - 8;
    const maxY = wrapRect.height - ttRect.height - 8;
    tooltipEl.style.left = `${Math.min(x, Math.max(0, maxX))}px`;
    tooltipEl.style.top = `${Math.min(y, Math.max(0, maxY))}px`;
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.hidden = true;
  }

  function applyViewport() {
    const root = svg.querySelector("#tree-root");
    if (!root) return;
    root.setAttribute(
      "transform",
      `translate(${viewport.x}, ${viewport.y}) scale(${viewport.scale})`
    );
  }

  function fit() {
    viewport = { x: 0, y: 0, scale: 1 };
    applyViewport();
  }

  function zoom(delta, cx, cy) {
    const nextScale = Math.max(0.4, Math.min(2.5, viewport.scale * delta));
    if (cx !== undefined && cy !== undefined) {
      const rect = svg.getBoundingClientRect();
      const svgPt = {
        x: ((cx - rect.left) / rect.width) * (layout?.canvasWidth ?? 1),
        y: ((cy - rect.top) / rect.height) * (layout?.canvasHeight ?? 1)
      };
      viewport.x = svgPt.x - (svgPt.x - viewport.x) * (nextScale / viewport.scale);
      viewport.y = svgPt.y - (svgPt.y - viewport.y) * (nextScale / viewport.scale);
    }
    viewport.scale = nextScale;
    applyViewport();
  }

  // panning
  let dragging = false;
  let dragStart = null;
  svg.addEventListener("mousedown", (ev) => {
    if (ev.target.closest(".node")) return;
    dragging = true;
    dragStart = { x: ev.clientX, y: ev.clientY, vx: viewport.x, vy: viewport.y };
    svg.classList.add("dragging");
  });
  window.addEventListener("mousemove", (ev) => {
    if (!dragging) return;
    const dx = ev.clientX - dragStart.x;
    const dy = ev.clientY - dragStart.y;
    const rect = svg.getBoundingClientRect();
    const scaleX = (layout?.canvasWidth ?? 1) / rect.width;
    const scaleY = (layout?.canvasHeight ?? 1) / rect.height;
    viewport.x = dragStart.vx + dx * scaleX;
    viewport.y = dragStart.vy + dy * scaleY;
    applyViewport();
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
    svg.classList.remove("dragging");
  });

  svg.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const delta = ev.deltaY < 0 ? 1.1 : 0.9;
    zoom(delta, ev.clientX, ev.clientY);
  }, { passive: false });

  return {
    render,
    fit,
    zoomIn: () => zoom(1.2),
    zoomOut: () => zoom(0.8),
    setSelected(id) { selectedId = id; render(); },
    setSearch(q) { searchQuery = q ?? ""; render(); },
    setStatusFilter(s) { statusFilter = s ?? "all"; render(); }
  };
}
