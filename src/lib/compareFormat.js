/** "5.4x more" style badge for whichever side played something more
 *  — used on Artist Leaderboard and Genre Leaderboard rows. Omitted
 *  when either side is zero (nothing meaningful to multiply) or the
 *  counts are equal (no "more" to report). */
export function multiplierBadge(countA, countB) {
  if (countA === 0 || countB === 0 || countA === countB) return { badgeA: null, badgeB: null };
  const ratio = countA > countB ? countA / countB : countB / countA;
  const text = `${ratio.toFixed(1)}x more`;
  return countA > countB ? { badgeA: text, badgeB: null } : { badgeA: null, badgeB: text };
}
