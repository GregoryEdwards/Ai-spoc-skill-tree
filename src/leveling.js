// XP curve: level N requires N * 100 cumulative XP at the simplest tier,
// growing slightly. Tuned so the 4 tiers feel like ~10 levels each.
//   Level 1: 0–100
//   Level 2: 100–250
//   Level 3: 250–450
//   Level N: requires N * (N+1) / 2 * 100 cumulative XP
export function xpRequiredForLevel(level) {
  return ((level * (level + 1)) / 2) * 100;
}

export function levelFromXP(xp) {
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= xp) level++;
  return level;
}

export function progressWithinLevel(xp) {
  const level = levelFromXP(xp);
  const base = xpRequiredForLevel(level);
  const next = xpRequiredForLevel(level + 1);
  const intoLevel = xp - base;
  const span = next - base;
  return { level, intoLevel, span, percent: Math.min(100, Math.round((intoLevel / span) * 100)) };
}
