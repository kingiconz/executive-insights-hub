import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/exports")({ component: ExportsPage });

function ExportsPage() {
  const { user, isAdmin } = useAuth();
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: reports } = useQuery({
    queryKey: ["export-reports", isAdmin, user?.id, status, from, to],
    queryFn: async () => {
      let q = supabase.from("weekly_reports")
        .select("*, institution:institutions(name, business_area:business_areas(name)), submitter:profiles!weekly_reports_submitted_by_fkey(full_name)")
        .order("reporting_week", { ascending: false });
      if (status !== "all") q = q.eq("status", status as any);
      if (from) q = q.gte("reporting_week", from);
      if (to) q = q.lte("reporting_week", to);
      const { data } = await q;
      return data ?? [];
    },
  });

  const downloadCSV = () => {
    setBusy(true);
    try {
      const rows = reports ?? [];
      const headers = ["Week", "Institution", "Business Area", "Submitter", "Status", "Priority",
        "Business Prospect", "Competitor Insight", "Industry Insight", "Action Register", "Other Info", "Follow-up Date", "Submitted At"];
      const csv = [
        headers.join(","),
        ...rows.map((r: any) => [
          r.reporting_week, r.institution?.name, r.institution?.business_area?.name,
          r.submitter?.full_name, r.status, r.priority,
          r.business_prospect, r.competitor_insight, r.industry_insight, r.action_register, r.other_info,
          r.follow_up_date, r.submitted_at,
        ].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `weekly-reports-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} reports`);
    } finally {
      setBusy(false);
    }
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(reports ?? [], null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `weekly-reports-${format(new Date(), "yyyy-MM-dd")}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON exported");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl font-semibold text-navy">Export Center</h2>
        <p className="text-sm text-muted-foreground">Generate filtered exports of {isAdmin ? "all team" : "your"} weekly intelligence reports.</p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-elegant space-y-5">
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Status">
            <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </Field>
          <Field label="From week">
            <input type="date" className="form-input" value={from} onChange={e => setFrom(e.target.value)} />
          </Field>
          <Field label="To week">
            <input type="date" className="form-input" value={to} onChange={e => setTo(e.target.value)} />
          </Field>
        </div>

        <div className="rounded-lg bg-muted/40 border border-dashed px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-serif text-2xl text-navy mr-2">{reports?.length ?? 0}</span>
            matching reports ready for export
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <motion.button whileHover={{ y: -2 }} onClick={downloadCSV} disabled={busy || !reports?.length}
            className="rounded-xl border bg-gradient-card p-5 text-left hover:shadow-elevated transition-shadow disabled:opacity-50">
            <FileSpreadsheet className="h-6 w-6 text-royal mb-2" />
            <p className="font-serif text-lg font-semibold text-navy">Download CSV</p>
            <p className="text-xs text-muted-foreground mt-1">Excel-ready spreadsheet with all fields</p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-royal">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Export CSV
            </div>
          </motion.button>
          <motion.button whileHover={{ y: -2 }} onClick={downloadJSON} disabled={!reports?.length}
            className="rounded-xl border bg-gradient-card p-5 text-left hover:shadow-elevated transition-shadow disabled:opacity-50">
            <FileText className="h-6 w-6 text-navy mb-2" />
            <p className="font-serif text-lg font-semibold text-navy">Download JSON</p>
            <p className="text-xs text-muted-foreground mt-1">Structured data for integrations and pipelines</p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-royal">
              <Download className="h-3 w-3" /> Export JSON
            </div>
          </motion.button>
        </div>

        <style>{`.form-input{width:100%;border:1px solid var(--border);border-radius:0.5rem;background:var(--background);padding:0.6rem 0.85rem;font-family:var(--font-serif);font-size:0.95rem;outline:none}.form-input:focus{border-color:var(--royal);box-shadow:0 0 0 3px color-mix(in oklab,var(--royal) 18%, transparent)}`}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
