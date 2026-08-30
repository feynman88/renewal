import { describe, expect, it } from "vitest";
import { normalizeName } from "../normalize";
import { similarity } from "../similarity";
import { parseBillingCsv, parseDateOnly, parseMoney } from "../csv";
import { matchClients, AUTO_LINK_THRESHOLD, REVIEW_THRESHOLD } from "../match";
import { bucketFor, daysRemaining, resolveResign } from "../renewal";
import { buildRadar } from "../radar";
import type { BillingRow, ProjectRow } from "../types";

const TODAY = new Date(2026, 7, 30); // fixed local date so tests never drift

const date = (offsetDays: number) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + offsetDays);
  return d;
};

const billing = (name: string, start: Date | null, end: Date | null): BillingRow => ({
  clientNameRaw: name,
  key: normalizeName(name),
  retainerStart: start,
  retainerEnd: end,
  monthlyValue: 1000,
  monthlyValueRaw: "1000",
});

const project = (name: string): ProjectRow => ({
  clientNameRaw: name,
  key: normalizeName(name),
  scope: "scope",
  lastDelivery: null,
  lastDeliveryRaw: "",
  accountLead: "lead",
});

describe("normalizeName", () => {
  it("lowercases, trims, strips punctuation, collapses spaces", () => {
    expect(normalizeName("  Maple  &  Finch.  ")).toBe("maple finch");
    expect(normalizeName("ACME")).toBe("acme");
  });

  it("strips each legal suffix, only at the end", () => {
    for (const s of ["Ltd", "Limited", "Inc", "Incorporated", "Co", "LLC", "PLC"]) {
      expect(normalizeName(`Acme ${s}`)).toBe("acme");
    }
    expect(normalizeName("Acme Co Ltd")).toBe("acme"); // stacked suffixes
    expect(normalizeName("Limited Edition Prints")).toBe("limited edition prints"); // mid-name survives
  });

  it("suffix casing/punctuation variants collapse to the same key", () => {
    expect(normalizeName("Acme Ltd")).toBe(normalizeName("Acme Limited"));
    expect(normalizeName("ACME ltd.")).toBe(normalizeName("acme"));
  });

  it("never strips a name down to nothing", () => {
    expect(normalizeName("Co")).toBe("co");
  });
});

describe("similarity thresholds", () => {
  it("typo variants clear the auto-link bar", () => {
    expect(
      similarity(normalizeName("Brightwave Studios"), normalizeName("Brightwaive Studios")),
    ).toBeGreaterThanOrEqual(AUTO_LINK_THRESHOLD);
  });

  it("the sample's uncertain pair lands in the review band", () => {
    const s = similarity(normalizeName("Atlas Trading Ltd"), normalizeName("Atlas Travel"));
    expect(s).toBeGreaterThanOrEqual(REVIEW_THRESHOLD);
    expect(s).toBeLessThan(AUTO_LINK_THRESHOLD);
  });

  it("unrelated names fall below the review floor", () => {
    expect(similarity("golden fern interiors", "hearthside bakery")).toBeLessThan(REVIEW_THRESHOLD);
  });
});

describe("matchClients", () => {
  it("exact normalized match links despite casing/suffix differences", () => {
    const { links, needsReview } = matchClients(
      [{ key: normalizeName("ACME Ltd"), displayName: "ACME Ltd" }],
      [project("acme")],
    );
    expect(links.get("acme")?.matchType).toBe("exact");
    expect(needsReview).toHaveLength(0);
  });

  it("auto-links at >= 0.85, flags [0.60, 0.85) for review, ignores < 0.60", () => {
    const { links, needsReview } = matchClients(
      [
        { key: "brightwave studios", displayName: "Brightwave Studios" },
        { key: "atlas trading", displayName: "Atlas Trading Ltd" },
        { key: "hearthside bakery", displayName: "Hearthside Bakery" },
      ],
      [project("Brightwaive Studios"), project("Atlas Travel")],
    );
    expect(links.get("brightwave studios")?.matchType).toBe("fuzzy");
    // uncertain pair: listed for a human, NOT linked
    expect(links.has("atlas trading")).toBe(false);
    expect(needsReview).toEqual([
      { billingName: "Atlas Trading Ltd", projectName: "Atlas Travel", score: expect.any(Number) },
    ]);
    // nothing resembles hearthside → no link, no flag
    expect(links.has("hearthside bakery")).toBe(false);
  });
});

describe("missing retainer_end", () => {
  it("goes to the unknown bucket — a date is never invented", () => {
    const result = buildRadar([billing("Verdant Home plc", date(-50), null)], [], TODAY);
    expect(result.buckets.unknown).toHaveLength(1);
    expect(result.buckets.unknown[0].daysRemaining).toBeNull();
    expect(result.counts.unknown).toBe(1);
    expect(result.counts.within45).toBe(0); // unknown never counts as "within 45"
  });

  it("unparseable dates are treated like missing ones", () => {
    expect(parseDateOnly("soon")).toBeNull();
    expect(parseDateOnly("2026-02-31")).toBeNull(); // no silent rollover to March
    expect(parseDateOnly("2026-09-04")).toEqual(new Date(2026, 8, 4));
    expect(parseDateOnly("04/09/2026")).toEqual(new Date(2026, 8, 4)); // DD/MM/YYYY
  });
});

describe("re-sign resolution", () => {
  const older = billing("Brightwave Studios", date(-280), date(-190));
  const newer = billing("Brightwave Studios", date(-100), date(33));

  it("latest retainer_start wins; older rows kept as history", () => {
    const { active, history } = resolveResign([older, newer]);
    expect(active).toBe(newer);
    expect(history).toEqual([older]);
  });

  it("newest signing with no end date → unknown; never falls back to the stale older date", () => {
    const newerNoEnd = billing("Brightwave Studios", date(-100), null);
    const result = buildRadar([older, newerNoEnd], [], TODAY);
    expect(result.buckets.unknown).toHaveLength(1);
    expect(result.buckets.unknown[0].history).toEqual([older]);
  });
});

describe("45-day window and buckets", () => {
  it.each([
    [-1, "overdue"],
    [0, "next7"],
    [7, "next7"],
    [8, "next45"],
    [44, "next45"],
    [45, "next45"], // day 45 exactly = in
    [46, "later"],
  ])("day %i → %s", (days, bucket) => {
    expect(bucketFor(days)).toBe(bucket);
  });

  it("computes calendar days and the header count including overdue", () => {
    expect(daysRemaining(date(45), TODAY)).toBe(45);
    const result = buildRadar(
      [
        billing("Overdue Client", date(-90), date(-6)),
        billing("Soon Client", date(-30), date(45)),
        billing("Later Client", date(-30), date(46)),
      ],
      [],
      TODAY,
    );
    expect(result.counts.within45).toBe(2); // overdue + day-45; day-46 excluded
    expect(result.buckets.later).toHaveLength(1);
  });
});

describe("csv parsing", () => {
  it("maps headers case-insensitively and keeps quoted money values", () => {
    const rows = parseBillingCsv(
      'Client_Name,RETAINER_START,retainer_end,Monthly_Value\nACME Ltd,2026-06-11,2026-09-04,"£4,500"\n',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe("acme");
    expect(rows[0].monthlyValue).toBe(4500);
  });

  it("parseMoney handles symbols and separators", () => {
    expect(parseMoney("£1,900.00")).toBe(1900);
    expect(parseMoney("n/a")).toBeNull();
  });
});
