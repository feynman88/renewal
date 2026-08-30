import { matchClients } from "./match";
import { bucketFor, daysRemaining, isWithin45, resolveResign } from "./renewal";
import type { BillingRow, BucketId, ClientGroup, ProjectRow, RadarResult } from "./types";

export const BUCKET_ORDER: BucketId[] = ["unknown", "overdue", "next7", "next45", "later"];

/** Full pipeline: raw parsed rows → grouped, matched, bucketed radar. */
export function buildRadar(
  billingRows: BillingRow[],
  projectRows: ProjectRow[],
  today: Date,
): RadarResult {
  // Group billing rows by normalized key so a re-signed client is one card.
  const byKey = new Map<string, BillingRow[]>();
  for (const row of billingRows) {
    const group = byKey.get(row.key);
    if (group) group.push(row);
    else byKey.set(row.key, [row]);
  }

  const groups = [...byKey.entries()].map(([key, rows]) => {
    const { active, history } = resolveResign(rows);
    return { key, active, history };
  });

  const { links, needsReview } = matchClients(
    groups.map((g) => ({ key: g.key, displayName: g.active.clientNameRaw })),
    projectRows,
  );

  const buckets: Record<BucketId, ClientGroup[]> = {
    unknown: [],
    overdue: [],
    next7: [],
    next45: [],
    later: [],
  };

  let within45 = 0;
  for (const { key, active, history } of groups) {
    const link = links.get(key) ?? null;
    const days = active.retainerEnd ? daysRemaining(active.retainerEnd, today) : null;
    const group: ClientGroup = {
      key,
      active,
      history,
      project: link?.project ?? null,
      matchType: link?.matchType ?? "none",
      daysRemaining: days,
      bucket: bucketFor(days),
    };
    buckets[group.bucket].push(group);
    if (isWithin45(days)) within45++;
  }

  // Most urgent first inside each bucket; unknowns alphabetical (no date to sort by).
  for (const id of BUCKET_ORDER) {
    buckets[id].sort((a, b) =>
      a.daysRemaining === null || b.daysRemaining === null
        ? a.active.clientNameRaw.localeCompare(b.active.clientNameRaw)
        : a.daysRemaining - b.daysRemaining,
    );
  }

  return {
    buckets,
    needsReview,
    counts: {
      within45,
      unknown: buckets.unknown.length,
      needsReview: needsReview.length,
    },
  };
}
