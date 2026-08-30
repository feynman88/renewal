import type { BucketId, ClientGroup } from "@/lib/types";
import { ClientCard } from "./ClientCard";

// Colors follow the brief exactly; each bucket also carries a text label so
// urgency never depends on color perception alone.
const META: Record<BucketId, { title: string; classes: string }> = {
  unknown: {
    title: "Unknown renewal — check manually",
    classes: "border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  },
  overdue: {
    title: "Overdue",
    classes: "border-red-400 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200",
  },
  next7: {
    title: "Next 7 days",
    classes: "border-red-400 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200",
  },
  next45: {
    title: "Next 45 days",
    classes:
      "border-orange-400 bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  },
  later: {
    title: "Later",
    classes: "border-zinc-300 bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
  },
};

function BucketHeading({ id, count }: { id: BucketId; count: number }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md border-l-4 px-3 py-1.5 text-sm font-semibold ${META[id].classes}`}
    >
      {META[id].title}
      <span className="rounded-full bg-black/10 px-2 text-xs tabular-nums dark:bg-white/10">
        {count}
      </span>
    </span>
  );
}

export function Bucket({ id, groups }: { id: BucketId; groups: ClientGroup[] }) {
  const cards =
    groups.length > 0 ? (
      <div className="mt-3 space-y-3">
        {groups.map((g) => (
          <ClientCard key={g.key} group={g} />
        ))}
      </div>
    ) : (
      <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">none</p>
    );

  // "Later" is collapsed by default: it exists for completeness, not attention.
  if (id === "later") {
    return (
      <details className="group">
        <summary className="cursor-pointer list-none">
          <BucketHeading id={id} count={groups.length} />
          <span className="ml-2 text-xs text-zinc-400 group-open:hidden">show</span>
          <span className="ml-2 hidden text-xs text-zinc-400 group-open:inline">hide</span>
        </summary>
        {cards}
      </details>
    );
  }

  return (
    <section>
      <h2>
        <BucketHeading id={id} count={groups.length} />
      </h2>
      {cards}
    </section>
  );
}
