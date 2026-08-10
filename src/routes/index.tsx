import { useCallback, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Upload,
  FileDown,
  Search,
  HardDrive,
  Clock,
  ShieldAlert,
  Monitor,
  Trash2,
  ShieldOff,
  Download,
  FileImage,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import logo from "@/assets/logo.png";
import {
  parseCsv,
  countBy,
  isAvWeak,
  isOsOld,
  isStorageCritical,
  CSV_TEMPLATE,
  type Machine,
} from "@/lib/inventory";
import { DonutCard } from "@/components/inventory/DonutCard";
import { AlertCard } from "@/components/inventory/AlertCard";
import { MachineTable } from "@/components/inventory/MachineTable";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inventário de Desktops | Core TI Expert" },
      {
        name: "description",
        content:
          "Importe arquivos CSV de inventário e gere um dashboard com gráficos, indicadores e alertas de armazenamento, sistema operacional e antivírus das máquinas.",
      },
      { property: "og:title", content: "Inventário de Desktops | Core TI Expert" },
      {
        property: "og:description",
        content:
          "Painel de inventário de computadores: importe CSVs e visualize gráficos e alertas de risco por máquina.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventoryDashboard,
});

function Kpi({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof HardDrive;
  value: number;
  label: string;
  tone: "destructive" | "warning" | "primary";
}) {
  const map = {
    destructive: "border-destructive/30 bg-destructive/5 text-destructive",
    warning: "border-warning/30 bg-warning/5 text-warning",
    primary: "border-primary/30 bg-primary/5 text-primary",
  } as const;
  return (
    <div className={`flex items-center gap-3 rounded-xl border-2 px-4 py-2.5 ${map[tone]}`}>
      <Icon className="h-5 w-5" />
      <div className="leading-tight">
        <span className="text-xl font-black tabular-nums text-foreground">{value}</span>
        <p className="text-xs font-medium">{label}</p>
      </div>
    </div>
  );
}

