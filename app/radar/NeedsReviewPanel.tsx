import type { ReviewItem } from "@/lib/types";

export function NeedsReviewPanel({ items }: { items: ReviewItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-lg border border-violet-300 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
      <h2 className="text-sm font-semibold text-violet-900 dark:text-violet-200">
        Needs review — possible matches we did not auto-link
      </h2>
      <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">
        These names look similar but not similar enough to trust. Check them by hand —
        their cards below show “no project data matched” until then.
      </p>
      <ul className="mt-2 space-y-1 text-sm text-violet-900 dark:text-violet-100">
        {items.map((item, i) => (
          <li key={i}>
            <span className="font-medium">“{item.billingName}”</span> (billing) ↔{" "}
            <span className="font-medium">“{item.projectName}”</span> (projects) ·{" "}
            {Math.round(item.score * 100)}% similar
          </li>
        ))}
      </ul>
    </section>
  );
}
