export function DiscountBadge({ pct }: { pct: number }) {
  if (pct <= 0) return null;
  return (
    <span className="font-mono-tabular inline-flex items-center rounded-md border border-amber/40 bg-amber px-1.5 py-0.5 text-[11px] font-bold text-amber-foreground">
      −{pct}%
    </span>
  );
}
