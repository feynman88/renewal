import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { RadarApp } from "./radar/RadarApp";

// Server Component that only hands the committed sample CSVs to the client app.
// Read at build time (the page stays fully static), because this Next version's
// dev runtime doesn't reliably run a fetch-on-mount effect on the prerendered
// page — and its docs prescribe server-provided initial data for exactly this
// case. Every piece of real logic (parsing, matching, bucketing) runs in the
// browser; drag-and-drop replaces the data without any server involvement.
export default async function Page() {
  const dir = join(process.cwd(), "public", "sample-data");
  const billingPath = join(dir, "billing_export.csv");
  const [sampleBillingCsv, sampleProjectCsv, billingStat] = await Promise.all([
    readFile(billingPath, "utf8"),
    readFile(join(dir, "project_export.csv"), "utf8"),
    stat(billingPath),
  ]);
  // Seed the client's "today" with the sample file's mtime — the moment its dates
  // were generated, which is what they're relative to. Render must stay pure
  // (no Date.now()), and this seed only paints the first frame: the client swaps
  // in the viewer's real local date immediately after hydration.
  const renderedAtMs = billingStat.mtimeMs;

  return (
    <RadarApp
      sampleBillingCsv={sampleBillingCsv}
      sampleProjectCsv={sampleProjectCsv}
      renderedAtMs={renderedAtMs}
    />
  );
}
