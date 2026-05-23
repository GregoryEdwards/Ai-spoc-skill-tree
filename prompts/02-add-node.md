# Add a single skill node

I want to add one specific skill to my AI SPOC skill tree.

## The skill

{{skillDescription}}

## Which tier it belongs to

`{{tierId}}` — {{tierName}}

## Candidate prerequisites (pick the most relevant 1–3)

```
{{candidatePrereqIds}}
```

## Your task

Return **one** node object that captures this skill well. Be opinionated about:
- The most precise title (under 40 characters)
- A one-sentence summary in plain English
- Which 1–3 prerequisites are actually required (not "nice to have")
- 2–4 observable mastery criteria (things I can demonstrate, not feelings)
- XP value: 30–60 quick concept, 70–100 substantial skill, 150+ capstone

## Return format

Return **only** the JSON object. No prose, no markdown fences.

```json
{
  "id": "kebab-case-id",
  "tier": "{{tierId}}",
  "title": "...",
  "summary": "...",
  "whyItMatters": "...",
  "firstStep": "Specific action the reader can take today.",
  "prerequisites": ["..."],
  "xp": 60,
  "evidenceCriteria": ["...", "..."],
  "keyConcepts": ["term 1", "term 2", "term 3"],
  "commonPitfalls": ["specific failure mode 1", "specific failure mode 2"],
  "resources": [
    { "label": "...", "url": "https://..." },
    { "label": "Resource with no URL — only when you'd otherwise be guessing" }
  ]
}
```

Only include a URL when you are confident it exists. Otherwise use label-only entries.
