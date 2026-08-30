// Regenerates /public/sample-data/*.csv with dates relative to TODAY at run time.
//
// Why a generator instead of hand-written dates: the brief needs the sample to show
// every bucket (overdue / next-7 / next-45 / later), but committed literal dates rot —
// a week after committing, the "next 7 days" rows silently become "overdue" and the
// demo no longer exercises all buckets. Re-run `npm run gen:sample` to refresh.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "sample-data");

const iso = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  // Format from local components — toISOString() is UTC and shifts the date by a
  // day in non-UTC timezones, which would skew every bucket in the sample.
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Each billing row: [name, startOffset, endOffset|null, value]
// The messiness is deliberate and required by the brief — see ref checklist:
// - "ACME Ltd" vs project "acme"                         → casing + legal suffix
// - "Brightwave Studios" twice                           → re-signed client (history)
// - project "Brightwaive Studios" / "Kestrel ... Roastery" → typos (fuzzy auto-link ≥0.85)
// - "Atlas Trading Ltd" vs project "Atlas Travel"        → ~0.69 similarity (needs review)
// - three empty retainer_end                             → Unknown-renewal bucket
// - end dates spread: overdue, ≤7d, ≤45d, far outside
const billing = [
  ["ACME Ltd",                -80,   +5, "£4,500"],
  ["Brightwave Studios",     -280, -190, "3200"],       // older signing → history row
  ["Brightwave Studios",     -100,  +33, "3800"],       // re-sign → active row
  ["Northshore Coffee Co.",   -85,   -6, "2100"],       // overdue
  ["Maple & Finch Limited",   -60, null, "2600"],       // no end date
  ["Juniper Pet Supplies",    -70,   +2, "£1,900.00"],
  ["Verdant Home plc",        -50, null, "5200"],       // no end date
  ["Oslo & Sons Inc",         -30, +115, "2400"],       // far outside 45 days
  ["Kestrel Coffee Roasters", -90,  +40, "3100"],
  ["Atlas Trading Ltd",       -40,   +9, "2800"],       // its only project candidate is uncertain
  ["Fjord Outfitters",        -20, null, "1500"],       // no end date
  ["Hearthside Bakery",       -95,   -2, "1200"],       // overdue
];

// Each project row: [name, scope, lastDeliveryOffset, lead]
const project = [
  ["acme",                     "Theme rebuild + CRO",        -9,  "Dana W"],
  ["Brightwaive Studios",      "Subscription migration",     -3,  "Priya K"],   // typo of Brightwave
  ["Northshore Coffee",        "Email flows + landing pages", -15, "Sam T"],
  ["Maple & Finch",            "Wholesale channel setup",    -6,  "Dana W"],
  ["JUNIPER PET SUPPLIES LLC", "App integrations",           -2,  "Miguel R"],
  ["Verdant Home",             "Site speed + accessibility", -11, "Priya K"],
  ["Kestrel Coffee Roastery",  "Loyalty program build",      -4,  "Sam T"],     // typo of Roasters
  ["Atlas Travel",             "Checkout extensions",        -8,  "Miguel R"],  // uncertain vs Atlas Trading
  ["Fjord Outfitters",         "Seasonal campaign support",  -1,  "Dana W"],
  ["hearthside bakery ltd",    "Menu + ordering revamp",     -22, "Sam T"],
  ["Golden Fern Interiors",    "Discovery workshop",         -30, "Priya K"],   // no billing match at all
];

const q = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const row = (cells) => cells.map(q).join(",");

const billingCsv = [
  "client_name,retainer_start,retainer_end,monthly_value",
  ...billing.map(([n, s, e, v]) => row([n, iso(s), e === null ? "" : iso(e), v])),
].join("\n");

const projectCsv = [
  "client_name,scope,last_delivery,account_lead",
  ...project.map(([n, sc, d, l]) => row([n, sc, iso(d), l])),
].join("\n");

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "billing_export.csv"), billingCsv + "\n");
writeFileSync(join(outDir, "project_export.csv"), projectCsv + "\n");
console.log(`Wrote sample data anchored to ${iso(0)} in ${outDir}`);
