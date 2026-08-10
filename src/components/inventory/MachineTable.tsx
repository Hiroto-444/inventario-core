import { Cable, Wifi, ShieldCheck, ShieldAlert, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { isOsOld, isStorageCritical, type Machine } from "@/lib/inventory";

function StorageBar({ m }: { m: Machine }) {
  const pct = m.storageUsedPercent;
  const tone = pct >= 90 ? "bg-destructive" : pct >= 75 ? "bg-warning" : "bg-primary";
  return (
    <div className="flex items-center gap-1.5">
      <span className="whitespace-nowrap font-mono text-[10px] text-muted-foreground">
        {Math.round(m.storageTotalGb - m.storageFreeGb)}/{Math.round(m.storageTotalGb)}GB
      </span>
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-muted">
        <span className={cn("block h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
      </span>
      <span
        className={cn(
          "w-9 text-right font-mono text-[11px] font-semibold",
          pct >= 90 ? "text-destructive" : pct >= 75 ? "text-warning" : "text-foreground",
        )}
      >
        {pct}%
      </span>
    </div>
  );
}

function AvBadge({ m }: { m: Machine }) {
  const Icon =
    m.antivirusLevel === "ok" ? ShieldCheck : m.antivirusLevel === "defender" ? ShieldAlert : ShieldOff;
  const tone =
    m.antivirusLevel === "ok"
      ? "border-primary/40 bg-primary/10 text-primary"
      : m.antivirusLevel === "defender"
        ? "border-warning/40 bg-warning/10 text-warning"
        : "border-destructive/40 bg-destructive/10 text-destructive";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        tone,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {m.antivirus}
    </span>
  );
}

const HEADERS = [
  "Hostname",
  "Usuário",
  "IP",
  "MAC",
  "Conexão",
  "Processador",
  "RAM",
  "Armazenamento",
  "Sistema Operacional",
  "Instalação",
  "Domínio",
  "Antivírus",
];

export function MachineTable({ machines }: { machines: Machine[] }) {
  return (
    <div className="w-full">
      <table className="w-full table-auto text-sm">
        <thead>
          <tr className="border-b bg-primary/5">
            {HEADERS.map((h) => (
              <th
                key={h}
                className="px-2 py-2.5 text-left text-[10px] leading-tight font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {machines.map((m) => (
            <tr key={m.id} className="border-b border-border/60 last:border-0 hover:bg-primary/5">
              <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px] font-semibold text-foreground">
                {m.hostname}
              </td>
              <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px] text-primary">{m.user}</td>
              <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px] text-muted-foreground">
                {m.ip}
              </td>
              <td className="px-2 py-2 font-mono text-[11px] leading-tight text-muted-foreground">
                {m.mac}
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-[11px]">
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  {m.connectionType === "Wi-Fi" ? (
                    <Wifi className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Cable className="h-3.5 w-3.5 text-accent" />
                  )}
                  <span className="font-medium">{m.connectionType}</span>
                  {m.connectionSpeed && (
                    <span className="text-muted-foreground">· {m.connectionSpeed}</span>
                  )}
                </span>
              </td>
              <td
                className="px-2 py-2 text-[11px] leading-tight text-muted-foreground"
                title={m.cpu}
              >
                {m.cpu}
              </td>
              <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px] text-foreground">
                {m.ramGb}GB
              </td>
              <td className="whitespace-nowrap px-2 py-2">
                <StorageBar m={m} />
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-[11px] text-foreground">{m.os}</td>
              <td className="whitespace-nowrap px-2 py-2 text-[11px]">
                <span
                  className={cn(
                    "font-mono font-medium",
                    isOsOld(m) ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {m.installDate}
                </span>
                {m.installAgeYears !== null && (
                  <span className="ml-1 text-[11px] text-muted-foreground">
                    ({Math.floor(m.installAgeYears)}a)
                  </span>
                )}
              </td>
              <td
                className={cn(
                  "whitespace-nowrap px-2 py-2 font-mono text-[11px]",
                  m.isDomain ? "text-muted-foreground" : "text-warning font-semibold",
                )}
              >
                {m.domain || "—"}
              </td>
              <td className="whitespace-nowrap px-2 py-2">
                <AvBadge m={m} />
              </td>
            </tr>
          ))}
          {machines.length === 0 && (
            <tr>
              <td colSpan={HEADERS.length} className="px-3 py-10 text-center text-sm text-muted-foreground">
                Nenhuma máquina encontrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {/* keep helper referenced for critical highlight consistency */}
      <span className="hidden">{machines.filter(isStorageCritical).length}</span>
    </div>
  );
}
