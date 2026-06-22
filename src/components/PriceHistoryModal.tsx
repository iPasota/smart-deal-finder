import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ExternalLink } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildDeeplink } from "@/lib/affiliate";
import { formatEUR, type Deal } from "@/lib/mock-deals";
import { ConditionBadge } from "./ConditionBadge";

type Range = 30 | 90 | 365;

export function PriceHistoryModal({
  deal,
  open,
  onOpenChange,
}: {
  deal: Deal;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [range, setRange] = useState<Range>(90);

  const data = useMemo(() => {
    const slice = deal.history.slice(-range);
    return slice.map((h) => ({ date: h.t, price: h.p / 100 }));
  }, [deal.history, range]);

  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const current = deal.priceCents / 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-hairline bg-popover p-0">
        <div className="p-6">
          <DialogHeader>
            <div className="mb-2 flex items-center gap-2">
              <ConditionBadge condition={deal.condition} />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {deal.brand}
              </span>
            </div>
            <DialogTitle className="font-display text-2xl leading-tight">
              {deal.title}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Preisverlauf bei Amazon Warehouse
            </DialogDescription>
          </DialogHeader>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-4 gap-3 border-y border-hairline py-4">
            <Stat label="Aktuell" value={formatEUR(deal.priceCents)} accent />
            <Stat label="Tief" value={`€${min.toFixed(2).replace(".", ",")}`} />
            <Stat label="Ø" value={`€${avg.toFixed(2).replace(".", ",")}`} />
            <Stat label="Hoch" value={`€${max.toFixed(2).replace(".", ",")}`} />
          </div>

          {/* Range */}
          <div className="mt-4 flex gap-1">
            {([30, 90, 365] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                  range === r
                    ? "bg-emerald text-emerald-foreground"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                {r === 365 ? "1 Jahr" : `${r} Tage`}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="hist" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--emerald)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--emerald)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                  domain={["auto", "auto"]}
                  tickFormatter={(v) => `€${Math.round(v)}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                  formatter={(v) => [`€${Number(v).toFixed(2).replace(".", ",")}`, "Preis"]}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="var(--emerald)"
                  strokeWidth={2}
                  fill="url(#hist)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Primary CTA stays visible */}
          <a
            href={buildDeeplink(deal.asin)}
            target="_blank"
            rel="noopener sponsored"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald px-4 py-3 text-sm font-semibold text-emerald-foreground transition-transform hover:scale-[1.01]"
          >
            Für {formatEUR(current * 100)} auf Amazon ansehen
            <ExternalLink className="size-4" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`font-mono-tabular mt-1 text-base font-semibold ${
          accent ? "text-emerald" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
