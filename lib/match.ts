import { similarity } from "./similarity";
import type { ProjectRow, ReviewItem, MatchType } from "./types";

// Brief's thresholds, implemented exactly: ≥0.85 auto-links, [0.60, 0.85) is
// flagged for a human, below 0.60 is treated as no relation.
export const AUTO_LINK_THRESHOLD = 0.85;
export const REVIEW_THRESHOLD = 0.6;

export type MatchOutcome = {
  links: Map<string, { project: ProjectRow; matchType: MatchType }>;
  needsReview: ReviewItem[];
};

/**
 * Link each billing client (by normalized key) to at most one project row.
 * Pass 1: exact key equality. Pass 2: fuzzy ≥0.85, best pairs first, each project
 * row consumed once. Pass 3: anything whose best remaining candidate falls in
 * [0.60, 0.85) is surfaced in "Needs review" — NEVER silently linked, because a
 * wrong silent match is exactly how a brand lapses unnoticed.
 */
export function matchClients(
  billingKeys: { key: string; displayName: string }[],
  projectRows: ProjectRow[],
): MatchOutcome {
  const links: MatchOutcome["links"] = new Map();
  const needsReview: ReviewItem[] = [];
  const unmatchedBilling = new Map(billingKeys.map((b) => [b.key, b]));
  const unmatchedProjects = new Set(projectRows);

  // Pass 1 — exact normalized match.
  for (const project of projectRows) {
    const b = unmatchedBilling.get(project.key);
    if (b && !links.has(b.key)) {
      links.set(b.key, { project, matchType: "exact" });
      unmatchedBilling.delete(b.key);
      unmatchedProjects.delete(project);
    }
  }

  // Pass 2 — fuzzy auto-link, globally best pairs first (greedy). Sorting by score
  // before assigning means a project row goes to its closest billing name, not to
  // whichever billing row happened to be iterated first.
  const scored: { key: string; project: ProjectRow; score: number }[] = [];
  for (const [key] of unmatchedBilling) {
    for (const project of unmatchedProjects) {
      scored.push({ key, project, score: similarity(key, project.key) });
    }
  }
  scored.sort((a, b) => b.score - a.score);

  for (const { key, project, score } of scored) {
    if (score < AUTO_LINK_THRESHOLD) break;
    if (!unmatchedBilling.has(key) || !unmatchedProjects.has(project)) continue;
    links.set(key, { project, matchType: "fuzzy" });
    unmatchedBilling.delete(key);
    unmatchedProjects.delete(project);
  }

  // Pass 3 — uncertain band goes to a human. The project row is NOT consumed:
  // if two billing names both resemble it, both flags are shown — honest noise
  // beats a hidden coin-flip.
  for (const [key, b] of unmatchedBilling) {
    let best: { project: ProjectRow; score: number } | null = null;
    for (const project of unmatchedProjects) {
      const score = similarity(key, project.key);
      if (!best || score > best.score) best = { project, score };
    }
    if (best && best.score >= REVIEW_THRESHOLD && best.score < AUTO_LINK_THRESHOLD) {
      needsReview.push({
        billingName: b.displayName,
        projectName: best.project.clientNameRaw,
        score: best.score,
      });
    }
  }

  return { links, needsReview };
}
