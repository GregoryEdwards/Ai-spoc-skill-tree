// XP curve, tuned so the 4 tiers feel like ~10 levels of progress.
// Level N requires ((N-1) * N / 2) * 100 cumulative XP — you start at level 1
// with 0 XP, hit level 2 at 100, level 3 at 300, level 4 at 600, etc.
export function xpRequiredForLevel(level) {
  return (((level - 1) * level) / 2) * 100;
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
