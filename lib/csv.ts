import Papa from "papaparse";
import { normalizeName } from "./normalize";
import type { BillingRow, ProjectRow } from "./types";

/**
 * Date-only, local-time parsing. Accepts YYYY-MM-DD and DD/MM/YYYY (UK agency).
 * Anything else returns null and is treated exactly like a missing date — the
 * radar admits blindness instead of guessing (same rule as empty retainer_end).
 * Deliberately NOT `new Date(string)`: its ISO parsing is UTC-based and shifts
 * the day in non-UTC timezones, and its fallback parsing guesses formats.
 */
export function parseDateOnly(raw: string): Date | null {
  const s = raw.trim();
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (match) {
    [y, m, d] = [+match[1], +match[2], +match[3]];
  } else if ((match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) {
    [d, m, y] = [+match[1], +match[2], +match[3]];
  } else {
    return null;
  }
  const date = new Date(y, m - 1, d);
  // Reject silently-rolled-over dates like 2026-02-31 → Mar 3.
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return date;
}

/** Lenient money parsing: "£4,500.00" → 4500. Unparseable → null, raw kept for display. */
export function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

type RawRecord = Record<string, string>;

function parseRecords(csvText: string): RawRecord[] {
  const result = Papa.parse<RawRecord>(csvText, {
    header: true,
    skipEmptyLines: true,
    // Real exports vary header casing/spacing; map by normalized header name so
    // column order never matters.
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  return result.data;
}

export function parseBillingCsv(csvText: string): BillingRow[] {
  return parseRecords(csvText)
    .filter((r) => (r.client_name ?? "").trim() !== "")
    .map((r) => ({
      clientNameRaw: r.client_name.trim(),
      key: normalizeName(r.client_name),
      retainerStart: parseDateOnly(r.retainer_start ?? ""),
      retainerEnd: parseDateOnly(r.retainer_end ?? ""),
      monthlyValue: parseMoney(r.monthly_value ?? ""),
      monthlyValueRaw: (r.monthly_value ?? "").trim(),
    }));
}

export function parseProjectCsv(csvText: string): ProjectRow[] {
  return parseRecords(csvText)
    .filter((r) => (r.client_name ?? "").trim() !== "")
    .map((r) => ({
      clientNameRaw: r.client_name.trim(),
      key: normalizeName(r.client_name),
      scope: (r.scope ?? "").trim(),
      lastDelivery: parseDateOnly(r.last_delivery ?? ""),
      lastDeliveryRaw: (r.last_delivery ?? "").trim(),
      accountLead: (r.account_lead ?? "").trim(),
    }));
}
