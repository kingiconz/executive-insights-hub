import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { startOfWeek, format } from "date-fns";
import { STAGES, STATUSES } from "@/lib/pipeline";

export const Route = createFileRoute("/_app/import")({ component: ImportPage });

type Mode = "reports" | "opportunities";
type ParsedRow = { row: Record<string, any>; status: "ok" | "warn" | "error"; messages: string[]; payload?: any };

const REPORT_COLUMNS = [
  "institution", "business_prospect", "competitor_insight", "industry_insight",
  "action_register", "other_info", "priority", "follow_up_date", "reporting_week",
];
const OPP_COLUMNS = [
  "title", "institution", "service_category", "description", "stage", "status",
  "estimated_value", "probability", "expected_close_date", "next_follow_up_date",
];

function ImportPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("reports");
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: institutions } = useQuery({
    queryKey: ["import-institutions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("institutions")
        .select("id, name, business_area_id, business_area:business_areas(id, name)").order("name");
      return data ?? [];
    },
  });

  const instLookup = useMemo(() => {
    const m = new Map<string, any>();
    (institutions ?? []).forEach(i => m.set(normalize(i.name), i));
    return m;
  }, [institutions]);

  if (isAdmin) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <p className="font-serif text-lg text-navy">Import is for team members only</p>
        <p className="text-sm text-muted-foreground mt-1">Administrators oversee submissions; they do not bulk-load data.</p>
      </div>
    );
  }

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setParsed(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "", raw: false });
      if (rows.length === 0) { toast.error("Sheet is empty"); return; }
      const validated = rows.map(r => validateRow(r, mode, instLookup));
      setParsed(validated);
      const errs = validated.filter(v => v.status === "error").length;
      toast.success(`Parsed ${rows.length} rows · ${rows.length - errs} ready · ${errs} skipped`);
    } catch (e: any) {
      toast.error("Failed to parse: " + e.message);
    }
  };

  const submit = async () => {
    if (!parsed || !user) return;
    const ready = parsed.filter(p => p.status !== "error" && p.payload);
    if (ready.length === 0) { toast.error("No valid rows to import"); return; }
    setSubmitting(true);
    try {
      if (mode === "reports") {
        const payloads = ready.map(r => ({ ...r.payload, submitted_by: user.id }));
        const { error } = await supabase.from("weekly_reports").insert(payloads as any);
        if (error) throw error;
        toast.success(`Imported ${payloads.length} weekly reports`);
        qc.invalidateQueries({ queryKey: ["reports"] });
      } else {
        const payloads = ready.map(r => ({ ...r.payload, created_by: user.id }));
        const { error } = await supabase.from("opportunities").insert(payloads as any);
        if (error) throw error;
        toast.success(`Imported ${payloads.length} opportunities`);
        qc.invalidateQueries({ queryKey: ["opps"] });
      }
      setParsed(null);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      toast.error("Import failed: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const cols = mode === "reports" ? REPORT_COLUMNS : OPP_COLUMNS;
    const example = mode === "reports"
      ? [{
          institution: "Example Bank Plc", business_prospect: "Treasury upgrade discussion",
          competitor_insight: "Competitor X pitching FX desk", industry_insight: "Rate cut expected Q4",
          action_register: "Send proposal by Friday", other_info: "", priority: "high",
          follow_up_date: "2026-06-15", reporting_week: format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
        }]
      : [{
          title: "Treasury services mandate", institution: "Example Bank Plc",
          service_category: "Treasury", description: "Multi-year mandate", stage: "qualification",
          status: "open", estimated_value: 250000, probability: 40,
          expected_close_date: "2026-09-30", next_follow_up_date: "2026-06-20",
        }];
    const ws = XLSX.utils.json_to_sheet(example, { header: cols });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, mode === "reports" ? "Weekly Reports" : "Opportunities");
    XLSX.writeFile(wb, `${mode}_template.xlsx`);
  };

  const stats = parsed ? {
    total: parsed.length,
    ok: parsed.filter(p => p.status === "ok").length,
    warn: parsed.filter(p => p.status === "warn").length,
    err: parsed.filter(p => p.status === "error").length,
  } : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Bulk Operations</p>
        <h2 className="font-serif text-3xl font-semibold text-navy">Import from Excel</h2>
        <p className="text-sm text-muted-foreground">Upload your existing spreadsheets to populate weekly reports or pipeline opportunities.</p>
      </div>

      <div className="flex gap-2">
        {(["reports", "opportunities"] as Mode[]).map(m => (
          <button key={m} onClick={() => { setMode(m); setParsed(null); setFileName(""); }}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${mode === m ? "bg-navy text-navy-foreground shadow-elegant" : "bg-card border hover:bg-muted"}`}>
            {m === "reports" ? "Weekly Reports" : "Pipeline Opportunities"}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2 rounded-xl border bg-card p-6 shadow-elegant">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg text-navy">Upload spreadsheet</h3>
            <button onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 text-xs text-royal hover:underline">
              <Download className="h-3.5 w-3.5" /> Download template
            </button>
          </div>

          <label className="block border-2 border-dashed rounded-xl p-10 text-center cursor-pointer hover:bg-muted/30 transition-colors">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <Upload className="h-8 w-8 mx-auto text-navy/60 mb-2" />
            <p className="text-sm font-medium text-navy">{fileName || "Drop or click to select an .xlsx, .xls or .csv file"}</p>
            <p className="text-xs text-muted-foreground mt-1">First sheet will be parsed. Column headers must match the template.</p>
          </label>

          {stats && (
            <div className="mt-5 grid grid-cols-4 gap-3">
              <Stat label="Total rows" value={stats.total} tone="navy" />
              <Stat label="Ready" value={stats.ok} tone="emerald" />
              <Stat label="Warnings" value={stats.warn} tone="amber" />
              <Stat label="Skipped" value={stats.err} tone="red" />
            </div>
          )}

          {parsed && (
            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={() => { setParsed(null); setFileName(""); if (fileRef.current) fileRef.current.value = ""; }}
                className="h-10 px-4 rounded-md border text-sm hover:bg-muted">Clear</button>
              <button onClick={submit} disabled={submitting || !parsed.some(p => p.status !== "error")}
                className="h-10 px-5 rounded-md bg-navy text-navy-foreground inline-flex items-center gap-2 shadow-elegant disabled:opacity-50">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Import {parsed.filter(p => p.status !== "error").length} rows
              </button>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-xl border bg-gradient-card p-6 shadow-elegant">
          <FileSpreadsheet className="h-5 w-5 text-navy mb-3" />
          <h4 className="font-serif text-base text-navy mb-2">Required columns</h4>
          <ul className="space-y-1.5 text-xs text-foreground/80">
            {(mode === "reports" ? REPORT_COLUMNS : OPP_COLUMNS).map(c => (
              <li key={c} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-royal" />
                <code className="font-mono">{c}</code>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground space-y-2">
            <p><strong className="text-navy">Institution</strong> matched by name (case-insensitive). Must already exist in your assigned business areas.</p>
            {mode === "opportunities" && (
              <p><strong className="text-navy">Stage</strong>: {STAGES.map(s => s.key).join(", ")}</p>
            )}
            {mode === "reports" && (
              <p><strong className="text-navy">Priority</strong>: low, medium, high, critical</p>
            )}
          </div>
        </motion.div>
      </div>

      {parsed && parsed.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border bg-card shadow-elegant overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/30">
            <h3 className="font-serif text-base text-navy">Preview</h3>
          </div>
          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-xs">
              <thead className="bg-muted/20 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground w-10">#</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">{mode === "reports" ? "Institution" : "Title"}</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Details</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((p, i) => (
                  <tr key={i} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2">
                      {p.status === "ok" && <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Ready</span>}
                      {p.status === "warn" && <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3 w-3" /> Warning</span>}
                      {p.status === "error" && <span className="inline-flex items-center gap-1 text-red-700"><AlertTriangle className="h-3 w-3" /> Skip</span>}
                    </td>
                    <td className="px-3 py-2 font-medium text-navy">
                      {mode === "reports" ? (p.row.institution || "—") : (p.row.title || "—")}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {mode === "reports"
                        ? truncate(p.row.business_prospect || p.row.industry_insight || p.row.competitor_insight, 60)
                        : `${p.row.stage || "—"} · ${p.row.estimated_value || 0}`}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{p.messages.join("; ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      <div className="text-xs text-muted-foreground">
        After import you can edit individual records in <Link to="/reports" className="text-royal hover:underline">Weekly Reports</Link> or <Link to="/opportunities" className="text-royal hover:underline">Opportunities</Link>.
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "navy" | "emerald" | "amber" | "red" }) {
  const toneCls = { navy: "text-navy", emerald: "text-emerald-700", amber: "text-amber-700", red: "text-red-700" }[tone];
  return (
    <div className="rounded-lg border p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold mt-1 ${toneCls}`}>{value}</p>
    </div>
  );
}

function normalize(s: string) { return String(s ?? "").trim().toLowerCase(); }
function truncate(s: any, n: number) { const str = String(s ?? ""); return str.length > n ? str.slice(0, n) + "…" : str; }

function parseDate(v: any): string | null {
  if (!v) return null;
  if (v instanceof Date) return format(v, "yyyy-MM-dd");
  const d = new Date(v);
  if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
  return null;
}

function validateRow(row: Record<string, any>, mode: Mode, instLookup: Map<string, any>): ParsedRow {
  const messages: string[] = [];
  const instName = String(row.institution ?? "").trim();
  const inst = instLookup.get(normalize(instName));

  if (!instName) {
    return { row, status: "error", messages: ["Missing institution"] };
  }
  if (!inst) {
    return { row, status: "error", messages: [`Institution "${instName}" not found / not in your assigned areas`] };
  }

  if (mode === "reports") {
    const priority = ["low", "medium", "high", "critical"].includes(String(row.priority).toLowerCase())
      ? String(row.priority).toLowerCase() : "medium";
    if (row.priority && priority !== String(row.priority).toLowerCase()) messages.push(`priority defaulted to medium`);
    const week = parseDate(row.reporting_week) ?? format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    if (!row.reporting_week) messages.push("reporting_week defaulted to current week");

    const payload = {
      institution_id: inst.id,
      business_area_id: inst.business_area_id,
      reporting_week: week,
      business_prospect: row.business_prospect || null,
      competitor_insight: row.competitor_insight || null,
      industry_insight: row.industry_insight || null,
      action_register: row.action_register || null,
      other_info: row.other_info || null,
      priority,
      follow_up_date: parseDate(row.follow_up_date),
      status: "draft",
    };
    return { row, status: messages.length ? "warn" : "ok", messages, payload };
  } else {
    const title = String(row.title ?? "").trim();
    if (!title) return { row, status: "error", messages: ["Missing opportunity title"] };

    const stageKeys = STAGES.map(s => s.key) as string[];
    const stage = stageKeys.includes(String(row.stage)) ? row.stage : "lead_generation";
    if (row.stage && stage !== row.stage) messages.push(`stage "${row.stage}" invalid → lead_generation`);

    const status = (STATUSES as readonly string[]).includes(String(row.status)) ? row.status : "open";
    if (row.status && status !== row.status) messages.push(`status defaulted to open`);

    const probability = Math.max(0, Math.min(100, Number(row.probability) || 20));
    const estimated_value = Number(row.estimated_value) || 0;

    const payload = {
      title,
      description: row.description || null,
      institution_id: inst.id,
      business_area_id: inst.business_area_id,
      service_category: row.service_category || null,
      stage, status,
      estimated_value, probability,
      expected_close_date: parseDate(row.expected_close_date),
      next_follow_up_date: parseDate(row.next_follow_up_date),
    };
    return { row, status: messages.length ? "warn" : "ok", messages, payload };
  }
}
