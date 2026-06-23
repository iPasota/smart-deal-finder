import { CONDITION_LABEL, type Condition } from "@/lib/mock-deals";

const STYLES: Record<Condition, string> = {
  like_new: "border-emerald/30 bg-emerald text-emerald-foreground shadow-sm",
  very_good: "border-emerald/30 bg-emerald-soft text-emerald-ink",
  good: "border-amber/40 bg-amber-soft text-amber-ink",
  acceptable: "border-hairline bg-surface text-muted-foreground",
};

export function ConditionBadge({ condition }: { condition: Condition }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest ${STYLES[condition]}`}
    >
      {CONDITION_LABEL[condition]}
    </span>
  );
}
