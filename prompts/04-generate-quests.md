# Generate weekly quests

I'm building my AI SPOC skills. I want a fresh set of weekly quests tailored to where I am right now.

## My current state

In-progress skills:
{{inProgressSkills}}

Recently mastered skills:
{{recentlyMastered}}

Next skills I could unlock:
{{nextUnlocks}}

## Your task

Generate **5 weekly quest candidates** that nudge me forward. Each quest must:
- Be completable in one week with ~3–5 hours of work (not "build a startup")
- Reference my actual in-progress or about-to-unlock skills (no generic "learn more AI")
- Be observable: a teammate would be able to tell I completed it
- Mix categories: learning, building, teaching, evaluating, networking

## Return format

Return **only** a JSON array of quest objects. No prose, no markdown fences.

```json
[
  {
    "id": "kebab-case-id",
    "title": "Short imperative title",
    "description": "Specific, observable, 1–2 sentences.",
    "xp": 75,
    "category": "learn|build|teach|evaluate|network|lead"
  }
]
```

XP guidance: 40–60 small, 75 medium, 100+ ambitious-but-still-weekly.
