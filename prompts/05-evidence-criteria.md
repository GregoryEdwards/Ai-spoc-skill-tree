# Sharpen the mastery criteria for a skill

I'm building a skill tree for AI SPOC career growth. I need brutal, falsifiable criteria for "mastered" so I can't lie to myself about progress.

## The skill

**{{nodeTitle}}**

> {{nodeSummary}}

## My current criteria (probably too soft)

{{currentCriteria}}

## Your task

Rewrite my mastery criteria so each one is:
- **Observable** — another person could verify it without asking me how I feel
- **Specific** — names a concrete artifact, action, or measurable outcome
- **Bounded** — has a number, a deliverable, or a time component
- **Hard enough that fooling myself would be obvious**

Bad: "Understand RAG deeply."
Good: "Shipped a RAG system over a 1000+ document corpus where the retrieval step is measurably better than keyword search on a 20-question eval set."

## Return format

Return **only** a JSON array of strings — the new criteria. 3–5 items. No prose, no markdown fences.

```json
[
  "Criterion 1 with specifics and numbers",
  "Criterion 2 with an observable artifact",
  "Criterion 3 with a verification method"
]
```
