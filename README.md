# AI SPOC — Skill Tree

A desktop-style game that tracks your career journey from AI-curious to AI CTO. Browse a branching skill tree, earn XP, log evidence of mastery, complete weekly quests, and use a built-in library of LLM prompts to expand the curriculum as you grow.

No build step. No backend. No frameworks. Just static HTML/CSS/JS — open it in a browser and play.

## Run it

```bash
# from the repo root
python3 -m http.server 8000
# then open http://localhost:8000
```

> Why a server and not just double-click `index.html`? The app loads `data/skills.json` and the prompt templates via `fetch()`, which most browsers block from `file://` URLs. Any static server works (`npx serve`, `php -S`, etc).

### Optional: make it a real desktop app

Wrap the same files in [Tauri](https://tauri.app) when you want a `.app` / `.exe`. The static files don't need to change.

## How it works

- **Skill tree** — `data/skills.json` defines 38 seeded skills across 4 tiers: AI Foundations → AI Practitioner → AI Team Leader → AI CTO. Each skill has prerequisites; later skills unlock as you master earlier ones.
- **Status per skill** — `locked` → `unlocked` → `in-progress` → `mastered`. Mastering awards XP.
- **XP & levels** — Total XP drives your level; the bar in the header shows progress to the next level.
- **Evidence log** — Per skill, attach notes or links proving you've actually demonstrated the skill. This becomes your portfolio.
- **Weekly quests** — Three rotating quests in the header strip. Complete for bonus XP. Auto-rotates weekly; manual reroll available.
- **Save data** — Lives in `localStorage` under the key `aispoc.save.v1`. Use **Export** to download as JSON (commit it to git for backup); **Import** to restore.

## File layout

```
index.html               # app shell
style.css                # dark game-y theme
src/
  app.js                 # boot, wires modules together
  store.js               # state + localStorage + import/export
  tree.js                # SVG branching-tree renderer
  nodePanel.js           # right-side skill detail panel
  quests.js              # weekly quest engine
  leveling.js            # XP curve / level math
  prompts.js             # loads prompt templates, substitutes placeholders
data/
  skills.json            # the seeded skill tree
  quests.json            # the quest pool
prompts/
  01-expand-tier.md      # add new skills to a tier
  02-add-node.md         # add one specific skill
  03-refine-node.md      # coaching prompt for an individual skill
  04-generate-quests.md  # generate weekly quests
  05-evidence-criteria.md  # sharpen "mastered" criteria
  06-weekly-coach.md     # Monday-morning briefing from save state
  07-portfolio-export.md # turn your save into a portfolio doc
```

## The scripted prompt library

Each file in `prompts/` is a markdown template with `{{placeholders}}`. They're designed to be pasted into Claude/ChatGPT to:

| Prompt | Use it when |
| --- | --- |
| `01-expand-tier.md` | A tier feels thin; you want 3–5 new skill nodes added. |
| `02-add-node.md` | You have one specific skill in mind to add. |
| `03-refine-node.md` | You want personal coaching on a skill you're working on (also available via the ✦ button in the side panel). |
| `04-generate-quests.md` | The default quest pool feels stale; you want quests tailored to your current state. |
| `05-evidence-criteria.md` | The criteria for "mastered" on a skill are too soft. Get falsifiable replacements. |
| `06-weekly-coach.md` | Monday morning — paste your save JSON, get a focused briefing. |
| `07-portfolio-export.md` | You want a portfolio doc for LinkedIn / promo / job applications. |

### Suggested workflow

1. **Now**: play with the seeded tree. Mark a Tier 1 skill in-progress, add some evidence.
2. **Weekly**: paste your exported save JSON into `06-weekly-coach.md`. Act on the briefing.
3. **As tiers feel thin**: run `01-expand-tier.md`, paste the JSON output into `data/skills.json` under `"nodes"`, refresh the page.
4. **Quarterly**: run `07-portfolio-export.md` and save the markdown somewhere. That's your record.

## Back up your progress

Click **Export** in the header → save the JSON file → commit it to this repo. Your save is a single text file that survives forever.

## Extending

The data schema is small and stable. To add new fields safely:
- Add the field to the JSON.
- Read it in `src/nodePanel.js` for display, or `src/tree.js` for rendering.
- Old saves keep working — the migration in `store.js` fills in missing fields.

To add a new prompt template:
1. Drop a `prompts/NN-name.md` file with `{{placeholder}}` variables.
2. Register it in `PROMPT_FILES` inside `src/prompts.js`.
3. Call `buildPrompt("name", { placeholder: value })` from wherever you want to use it.
