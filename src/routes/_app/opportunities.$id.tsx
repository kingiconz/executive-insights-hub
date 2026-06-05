import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, Check, Plus, Trash2, FileText, Activity as ActIcon, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  STAGES, STATUSES, STATUS_LABEL, STATUS_TONE, PROPOSAL_KINDS, PROPOSAL_STATUSES,
  ACTIVITY_KINDS, stageLabel, fmtCurrency, healthOf, HEALTH_TONE,
} from "@/lib/pipeline";

export const Route = createFileRoute("/_app/opportunities/$id")({ component: OpportunityDetail });

function OpportunityDetail() {
  const { id } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: opp, isLoading } = useQuery({
    queryKey: ["opp", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("opportunities")
        .select("*, institution:institutions(id,name,location), business_area:business_areas(id,name)")
        .eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: proposals } = useQuery({
    queryKey: ["opp-proposals", id],
    queryFn: async () => (await supabase.from("opportunity_proposals").select("*").eq("opportunity_id", id).order("proposal_date", { ascending: false })).data ?? [],
  });

  const { data: activities } = useQuery({
    queryKey: ["opp-activities", id],
    queryFn: async () => (await supabase.from("opportunity_activities").select("*").eq("opportunity_id", id).order("activity_date", { ascending: false })).data ?? [],
  });

  const updateOpp = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from("opportunities").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opp", id] }); toast.success("Updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeOpp = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("opportunities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); navigate({ to: "/opportunities" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // proposal form
  const [pf, setPf] = useState({ kind: "bespoke_sent", version: "v1", value: 0, status: "sent", proposal_date: new Date().toISOString().slice(0,10), document_url: "", notes: "" });
  const addProposal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("opportunity_proposals").insert({
        opportunity_id: id, ...pf, value: Number(pf.value) || 0, created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opp-proposals", id] }); toast.success("Proposal logged"); setPf({ ...pf, notes: "", version: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // activity form
  const [af, setAf] = useState({ kind: "meeting", activity_date: new Date().toISOString().slice(0,10), outcome: "", next_action: "", next_action_date: "" });
  const addActivity = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("opportunity_activities").insert({
        opportunity_id: id, ...af, next_action_date: af.next_action_date || null, created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opp-activities", id] });
      updateOpp.mutate({ last_engagement_date: af.activity_date });
      toast.success("Activity logged");
      setAf({ kind: "meeting", activity_date: new Date().toISOString().slice(0,10), outcome: "", next_action: "", next_action_date: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !opp) return <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>;

  const stageIdx = STAGES.findIndex(s => s.key === opp.stage);
  const health = healthOf(opp as any);

  return (
    <div className="space-y-6">
      <Link to="/opportunities" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Back to opportunities
      </Link>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-gradient-card p-6 shadow-elegant">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{(opp.business_area as any)?.name}</p>
            <h2 className="font-serif text-2xl md:text-3xl text-navy font-semibold">{opp.title}</h2>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{(opp.institution as any)?.name}</span>
              {opp.service_category && <span>• {opp.service_category}</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <select value={opp.status} onChange={e => updateOpp.mutate({ status: e.target.value })}
                className={`h-9 px-3 rounded-md border text-xs font-semibold uppercase tracking-wider ${STATUS_TONE[opp.status as keyof typeof STATUS_TONE]}`}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
              <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider ${HEALTH_TONE[health]}`}>{health.replace("_", " ")}</span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-navy">{fmtCurrency(opp.estimated_value)}</p>
              <p className="text-xs text-muted-foreground">{opp.probability}% probability</p>
            </div>
          </div>
        </div>

        {opp.description && <p className="text-sm text-foreground/80 mt-4 leading-relaxed">{opp.description}</p>}

        {/* Stage timeline */}
        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">Pipeline Stage</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {STAGES.map((s, i) => {
              const done = i < stageIdx, current = i === stageIdx;
              return (
                <button key={s.key} onClick={() => updateOpp.mutate({ stage: s.key })}
                  className={`flex-1 min-w-[110px] text-left rounded-lg p-3 border transition-all ${
                    current ? "bg-navy text-navy-foreground border-navy shadow-elegant" :
                    done ? "bg-navy/10 border-navy/20 text-navy" :
                    "bg-card border-border text-muted-foreground hover:border-navy/30"
                  }`}>
                  <div className="flex items-center gap-1 mb-1">
                    {(done || current) && <Check className="h-3 w-3" />}
                    <span className="text-[10px] uppercase tracking-wider">Stage {i + 1}</span>
                  </div>
                  <p className="text-xs font-medium leading-tight">{s.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick fields */}
        <div className="grid md:grid-cols-4 gap-3 mt-6">
          <Field label="Estimated Value" type="number" value={opp.estimated_value ?? 0}
            onSave={v => updateOpp.mutate({ estimated_value: Number(v) })} />
          <Field label="Probability %" type="number" value={opp.probability}
            onSave={v => updateOpp.mutate({ probability: Number(v) })} />
          <Field label="Expected Close" type="date" value={opp.expected_close_date ?? ""}
            onSave={v => updateOpp.mutate({ expected_close_date: v || null })} />
          <Field label="Next Follow-up" type="date" value={opp.next_follow_up_date ?? ""}
            onSave={v => updateOpp.mutate({ next_follow_up_date: v || null })} />
        </div>

        {(isAdmin || opp.created_by === user?.id) && (
          <div className="mt-4 pt-4 border-t flex justify-end">
            <button onClick={() => { if (confirm("Delete this opportunity?")) removeOpp.mutate(); }}
              className="text-xs text-red-600 hover:underline inline-flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> Delete opportunity
            </button>
          </div>
        )}
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Proposals */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border bg-card p-6 shadow-elegant">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-navy" />
            <h3 className="font-serif text-lg text-navy">Proposals</h3>
            <span className="text-xs text-muted-foreground ml-auto">{proposals?.length ?? 0}</span>
          </div>

          <div className="space-y-2 mb-4">
            {proposals?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No proposals logged yet.</p>}
            {proposals?.map(p => (
              <div key={p.id} className="p-3 rounded-lg border bg-background/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy">
                      {PROPOSAL_KINDS.find(k => k.key === p.kind)?.label}
                      {p.version && <span className="text-xs text-muted-foreground ml-2">{p.version}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(p.proposal_date).toLocaleDateString()} • {p.status}</p>
                  </div>
                  <span className="text-sm font-semibold text-royal">{fmtCurrency(p.value)}</span>
                </div>
                {p.notes && <p className="text-xs text-foreground/70 mt-2">{p.notes}</p>}
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Log proposal</p>
            <div className="grid grid-cols-2 gap-2">
              <select value={pf.kind} onChange={e => setPf({ ...pf, kind: e.target.value })} className="h-9 px-2 border rounded-md text-xs bg-background">
                {PROPOSAL_KINDS.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
              </select>
              <select value={pf.status} onChange={e => setPf({ ...pf, status: e.target.value })} className="h-9 px-2 border rounded-md text-xs bg-background">
                {PROPOSAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input placeholder="Version" value={pf.version} onChange={e => setPf({ ...pf, version: e.target.value })} className="h-9 px-2 border rounded-md text-xs bg-background" />
              <input type="number" placeholder="Value" value={pf.value} onChange={e => setPf({ ...pf, value: Number(e.target.value) })} className="h-9 px-2 border rounded-md text-xs bg-background" />
              <input type="date" value={pf.proposal_date} onChange={e => setPf({ ...pf, proposal_date: e.target.value })} className="h-9 px-2 border rounded-md text-xs bg-background" />
              <input placeholder="Document URL" value={pf.document_url} onChange={e => setPf({ ...pf, document_url: e.target.value })} className="h-9 px-2 border rounded-md text-xs bg-background" />
              <textarea placeholder="Notes" value={pf.notes} onChange={e => setPf({ ...pf, notes: e.target.value })} rows={2} className="col-span-2 px-2 py-1 border rounded-md text-xs bg-background" />
            </div>
            <button onClick={() => addProposal.mutate()} disabled={addProposal.isPending}
              className="w-full h-9 rounded-md bg-navy text-navy-foreground text-xs inline-flex items-center justify-center gap-1 disabled:opacity-50">
              <Plus className="h-3 w-3" /> Add proposal
            </button>
          </div>
        </motion.div>

        {/* Activities */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-xl border bg-card p-6 shadow-elegant">
          <div className="flex items-center gap-2 mb-4">
            <ActIcon className="h-4 w-4 text-navy" />
            <h3 className="font-serif text-lg text-navy">Activity Timeline</h3>
            <span className="text-xs text-muted-foreground ml-auto">{activities?.length ?? 0}</span>
          </div>

          <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
            {activities?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No activities logged yet.</p>}
            {activities?.map(a => (
              <div key={a.id} className="p-3 rounded-lg border bg-background/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-navy capitalize">
                    {ACTIVITY_KINDS.find(k => k.key === a.kind)?.label ?? a.kind}
                  </p>
                  <span className="text-xs text-muted-foreground">{new Date(a.activity_date).toLocaleDateString()}</span>
                </div>
                {a.outcome && <p className="text-xs text-foreground/80 mt-1">{a.outcome}</p>}
                {a.next_action && (
                  <p className="text-xs text-royal mt-2">
                    → {a.next_action}
                    {a.next_action_date && <span className="text-muted-foreground ml-1">({new Date(a.next_action_date).toLocaleDateString()})</span>}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Log activity</p>
            <div className="grid grid-cols-2 gap-2">
              <select value={af.kind} onChange={e => setAf({ ...af, kind: e.target.value })} className="h-9 px-2 border rounded-md text-xs bg-background">
                {ACTIVITY_KINDS.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
              </select>
              <input type="date" value={af.activity_date} onChange={e => setAf({ ...af, activity_date: e.target.value })} className="h-9 px-2 border rounded-md text-xs bg-background" />
              <textarea placeholder="Outcome / notes" value={af.outcome} onChange={e => setAf({ ...af, outcome: e.target.value })} rows={2} className="col-span-2 px-2 py-1 border rounded-md text-xs bg-background" />
              <input placeholder="Next action" value={af.next_action} onChange={e => setAf({ ...af, next_action: e.target.value })} className="h-9 px-2 border rounded-md text-xs bg-background" />
              <input type="date" value={af.next_action_date} onChange={e => setAf({ ...af, next_action_date: e.target.value })} className="h-9 px-2 border rounded-md text-xs bg-background" />
            </div>
            <button onClick={() => addActivity.mutate()} disabled={addActivity.isPending}
              className="w-full h-9 rounded-md bg-navy text-navy-foreground text-xs inline-flex items-center justify-center gap-1 disabled:opacity-50">
              <Plus className="h-3 w-3" /> Log activity
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Field({ label, value, type, onSave }: { label: string; value: any; type: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(String(value ?? ""));
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <input type={type} value={v} onChange={e => setV(e.target.value)} onBlur={() => { if (v !== String(value ?? "")) onSave(v); }}
        className="mt-1 h-9 w-full px-2 border rounded-md bg-background text-sm" />
    </div>
  );
}
