export function DiscountBadge({ pct }: { pct: number }) {
  if (pct <= 0) return null;
  return (
    <span className="font-mono-tabular inline-flex items-center rounded-md bg-emerald px-1.5 py-0.5 text-[11px] font-semibold text-emerald-foreground">
      −{pct}%
    </span>
  );
}
