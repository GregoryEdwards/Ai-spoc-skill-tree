// Loads prompt templates from /prompts and exposes a builder that substitutes
// {{placeholders}} with values from a context object. Designed so the user can
// paste the output directly into Claude/ChatGPT to expand or refine the tree.

const PROMPT_FILES = {
  expandTier: "prompts/01-expand-tier.md",
  addNode: "prompts/02-add-node.md",
  refineNode: "prompts/03-refine-node.md",
  generateQuests: "prompts/04-generate-quests.md",
  evidenceCriteria: "prompts/05-evidence-criteria.md",
  weeklyCoach: "prompts/06-weekly-coach.md",
  portfolioExport: "prompts/07-portfolio-export.md"
};

const cache = new Map();

async function loadTemplate(key) {
  if (cache.has(key)) return cache.get(key);
  const path = PROMPT_FILES[key];
  if (!path) throw new Error(`Unknown prompt template: ${key}`);
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  const text = await res.text();
  cache.set(key, text);
  return text;
}

function substitute(template, context) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key in context) {
      const v = context[key];
      return typeof v === "string" ? v : JSON.stringify(v, null, 2);
    }
    return `{{${key}}}`;
  });
}

export async function buildPrompt(key, context = {}) {
  const tpl = await loadTemplate(key);
  return substitute(tpl, context);
}

// Convenience: build the "refine node" prompt given a node and the user's notes.
export async function buildNodeCoachingPrompt(node, savedNodeState, skills) {
  const evidenceText = (savedNodeState?.evidence ?? [])
    .map((e) => `- (${new Date(e.createdAt).toLocaleDateString()}) ${e.body}`)
    .join("\n") || "(none yet)";
  const status = savedNodeState?.status ?? "unlocked";
  const tier = skills.tiers.find((t) => t.id === node.tier);
  return buildPrompt("refineNode", {
    nodeTitle: node.title,
    nodeTier: `${tier?.name ?? node.tier} (${tier?.subtitle ?? ""})`,
    nodeSummary: node.summary,
    nodeStatus: status,
    nodeXP: node.xp,
    evidenceCriteria: (node.evidenceCriteria ?? []).map((c) => `- ${c}`).join("\n"),
    evidenceLog: evidenceText
  });
}
