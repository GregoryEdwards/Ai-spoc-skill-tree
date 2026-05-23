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

export function createTreeRenderer({ svg, skills, store, onNodeClick, getStatus }) {
  let layout = null;
  let viewport = { x: 0, y: 0, scale: 1 };
  let selectedId = null;

  function statusOf(nodeId) { return getStatus(nodeId); }

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

    // tier headers + dividers
    for (const tier of layout.tiers) {
      const y = layout.tierY.get(tier.id);
      root.appendChild(
        el("text", {
          x: PADDING_X,
          y: y - 20,
          class: "tier-label"
        }, [document.createTextNode(`${tier.name.toUpperCase()} — ${tier.subtitle.toUpperCase()}`)])
      );
      root.appendChild(
        el("line", {
          x1: PADDING_X,
          y1: y - 10,
          x2: layout.canvasWidth - PADDING_X,
          y2: y - 10,
          class: "tier-divider"
        })
      );
    }

    // edges first so they sit behind nodes
    const edgesGroup = el("g", { class: "edges" });
    root.appendChild(edgesGroup);
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
      const group = el(
        "g",
        {
          class: `node ${status}${selectedId === node.id ? " selected" : ""}`,
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
      nodesGroup.appendChild(group);
    }

    applyViewport();
  }

  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

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
    setSelected(id) { selectedId = id; render(); }
  };
}
