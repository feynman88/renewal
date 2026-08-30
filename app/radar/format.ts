export function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "£4,500/mo" — falls back to the raw export text when the number didn't parse. */
export function fmtMoney(value: number | null, raw: string): string {
  if (value === null) return raw || "—";
  return `£${value.toLocaleString("en-GB")}/mo`;
}

export function fmtDays(days: number): string {
  if (days === 0) return "renews today";
  const n = Math.abs(days);
  const unit = n === 1 ? "day" : "days";
  return days < 0 ? `${n} ${unit} overdue` : `in ${n} ${unit}`;
}
