import { CONDITION_LABEL, type Condition } from "@/lib/mock-deals";

const STYLES: Record<Condition, string> = {
  like_new: "border-emerald/40 text-emerald bg-emerald-soft",
  very_good: "border-sky-600/30 text-sky-700 bg-sky-500/10",
  good: "border-amber-600/30 text-amber-700 bg-amber-500/10",
  acceptable: "border-zinc-500/30 text-zinc-600 bg-zinc-500/10",
};

export function ConditionBadge({ condition }: { condition: Condition }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${STYLES[condition]}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {CONDITION_LABEL[condition]}
    </span>
  );
}
