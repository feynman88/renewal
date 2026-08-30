"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { parseBillingCsv, parseProjectCsv } from "@/lib/csv";
import { buildRadar, BUCKET_ORDER } from "@/lib/radar";
import { todayLocal } from "@/lib/renewal";
import type { BillingRow, ProjectRow } from "@/lib/types";
import { Bucket } from "./Bucket";
import { DropZone } from "./DropZone";
import { NeedsReviewPanel } from "./NeedsReviewPanel";

type Slot<T> = { rows: T[]; fileName: string };

// "Today" via useSyncExternalStore: the server snapshot renders the page with its
// build-time date (so hydration matches the prerendered HTML exactly), then the
// client snapshot takes over with the viewer's real local date. A statically built
// page can be opened days after it was built — bucketing against the build date
// would silently shift every deadline. The snapshot is cached because React
// requires referential stability between calls.
const subscribeNever = () => () => {};
let cachedToday: Date | null = null;
function localTodaySnapshot(): Date {
  const now = todayLocal();
  if (!cachedToday || cachedToday.getTime() !== now.getTime()) cachedToday = now;
  return cachedToday;
}

export function RadarApp({
  sampleBillingCsv,
  sampleProjectCsv,
  renderedAtMs,
}: {
  sampleBillingCsv: string;
  sampleProjectCsv: string;
  renderedAtMs: number;
}) {
  // The sample CSVs arrive as props (read from /public at build time) instead of a
  // fetch-on-mount effect: this Next version doesn't reliably run mount effects on
  // the prerendered page in dev, and its docs prescribe server-provided initial
  // data. Bonus: the radar is visible instantly, with no loading flash. Parsing,
  // matching, and bucketing all still run in the browser.
  const sampleBilling = () => ({
    rows: parseBillingCsv(sampleBillingCsv),
    fileName: "billing_export.csv (sample)",
  });
  const sampleProject = () => ({
    rows: parseProjectCsv(sampleProjectCsv),
    fileName: "project_export.csv (sample)",
  });

  const [billing, setBilling] = useState<Slot<BillingRow>>(sampleBilling);
  const [project, setProject] = useState<Slot<ProjectRow>>(sampleProject);
  const [errors, setErrors] = useState<{ billing?: string; project?: string }>({});

  const resetToSamples = () => {
    setErrors({});
    setBilling(sampleBilling());
    setProject(sampleProject());
  };

  // A bad upload keeps the previous data on screen — replacing a working radar
  // with a blank one would punish the user for a mis-drag.
  const handleFile =
    <T,>(
      slot: "billing" | "project",
      parse: (text: string) => T[],
      set: (s: Slot<T>) => void,
    ) =>
    async (file: File) => {
      const rows = parse(await file.text());
      if (rows.length === 0) {
        setErrors((e) => ({
          ...e,
          [slot]: `“${file.name}” has no usable rows (expected a header row with client_name). Kept the previous data.`,
        }));
        return;
      }
      setErrors((e) => ({ ...e, [slot]: undefined }));
      set({ rows, fileName: file.name });
    };

  // The "as of" date is shown in the header, so if the swap ever failed the stale
  // date would at least be visible instead of silently wrong.
  const serverToday = useMemo(() => {
    const d = new Date(renderedAtMs);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [renderedAtMs]);
  const today = useSyncExternalStore(subscribeNever, localTodaySnapshot, () => serverToday);

  const radar = useMemo(
    () => buildRadar(billing.rows, project.rows, today),
    [billing, project, today],
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold">Renewal Radar</h1>
        <p className="mt-1 text-lg text-zinc-700 dark:text-zinc-300">
          <strong>{radar.counts.within45}</strong> renewals in the next 45 days,{" "}
          <strong>{radar.counts.unknown}</strong> unknown,{" "}
          <strong>{radar.counts.needsReview}</strong> need review
        </p>
        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
          as of {today.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </header>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <DropZone
          label="Billing export"
          fileName={billing.fileName}
          error={errors.billing}
          onFile={handleFile("billing", parseBillingCsv, setBilling)}
        />
        <DropZone
          label="Project export"
          fileName={project.fileName}
          error={errors.project}
          onFile={handleFile("project", parseProjectCsv, setProject)}
        />
      </div>
      <button
        type="button"
        onClick={resetToSamples}
        className="mt-2 text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        reset to sample data
      </button>

      <main className="mt-6 space-y-8">
        <NeedsReviewPanel items={radar.needsReview} />
        {BUCKET_ORDER.map((id) => (
          <Bucket key={id} id={id} groups={radar.buckets[id]} />
        ))}
      </main>

      <footer className="mt-12 border-t border-zinc-200 pt-4 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <h2 className="font-semibold text-zinc-600 dark:text-zinc-300">How matching works</h2>
        <p className="mt-1">
          Client names from both files are normalised (lowercased, punctuation removed, legal
          suffixes like Ltd/Limited/Inc/LLC dropped) and matched. Names at least 85% similar are
          linked automatically and say so on the card; anything 60–85% similar is listed under
          “Needs review” instead of being guessed. A missing or unreadable renewal date is never
          invented — those clients sit in “Unknown renewal” at the top. When a client re-signed,
          the newest retainer decides the renewal date and older rows stay visible as history.
          The headline “renewals in the next 45 days” includes overdue ones (day 45 exactly
          counts as in). Dates are read as YYYY-MM-DD or DD/MM/YYYY.
        </p>
      </footer>
    </div>
  );
}
