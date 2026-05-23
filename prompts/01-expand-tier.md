# Expand a tier of the AI SPOC skill tree

You are helping me build a structured learning path to become an AI Single Point of Contact (SPOC), then eventually an AI CTO.

## Context

The skill tree has four tiers:
1. **AI Foundations** — understanding AI
2. **AI Practitioner** — using AI effectively
3. **AI Team Leader** — adopting AI across teams
4. **AI CTO** — leading AI at the company level

I want to expand the **{{tierName}}** tier (`{{tierId}}`) with new skill nodes.

## Existing nodes in this tier

```json
{{existingNodes}}
```

## All node IDs available as prerequisites

```
{{allNodeIds}}
```

## What I'm focused on right now

{{focus}}

## Your task

Propose **3 to 5 new skill nodes** that meaningfully expand this tier. They must:
- Fill genuine gaps (don't duplicate existing nodes)
- Reference real prerequisite IDs from the list above when appropriate
- Have observable, falsifiable mastery criteria (no "understand X deeply" — instead "can do X in front of a colleague")
- Stay focused on practical, demonstrable skills

## Return format

Return **only** a JSON array of node objects matching this schema. No prose, no markdown fences, no comments.

```json
[
  {
    "id": "kebab-case-id",
    "tier": "{{tierId}}",
    "title": "Short title (under 40 chars)",
    "summary": "One-sentence description, plain English, no jargon.",
    "prerequisites": ["existing-node-id-1", "existing-node-id-2"],
    "xp": 60,
    "evidenceCriteria": [
      "Observable behavior 1",
      "Observable behavior 2",
      "Observable behavior 3"
    ],
    "resources": [
      { "label": "Resource name", "url": "https://..." }
    ]
  }
]
```

XP guidance: 30–60 for quick concepts, 70–100 for substantial skills, 150+ for capstone-level work.
