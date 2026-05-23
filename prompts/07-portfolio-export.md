# Generate a portfolio document

I'm using a skill-tree app to track my journey toward becoming an AI SPOC and eventually an AI CTO. I want to turn my progress into a polished portfolio document — something I can put in front of a hiring manager, an internal promotion committee, or a CTO-search panel.

Here's my full save state:

```json
{{saveJSON}}
```

## Your task

Generate a **markdown portfolio document** I can paste into LinkedIn, a personal site, or an internal promo packet. Structure:

```markdown
# {{name}} — AI Capability Profile

## Summary
[3 sentences: where I am on the path, what I can credibly do today, what I'm working toward. No fluff, no superlatives.]

## Demonstrated capabilities
[For each MASTERED skill: 2–3 lines.
- Skill title
- What it means in business terms (translate the jargon)
- Specific evidence I logged (paraphrase, don't list raw notes)]

## In flight
[For each IN-PROGRESS skill: one line each. What it is, when I expect to finish.]

## Sample artifacts
[Pull out 3–5 of my most impressive evidence-log items. Links if they're URLs.]

## What I'm building toward
[The next tier. Why it matters for the role I want. 3–4 sentences.]
```

Rules:
- Don't invent evidence. If a skill is mastered but has thin evidence, summarize it modestly.
- Translate technical skills into business value (e.g. "shipped a RAG app" → "built a system that let our team query our own documentation in plain English, saving an estimated X hours/week").
- Write in first person, professional but not stiff.
- No emoji, no exclamation points.
