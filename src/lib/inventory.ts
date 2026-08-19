export type Machine = {
  id: string;
  hostname: string;
  user: string;
  ip: string;
  mac: string;
  connectionType: "Cabo" | "Wi-Fi" | "Desconhecido";
  connectionSpeed: string;
  cpu: string;
  ramGb: number;
  storageFreeGb: number;
  storageTotalGb: number;
  storageUsedPercent: number;
  os: string;
  osFamily: string;
  installDate: string; // dd/MM/yyyy
  installDateObj: Date | null;
  installAgeYears: number | null;
  domain: string;
  isDomain: boolean;
  antivirus: string;
  antivirusLevel: "ok" | "defender" | "none";
  sourceFile: string;
};

function stripQuotes(v: string) {
  return v
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/^"|"$/g, "")
    .trim();
}

function splitLine(line: string, delim: string) {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === delim && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((v) => stripQuotes(v));
}

function detectDelim(header: string) {
  const counts = [";", ",", "\t"].map((d) => ({ d, n: header.split(d).length }));
  counts.sort((a, b) => b.n - a.n);
  return counts[0]!.n > 1 ? counts[0]!.d : ";";
}

function num(v: string) {
  const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function parseStorage(raw: string) {
  // "89 GB Livres de 237 GB"
  const nums = raw.match(/[\d.,]+/g) ?? [];
  const isTb = /TB/i.test(raw);
  const factor = isTb ? 1024 : 1;
  const free = nums[0] ? num(nums[0]) * factor : 0;
  const total = nums[1] ? num(nums[1]) * factor : 0;
  const used = Math.max(total - free, 0);
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  return { free, total, pct };
}

function parseDate(raw: string): Date | null {
  const m = raw.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

function osFamily(os: string) {
  const m = os.match(/Windows\s+(\d+|XP|Vista|Server\s*\d+)/i);
  if (m) return `Windows ${m[1]}`.replace(/\s+/g, " ");
  if (/linux|ubuntu|debian/i.test(os)) return "Linux";
  if (/mac/i.test(os)) return "macOS";
  return os || "Desconhecido";
}

function antivirusLevel(av: string): Machine["antivirusLevel"] {
  const v = av.trim().toLowerCase();
  if (!v || v === "nenhum" || v === "none" || v === "n/a" || v === "-") return "none";
  if (v.includes("defender")) return "defender";
  return "ok";
}

const KEYS: Record<string, string[]> = {
  hostname: ["hostname", "nome", "computador"],
  user: ["usuario_logado", "usuario", "user"],
  ip: ["ip"],
  mac: ["mac"],
  net: ["rede_tipo/velocidade", "rede", "conexao"],
  cpu: ["processador", "cpu"],
  ram: ["memoria_gb", "memoria", "ram"],
  storage: ["armazenamento", "disco"],
  os: ["sistema_operacional", "so"],
  install: ["data_instalacao_windows", "data_instalacao", "instalacao"],
  domain: ["dominio_grupo", "dominio"],
  av: ["antivirus", "antivírus"],
};

function normKey(k: string) {
  return k
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function pick(row: Record<string, string>, group: keyof typeof KEYS) {
  for (const cand of KEYS[group]!) {
    if (row[cand] !== undefined && row[cand] !== "") return row[cand];
  }
  return "";
}

export function parseCsv(text: string, fileName: string): Machine[] {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const delim = detectDelim(lines[0]!);
  const headers = splitLine(lines[0]!, delim).map(normKey);

  return lines.slice(1).map((line, idx) => {
    const cells = splitLine(line, delim);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));

    const netRaw = pick(row, "net");
    const connectionType: Machine["connectionType"] = /wi-?fi|wireless|wlan/i.test(netRaw)
      ? "Wi-Fi"
      : /cabo|ethernet|lan|cable/i.test(netRaw)
        ? "Cabo"
        : "Desconhecido";
    const speed = netRaw.match(/[\d.,]+\s*(gbps|mbps|gb\/s|mb\/s)/i)?.[0] ?? "";

    const storage = parseStorage(pick(row, "storage"));
    const os = pick(row, "os").replace(/^Microsoft\s+/i, "");
    const installRaw = pick(row, "install");
    const installDateObj = parseDate(installRaw);
    const ageYears = installDateObj ? (Date.now() - installDateObj.getTime()) / (365.25 * 24 * 3600 * 1000) : null;
    const domain = pick(row, "domain");
    const av = pick(row, "av");
    const hostname = pick(row, "hostname") || `SEM-NOME-${idx + 1}`;

    return {
      id: `${fileName}#${hostname}#${idx}`,
      hostname,
      user: pick(row, "user").replace(/^.*\\/, ""),
      ip: pick(row, "ip"),
      mac: pick(row, "mac"),
      connectionType,
      connectionSpeed: speed,
      cpu: pick(row, "cpu"),
      ramGb: Math.round(num(pick(row, "ram"))),
      storageFreeGb: storage.free,
      storageTotalGb: storage.total,
      storageUsedPercent: storage.pct,
      os,
      osFamily: osFamily(os),
      installDate: installRaw,
      installDateObj,
      installAgeYears: ageYears,
      domain,
      isDomain: !!domain && !/workgroup/i.test(domain),
      antivirus: av || "Nenhum",
      antivirusLevel: antivirusLevel(av),
      sourceFile: fileName,
    };
  });
}

export const STORAGE_CRITICAL = 90;
export const OS_OLD_YEARS = 5;

export function isStorageCritical(m: Machine) {
  return m.storageTotalGb > 0 && m.storageUsedPercent >= STORAGE_CRITICAL;
}
export function isOsOld(m: Machine) {
  return m.installAgeYears !== null && m.installAgeYears >= OS_OLD_YEARS;
}
export function isAvWeak(m: Machine) {
  return m.antivirusLevel !== "ok";
}

export function countBy<T extends string>(items: T[]) {
  const map = new Map<T, number>();
  for (const i of items) map.set(i, (map.get(i) ?? 0) + 1);
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}

export const CSV_TEMPLATE = [
  '"Hostname";"Usuario_Logado";"IP";"MAC";"Rede_Tipo/Velocidade";"Processador";"Memoria_GB";"Armazenamento";"Sistema_Operacional";"Data_Instalacao_Windows";"Dominio_Grupo";"Antivirus"',
  '"CORE-CORD-01";"CORETEC\\filipe.rosa";"10.62.102.183";"24:FE:9A:04:B7:99";"Wi-Fi 360 Mbps";"11th Gen Intel(R) Core(TM) i5-1135G7 @ 2.40GHz";"11,79";"89 GB Livres de 237 GB";"Microsoft Windows 11 Pro";"04/02/2026";"CORETEC.BR";"Windows Defender"',
].join("\n");

const EXPORT_HEADERS = [
  "Hostname",
  "Usuario_Logado",
  "IP",
  "MAC",
  "Rede_Tipo/Velocidade",
  "Processador",
  "Memoria_GB",
  "Armazenamento",
  "Sistema_Operacional",
  "Data_Instalacao_Windows",
  "Dominio_Grupo",
  "Antivirus",
  "Arquivo_Origem",
];

function csvCell(v: string | number) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

export function machinesToCsv(machines: Machine[]) {
  const rows = machines.map((m) =>
    [
      m.hostname,
      m.user,
      m.ip,
      m.mac,
      [m.connectionType, m.connectionSpeed].filter(Boolean).join(" "),
      m.cpu,
      String(m.ramGb).replace(".", ","),
      m.storageTotalGb > 0
        ? `${Math.round(m.storageFreeGb)} GB Livres de ${Math.round(m.storageTotalGb)} GB`
        : "",
      m.os,
      m.installDate,
      m.domain,
      m.antivirus,
      m.sourceFile,
    ]
      .map(csvCell)
      .join(";"),
  );
  return [EXPORT_HEADERS.map(csvCell).join(";"), ...rows].join("\n");
}
