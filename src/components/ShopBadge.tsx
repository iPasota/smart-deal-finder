import { SHOPS, type ShopSlug } from "@/lib/shops";

export function ShopBadge({ shop, size = "md" }: { shop: ShopSlug; size?: "sm" | "md" }) {
  const s = SHOPS[shop];
  const cls =
    size === "sm"
      ? "px-1.5 py-0.5 text-[9px]"
      : "px-2 py-0.5 text-[10px]";
  return (
    <span
      title={s.name}
      className={`inline-flex items-center gap-1 rounded-md border font-bold uppercase tracking-wider ${cls}`}
      style={{
        borderColor: s.color + "55",
        backgroundColor: s.color + "1A",
        color: "var(--foreground)",
      }}
    >
      <span
        className="inline-block size-1.5 rounded-full"
        style={{ backgroundColor: s.color }}
        aria-hidden
      />
      {s.shortName}
    </span>
  );
}
