import type { BillingRow, BucketId } from "./types";

const MS_PER_DAY = 86_400_000;

/** Local midnight today — the radar works in whole calendar days, never clock time. */
export function todayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Whole calendar days from `today` to `end`. Math.round absorbs DST hour shifts. */
export function daysRemaining(end: Date, today: Date): number {
  return Math.round((end.getTime() - today.getTime()) / MS_PER_DAY);
}

/**
 * Group billing rows for one client into { active, history }.
 * Latest retainer_start wins as the active signing (the brief's rule 4); everything
 * older is kept as visible history, never deleted. If the newest signing has no end
 * date we do NOT reach back to an older row's date — presenting an expired end date
 * as current would be a quiet lie, which is worse than admitting "unknown".
 */
export function resolveResign(rows: BillingRow[]): {
  active: BillingRow;
  history: BillingRow[];
} {
  const sorted = [...rows].sort(
    // Rows missing a start date sort oldest — we can't argue they're the newest signing.
    (a, b) => (b.retainerStart?.getTime() ?? -Infinity) - (a.retainerStart?.getTime() ?? -Infinity),
  );
  return { active: sorted[0], history: sorted.slice(1) };
}

/**
 * Bucket assignment. Day 45 exactly is IN the 45-day window (brief's boundary rule);
 * day 0 (renews today) belongs with "next 7 days", not overdue.
 */
export function bucketFor(days: number | null): BucketId {
  if (days === null) return "unknown";
  if (days < 0) return "overdue";
  if (days <= 7) return "next7";
  if (days <= 45) return "next45";
  return "later";
}

/**
 * Header count "X renewals in the next 45 days" includes overdue ones: a headline
 * saying "0 renewals coming up" while three brands sit lapsed would repeat the
 * exact failure this radar exists to prevent.
 */
export function isWithin45(days: number | null): boolean {
  return days !== null && days <= 45;
}
