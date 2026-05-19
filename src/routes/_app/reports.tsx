import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Save, Send, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { startOfWeek, format } from "date-fns";
import { StatusBadge } from "./dashboard";

export const Route = createFileRoute("/_app/reports")({ component: ReportsPage });

const WEEK = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

function ReportsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [composing, setComposing] = useState(false);

  const { data: reports } = useQuery({
    queryKey: ["my-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("weekly_reports")
        .select("*, institution:institutions(name, business_area:business_areas(name))")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-navy">Weekly Reports</h2>
          <p className="text-sm text-muted-foreground">Submit and track your institution intelligence reports.</p>
        </div>
        <button onClick={() => setComposing(true)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-navy text-navy-foreground hover:opacity-90 transition-opacity shadow-elegant">
          <Plus className="h-4 w-4" /> New report
        </button>
      </div>

      <div className="rounded-xl border bg-card shadow-elegant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-[0.12em]">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Institution</th>
                <th className="px-6 py-3 text-left font-medium">Business Area</th>
                <th className="px-6 py-3 text-left font-medium">Week</th>
                <th className="px-6 py-3 text-left font-medium">Priority</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(reports ?? []).map((r: any, i: number) => (
                <motion.tr key={r.id}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * i }}
                  className="border-t hover:bg-muted/30 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-navy">{r.institution?.name}</td>
                  <td className="px-6 py-4">{r.institution?.business_area?.name}</td>
                  <td className="px-6 py-4">{format(new Date(r.reporting_week), "MMM d, yyyy")}</td>
                  <td className="px-6 py-4 capitalize">{r.priority}</td>
                  <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                </motion.tr>
              ))}
              {(!reports || reports.length === 0) && (
                <tr><td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">No reports yet — start by composing your first weekly submission.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {composing && user && (
          <ComposeReport
            onClose={() => setComposing(false)}
            onSaved={() => { qc.invalidateQueries({ queryKey: ["my-reports"] }); setComposing(false); }}
            userId={user.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ComposeReport({ onClose, onSaved, userId }: { onClose: () => void; onSaved: () => void; userId: string }) {
  const { data: institutions } = useQuery({
    queryKey: ["compose-institutions"],
    queryFn: async () => (await supabase.from("institutions").select("id, name, business_area_id, business_area:business_areas(name)").order("name")).data ?? [],
  });

  const [form, setForm] = useState({
    institution_id: "", business_prospect: "", competitor_insight: "",
    industry_insight: "", action_register: "", other_info: "",
    priority: "medium" as const, follow_up_date: "",
  });

  const save = useMutation({
    mutationFn: async (status: "draft" | "submitted") => {
      const inst = institutions?.find(i => i.id === form.institution_id);
      if (!inst) throw new Error("Select an institution");
      const payload = {
        institution_id: inst.id,
        business_area_id: inst.business_area_id,
        submitted_by: userId,
        reporting_week: WEEK,
        business_prospect: form.business_prospect || null,
        competitor_insight: form.competitor_insight || null,
        industry_insight: form.industry_insight || null,
        action_register: form.action_register || null,
        other_info: form.other_info || null,
        priority: form.priority,
        follow_up_date: form.follow_up_date || null,
        status,
        submitted_at: status === "submitted" ? new Date().toISOString() : null,
      };
      const { error } = await supabase.from("weekly_reports").insert(payload);
      if (error) throw error;
    },
    onSuccess: (_, status) => { toast.success(status === "submitted" ? "Report submitted" : "Draft saved"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-t-2xl md:rounded-2xl w-full max-w-3xl shadow-elevated max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-card z-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Compose</p>
            <h3 className="font-serif text-xl font-semibold text-navy">Weekly intelligence report</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Institution">
              <select className="form-input" value={form.institution_id} onChange={e => setForm({ ...form, institution_id: e.target.value })}>
                <option value="">Select institution...</option>
                {institutions?.map(i => <option key={i.id} value={i.id}>{i.name} — {(i as any).business_area?.name}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select className="form-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })}>
                <option value="low">Low</option><option value="medium">Medium</option>
                <option value="high">High</option><option value="critical">Critical</option>
              </select>
            </Field>
          </div>

          <Field label="Business Prospect">
            <textarea rows={3} className="form-input" value={form.business_prospect} onChange={e => setForm({ ...form, business_prospect: e.target.value })} placeholder="Opportunities, pipeline, partnership signals..." />
          </Field>
          <Field label="Competitor Insight">
            <textarea rows={3} className="form-input" value={form.competitor_insight} onChange={e => setForm({ ...form, competitor_insight: e.target.value })} placeholder="Competitor moves, pricing, positioning..." />
          </Field>
          <Field label="Industry Insight">
            <textarea rows={3} className="form-input" value={form.industry_insight} onChange={e => setForm({ ...form, industry_insight: e.target.value })} placeholder="Sector trends, regulation, market shifts..." />
          </Field>
          <Field label="Action Register">
            <textarea rows={3} className="form-input" value={form.action_register} onChange={e => setForm({ ...form, action_register: e.target.value })} placeholder="Next steps, follow-ups, owners..." />
          </Field>
          <Field label="Other Relevant Information">
            <textarea rows={2} className="form-input" value={form.other_info} onChange={e => setForm({ ...form, other_info: e.target.value })} />
          </Field>

          <Field label="Follow-up date">
            <input type="date" className="form-input" value={form.follow_up_date} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} />
          </Field>
        </div>

        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between sticky bottom-0">
          <p className="text-xs text-muted-foreground">Week of {format(new Date(WEEK), "MMMM d, yyyy")}</p>
          <div className="flex gap-2">
            <button onClick={() => save.mutate("draft")} disabled={save.isPending}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md border bg-card hover:bg-muted text-sm">
              <Save className="h-4 w-4" /> Save draft
            </button>
            <button onClick={() => save.mutate("submitted")} disabled={save.isPending}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-gradient-navy text-white text-sm shadow-elegant">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit
            </button>
          </div>
        </div>

        <style>{`.form-input{width:100%;border:1px solid var(--border);border-radius:0.5rem;background:var(--background);padding:0.6rem 0.85rem;font-family:var(--font-serif);font-size:0.95rem;outline:none;transition:border-color .2s, box-shadow .2s}.form-input:focus{border-color:var(--royal);box-shadow:0 0 0 3px color-mix(in oklab,var(--royal) 18%, transparent)}`}</style>
      </motion.div>
    </motion.div>
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