function InventoryDashboard() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [query, setQuery] = useState("");
  const [exporting, setExporting] = useState<null | "png" | "pdf">(null);
  const [pendingKind, setPendingKind] = useState<null | "png" | "pdf">(null);
  const [company, setCompany] = useState("");
  const [captureMode, setCaptureMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const capture = async () => {
    const node = captureRef.current;
    if (!node) return null;
    const { default: html2canvas } = await import("html2canvas-pro");
    return html2canvas(node, {
      backgroundColor: getComputedStyle(document.body).backgroundColor || "#0b1220",
      scale: 2,
      useCORS: true,
      windowWidth: Math.max(node.scrollWidth, 1400),
    });
  };

  const exportAs = async (kind: "png" | "pdf") => {
    if (exporting) return;
    setExporting(kind);
    setCaptureMode(true);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
    try {
      const canvas = await capture();
      if (!canvas) return;
      const stamp = new Date().toISOString().slice(0, 10);
      const slug =
        company
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "inventario";
      if (kind === "png") {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `${slug}-desktops-${stamp}.png`;
        link.click();
      } else {
        const { default: jsPDF } = await import("jspdf");
        const img = canvas.toDataURL("image/png");
        const orientation = canvas.width >= canvas.height ? "landscape" : "portrait";
        const pdf = new jsPDF({ orientation, unit: "pt", format: "a4" });
        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pw / canvas.width, ph / canvas.height);
        const w = canvas.width * ratio;
        const h = canvas.height * ratio;
        pdf.addImage(img, "PNG", (pw - w) / 2, (ph - h) / 2, w, h);
        pdf.save(`${slug}-desktops-${stamp}.pdf`);
      }
      toast.success(`Dashboard exportado em ${kind.toUpperCase()}`);
    } catch {
      toast.error("Não foi possível exportar o dashboard");
    } finally {
      setCaptureMode(false);
      setExporting(null);
    }
  };


  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const parsed: Machine[] = [];
    let failed = 0;
    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const rows = parseCsv(text, file.name);
        if (rows.length === 0) failed++;
        parsed.push(...rows);
      } catch {
        failed++;
      }
    }
    setMachines((prev) => {
      const merged = new Map<string, Machine>();
      for (const m of [...prev, ...parsed]) merged.set(m.hostname, m);
      return [...merged.values()].sort((a, b) => a.hostname.localeCompare(b.hostname));
    });
    toast.success(`${parsed.length} máquina(s) importada(s) de ${files.length} arquivo(s)`, {
      description: failed > 0 ? `${failed} arquivo(s) sem linhas válidas` : undefined,
    });
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const downloadTemplate = () => {
    const blob = new Blob(["\uFEFF" + CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-inventario.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return machines;
    return machines.filter((m) =>
      [m.hostname, m.user, m.ip, m.os, m.domain, m.antivirus, m.cpu]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [machines, query]);

  const storageAlerts = machines.filter(isStorageCritical);
  const osAlerts = machines.filter(isOsOld);
  const avAlerts = machines.filter(isAvWeak);
  const totalAlerts = storageAlerts.length + osAlerts.length + avAlerts.length;

  const connectionData = countBy(machines.map((m) => m.connectionType));
  const domainData = countBy(machines.map((m) => (m.isDomain ? "Domínio" : "Workgroup")));
  const osData = countBy(machines.map((m) => m.osFamily));

  return (
    <div className="min-h-screen bg-background">
      <Toaster />

      <header className="sticky top-0 z-20 border-b bg-card px-4 py-3 shadow-sm md:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Core TI Expert" className="h-8 object-contain" />
            <div className="hidden h-7 w-px bg-border sm:block" />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-tight text-foreground">
                Inventário de Desktops
              </p>
              <p className="text-xs leading-tight text-muted-foreground">
                {machines.length} máquina(s) registrada(s) · {totalAlerts} alerta(s) ativo(s)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {machines.length > 0 && (
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => setMachines([])}>
                <Trash2 className="h-4 w-4" />
                Limpar
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
              <FileDown className="h-4 w-4" />
              Consolidar CSV
            </Button>
            <Button size="sm" className="gap-2" onClick={() => inputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Importar CSV
            </Button>
            {machines.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="gap-2" disabled={!!exporting}>
                    {exporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Exportar painel
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setPendingKind("pdf")}>
                    <FileText className="mr-2 h-4 w-4" />
                    Baixar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setPendingKind("png")}>
                    <FileImage className="mr-2 h-4 w-4" />
                    Baixar PNG
                  </DropdownMenuItem>

                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </div>
      </header>

      <Dialog open={!!pendingKind} onOpenChange={(o) => !o && setPendingKind(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nome da empresa</DialogTitle>
            <DialogDescription>
              O nome aparecerá centralizado no topo do arquivo exportado.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const kind = pendingKind;
              setPendingKind(null);
              if (kind) void exportAs(kind);
            }}
            className="space-y-4"
          >
            <Input
              autoFocus
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Ex.: Core TI Expert"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPendingKind(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!company.trim()}>
                Gerar {pendingKind?.toUpperCase()}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <main ref={captureRef} className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6">
        {captureMode && (
          <div className="border-b pb-4 text-center">
            <h2 className="text-2xl font-black tracking-tight text-foreground">{company}</h2>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Inventário de Desktops · {new Date().toLocaleDateString("pt-BR")}
            </p>
          </div>
        )}


        {machines.length === 0 ? (
          <section
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void handleFiles(e.dataTransfer.files);
            }}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-6 py-24 text-center"
          >
            <Monitor className="h-12 w-12 text-primary" />
            <h1 className="mt-4 text-xl font-bold text-foreground">
              Importe os CSVs das máquinas
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Cada arquivo representa um computador. Selecione ou arraste vários arquivos de uma vez
              — o painel consolida tudo e gera os gráficos e alertas automaticamente.
            </p>
            <Button className="mt-6 gap-2" onClick={() => inputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Selecionar arquivos
            </Button>
          </section>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Kpi
                icon={ShieldOff}
                value={avAlerts.filter((m) => m.antivirusLevel === "none").length}
                label="sem antivírus"
                tone="destructive"
              />
              <Kpi
                icon={HardDrive}
                value={storageAlerts.length}
                label="armazenamento crítico"
                tone="destructive"
              />
              <Kpi icon={Clock} value={osAlerts.length} label="SO desatualizado" tone="warning" />
            </div>

            <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Máquinas
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar hostname, usuário, IP, SO…"
                    className="h-9 w-72 rounded-lg border bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <MachineTable machines={filtered} />
              <p className="border-t px-4 py-2 text-xs text-muted-foreground">
                {filtered.length} de {machines.length} máquinas exibidas
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Insights
              </h2>
              <div className="grid gap-4 lg:grid-cols-3">
                <DonutCard title="Tipo de conexão" data={connectionData} />
                <DonutCard title="Domínio vs Workgroup" data={domainData} />
                <DonutCard title="Versão do SO" data={osData} />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Alertas
              </h2>
              <div className="grid gap-4 lg:grid-cols-3">
                <AlertCard
                  icon={HardDrive}
                  title="Armazenamento crítico"
                  description="Máquinas com mais de 90% utilizado"
                  tone="destructive"
                  rows={storageAlerts.map((m) => ({
                    key: m.id,
                    title: m.hostname,
                    subtitle: m.user,
                    value: `${m.storageUsedPercent}%`,
                    valueSub: `${Math.round(m.storageTotalGb - m.storageFreeGb)}/${Math.round(m.storageTotalGb)} GB`,
                  }))}
                />
                <AlertCard
                  icon={Clock}
                  title="SO desatualizado"
                  description="Mais de 5 anos sem reinstalação"
                  tone="warning"
                  rows={osAlerts.map((m) => ({
                    key: m.id,
                    title: m.hostname,
                    subtitle: m.os,
                    value: `${Math.floor(m.installAgeYears ?? 0)} anos`,
                    valueSub: m.installDate,
                  }))}
                />
                <AlertCard
                  icon={ShieldAlert}
                  title="Antivírus ausente ou fraco"
                  description="Sem proteção ou apenas Windows Defender"
                  tone="destructive"
                  rows={avAlerts.map((m) => ({
                    key: m.id,
                    title: m.hostname,
                    subtitle: m.user,
                    value: m.antivirusLevel === "none" ? "Sem AV" : "Só Defender",
                    valueSub: m.antivirus,
                  }))}
                />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
