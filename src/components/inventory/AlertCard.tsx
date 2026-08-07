import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertRow = {
  key: string;
  title: string;
  subtitle: string;
  value: string;
  valueSub: string;
};

export function AlertCard({
  icon: Icon,
  title,
  description,
  tone,
  rows,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone: "destructive" | "warning" | "primary";
  rows: AlertRow[];
}) {
  const toneText =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : "text-primary";
  const toneBg =
    tone === "destructive"
      ? "bg-destructive/5 border-destructive/25"
      : tone === "warning"
        ? "bg-warning/5 border-warning/25"
        : "bg-primary/5 border-primary/25";

  return (
    <section className={cn("rounded-2xl border-2 p-5 shadow-sm", toneBg)}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", toneText)} />
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <span className={cn("text-3xl font-black tabular-nums", toneText)}>{rows.length}</span>
      </header>

      <ul className="mt-4 divide-y divide-border/70">
        {rows.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma máquina nesta condição
          </li>
        )}
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-semibold text-foreground">{r.title}</p>
              <p className="truncate text-xs text-muted-foreground">{r.subtitle}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className={cn("text-sm font-bold tabular-nums", toneText)}>{r.value}</p>
              <p className="text-xs text-muted-foreground">{r.valueSub}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
