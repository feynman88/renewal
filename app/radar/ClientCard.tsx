import type { ClientGroup } from "@/lib/types";
import { fmtDate, fmtDays, fmtMoney } from "./format";

export function ClientCard({ group }: { group: ClientGroup }) {
  const { active, history, project, matchType, daysRemaining } = group;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-semibold">{active.clientNameRaw}</h3>
        <div className="text-sm tabular-nums">
          {active.retainerEnd ? (
            <>
              <span className="font-medium">{fmtDate(active.retainerEnd)}</span>
              <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                {fmtDays(daysRemaining!)}
              </span>
            </>
          ) : (
            <span className="font-medium text-amber-700 dark:text-amber-400">
              no end date in billing export
            </span>
          )}
        </div>
      </div>

      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        {fmtMoney(active.monthlyValue, active.monthlyValueRaw)}
      </p>

      {project ? (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          {project.scope} · {project.accountLead}
          {project.lastDelivery && <> · last delivery {fmtDate(project.lastDelivery)}</>}
          {matchType === "fuzzy" && (
            // Surface that this link came from similarity, not an identical name —
            // the account lead should be able to spot-check the tool's judgment.
            <span className="ml-1 text-xs text-zinc-400 dark:text-zinc-500">
              (matched to “{project.clientNameRaw}” by similarity)
            </span>
          )}
        </p>
      ) : (
        <p className="mt-2 text-sm italic text-zinc-400 dark:text-zinc-500">
          no project data matched
        </p>
      )}

      {history.length > 0 && (
        <div className="mt-3 border-t border-zinc-100 pt-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <span className="font-medium">Previous retainers:</span>
          <ul className="mt-1 space-y-0.5">
            {history.map((row, i) => (
              <li key={i}>
                {row.retainerStart ? fmtDate(row.retainerStart) : "?"} →{" "}
                {row.retainerEnd ? fmtDate(row.retainerEnd) : "no end date"} ·{" "}
                {fmtMoney(row.monthlyValue, row.monthlyValueRaw)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
