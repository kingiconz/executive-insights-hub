import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileSpreadsheet, FileText, Loader2, File as FileIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_app/exports")({ component: ExportsPage });

function ExportsPage() {
  const { user, isAdmin } = useAuth();
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedArea, setSelectedArea] = useState("all");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const { data: businessAreas } = useQuery({
    queryKey: ["business-areas"],
    queryFn: async () => {
      const { data } = await supabase.from("business_areas").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: reports } = useQuery({
    queryKey: ["exports", status, from, to, selectedArea, user?.id, isAdmin],
    queryFn: async () => {
      let q = supabase.from("weekly_reports")
        .select(`
          *, 
          institution:institutions(
            name, 
            business_area:business_areas(id, name)
          )
        `)
        .order("reporting_week", { ascending: false });

      if (status !== "all") q = q.eq("status", status as any);
      if (from) q = q.gte("reporting_week", from);
      if (to) q = q.lte("reporting_week", to);
      if (!isAdmin && user) q = q.eq("submitted_by", user.id);
      
      const { data: reportsData } = await q;
      
      // Client-side filtering for business area since it's nested in institution
      let filtered = reportsData ?? [];
      if (selectedArea !== "all") {
        filtered = filtered.filter((r: any) => r.institution?.business_area?.id === selectedArea);
      }

      const { data: profiles } = await supabase.from("profiles").select("id, full_name");
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) ?? []);
      
      return filtered.map((r: any) => ({
        ...r,
        submitter_name: profileMap.get(r.submitted_by) || "Unknown Submitter"
      }));
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
          r.reporting_week, 
          r.institution?.name, 
          r.institution?.business_area?.name,
          r.submitter_name, 
          r.status, 
          r.priority,
          r.business_prospect, 
          r.competitor_insight, 
          r.industry_insight, 
          r.action_register, 
          r.other_info,
          r.follow_up_date, 
          r.submitted_at,
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

  const downloadPDF = () => {
    setBusy(true);
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      const rows = reports ?? [];
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // 1. Header & Branding
      const logoUrl = "/logo.ico";
      // Increased logo size to 15x15 and aligned vertically with the text
      doc.addImage(logoUrl, "ICO", 14, 11, 15, 15);
      
      doc.setFont("times", "bold");
      doc.setFontSize(22); // Increased font size for better brand presence
      doc.setTextColor(30, 58, 138); // Navy
      doc.text("e-CB INTELLIGENCE", 30, 18);
      
      doc.setFont("times", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("EXECUTIVE SECTOR INTELLIGENCE HUB", 32, 25);
      
      doc.setDrawColor(30, 58, 138);
      doc.setLineWidth(0.5);
      doc.line(14, 32, pageWidth - 14, 32);

      // 2. Metadata
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(`Document ID: BI-EXP-${format(new Date(), "yyyyMMdd")}`, 14, 35);
      doc.text(`Generation Date: ${format(new Date(), "MMMM d, yyyy HH:mm")}`, 14, 40);

      // 3. Main Intelligence Table
      const tableData = rows.map((r: any) => [
        `${format(new Date(r.reporting_week), "MMM d")}\n${r.priority?.toUpperCase() || "MED"}`,
        `${r.institution?.name || "—"}\n(${r.institution?.business_area?.name || "—"})`,
        r.submitter_name || "—",
        r.business_prospect || "—",
        r.industry_insight || "—",
        r.competitor_insight || "—",
        r.action_register || "—"
      ]);

      autoTable(doc, {
        startY: 45,
        head: [["Week /\nPriority", "Institution /\nSector", "Submitter", "Business\nProspects", "Industry\nInsights", "Competitor\nAnalysis", "Action\nRegister"]],
        body: tableData,
        theme: "grid",
        styles: { 
          font: "times", 
          fontSize: 10, // Reduced from 13 for better fit
          textColor: 40,
          cellPadding: 4,
          valign: 'top',
          overflow: 'linebreak'
        },
        headStyles: { 
          fillColor: [30, 58, 138], 
          fontSize: 12, // Increased from 11
          halign: 'center',
          fontStyle: 'bold',
          textColor: 255,
          minCellHeight: 15
        },
        columnStyles: {
          0: { cellWidth: 28, halign: 'center' },
          1: { cellWidth: 42 },
          2: { cellWidth: 32 },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 'auto' },
          5: { cellWidth: 'auto' },
          6: { cellWidth: 'auto' }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
        didParseCell: function(data) {
          if (data.section === 'head') {
            data.cell.styles.valign = 'middle';
          }
        }
      });

      // 4. Footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("times", "normal");
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
        doc.text("UNAUTHORIZED DISTRIBUTION PROHIBITED — e-CB INTELLIGENCE", 14, doc.internal.pageSize.getHeight() - 10);
      }

      doc.save(`e-CB-EXECUTIVE-REPORT-${format(new Date(), "yyyyMMdd")}.pdf`);
      toast.success(`Generated executive report with ${rows.length} records`);
    } catch (e) {
      console.error(e);
      toast.error("Error generating professional report");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl font-semibold text-navy">Export Center</h2>
        <p className="text-sm text-muted-foreground">Generate filtered exports of {isAdmin ? "all team" : "your"} weekly intelligence reports.</p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-elegant space-y-5">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Status">
            <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </Field>
          <Field label="Business Area">
            <select className="form-input" value={selectedArea} onChange={e => setSelectedArea(e.target.value)}>
              <option value="all">All Areas</option>
              {businessAreas?.map(area => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
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
          <motion.button whileHover={{ y: -2 }} onClick={downloadPDF} disabled={busy || !reports?.length}
            className="rounded-xl border bg-gradient-card p-5 text-left hover:shadow-elevated transition-shadow disabled:opacity-50">
            <FileIcon className="h-6 w-6 text-navy mb-2" />
            <p className="font-serif text-lg font-semibold text-navy">Download PDF</p>
            <p className="text-xs text-muted-foreground mt-1">Executive-ready document for offline review</p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-royal">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Export PDF
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
