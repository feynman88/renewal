# Renewal Radar

A one-page, in-browser radar for Harbourline's rolling 3-month retainers: it loads a
billing CSV and a project CSV, links clients across them by name, and shows what's up
for renewal in the next 45 days. Live at: **[LIVE URL — fill in after deploying]**

## How the messy data is handled

**Names don't match between the two files.** Every client name is normalised
(lowercased, punctuation removed, legal suffixes like Ltd / Limited / Inc / LLC / plc
dropped) before matching. Names that are at least 85% similar after that are linked
automatically, and the card says so. Names that are only 60–85% similar are **never
linked silently** — they're listed in the "Needs review" panel with both spellings, and
the client's card says "no project data matched" until a human decides. A wrong quiet
match is how a brand lapses unnoticed, so the tool prefers admitting doubt.

**Some retainers have no end date.** The radar never invents one. Those clients sit in
their own "Unknown renewal — check manually" bucket, pinned at the very top in amber.
An unreadable date is treated the same way as a missing one.

**Some clients appear twice in billing (re-signed).** The row with the latest
retainer start decides the active renewal date; the older rows aren't deleted — they
show on the client's card as "Previous retainers". If the newest signing has no end
date, the client goes to "Unknown" rather than borrowing the older (expired) date.

The headline "X renewals in the next 45 days" includes overdue ones — a headline
saying "0 coming up" while brands sit lapsed would repeat the exact failure this tool
exists to prevent. Day 45 exactly counts as inside the window.

## What's tested

`npm test` (Vitest, 23 tests) covers: name normalisation (casing, punctuation, each
legal suffix, suffixes only stripped at the end of a name), the fuzzy-match thresholds
(≥85% auto-links, 60–85% goes to review, below 60% is ignored), missing/unparseable
end dates landing in the Unknown bucket, re-sign resolution (latest start wins, history
kept, no fallback to stale dates), the 45-day window boundaries (day 45 in, day 46
out, day 0 in "next 7 days", day −1 overdue), and lenient CSV header/money parsing.

## Swapping in real exports

Drag a real CSV onto either drop zone (or click it to pick a file) — billing on the
left, projects on the right. The radar recomputes instantly, entirely in the browser;
nothing is uploaded anywhere. A file with no usable rows is rejected with a message
and the previous data stays on screen. "reset to sample data" restores the demo data.

Expected columns (order and casing don't matter):
- billing: `client_name, retainer_start, retainer_end, monthly_value`
- project: `client_name, scope, last_delivery, account_lead`
- dates as `YYYY-MM-DD` or `DD/MM/YYYY`

## Development

```bash
npm run dev          # run locally
npm test             # run the logic tests
npm run gen:sample   # regenerate /public/sample-data with dates relative to today
```

The sample dates are generated relative to a run date so the demo always shows every
bucket (overdue, next 7 days, next 45, later); re-run `gen:sample` if they've drifted.
