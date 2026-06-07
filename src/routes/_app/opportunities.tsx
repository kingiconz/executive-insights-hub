import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { Plus, X, Search, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { STAGES, STATUSES, STATUS_LABEL, STATUS_TONE, stageLabel, fmtCurrency, healthOf, HEALTH_TONE } from "@/lib/pipeline";

export const Route = createFileRoute("/_app/opportunities")({ component: OpportunitiesPage });

function OpportunitiesPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [status, setStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", institution_id: "", business_area_id: "", service_category: "",
    estimated_value: 0, probability: 20, stage: "lead_generation", expected_close_date: "",
  });

  const { data: areas } = useQuery({
    queryKey: ["opp-areas", isAdmin, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      if (isAdmin) return (await supabase.from("business_areas").select("id, name").order("name")).data ?? [];
      const { data } = await supabase.from("user_business_areas").select("business_area:business_areas(id, name)").eq("user_id", user.id);
      return (data ?? []).map((u: any) => u.business_area).filter((b: any) => b && !Array.isArray(b));
    },
    enabled: !!user,
  });

  const { data: institutions } = useQuery({
    queryKey: ["opp-insts", form.business_area_id],
    queryFn: async () => {
      let q = supabase.from("institutions").select("id, name, business_area_id");
      if (form.business_area_id) q = q.eq("business_area_id", form.business_area_id);
      return (await q.order("name")).data ?? [];
    },
  });

  const { data: opps, isLoading } = useQuery({
    queryKey: ["opps", q, stage, status],
    queryFn: async () => {
      let query = supabase.from("opportunities")
        .select("*, institution:institutions(id,name), business_area:business_areas(id,name)")
        .order("updated_at", { ascending: false });
      if (stage !== "all") query = query.eq("stage", stage as any);
      if (status !== "all") query = query.eq("status", status as any);
      if (q) query = query.ilike("title", `%${q}%`);
      return (await query).data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title || !form.institution_id || !form.business_area_id) throw new Error("Title, institution and business area required");
      const { error } = await supabase.from("opportunities").insert({
        ...form,
        estimated_value: Number(form.estimated_value) || 0,
        probability: Number(form.probability) || 0,
        expected_close_date: form.expected_close_date || null,
        created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Opportunity created");
      setShowForm(false);
      setForm({ title: "", description: "", institution_id: "", business_area_id: "", service_category: "", estimated_value: 0, probability: 20, stage: "lead_generation", expected_close_date: "" });
      qc.invalidateQueries({ queryKey: ["opps"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const m: Record<string, any[]> = {};
    STAGES.forEach(s => m[s.key] = []);
    (opps ?? []).forEach(o => { m[o.stage as string] ??= []; m[o.stage as string].push(o); });
    return m;
  }, [opps]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pipeline</p>
          <h2 className="font-serif text-3xl font-semibold text-navy">Opportunities</h2>
          <p className="text-sm text-muted-foreground">Track every active engagement from lead to retention.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/pipeline" className="h-10 px-4 rounded-md border text-sm inline-flex items-center gap-2 hover:bg-muted/40">
            Analytics
          </Link>
          {!isAdmin && (
            <>
              <Link to="/import" className="h-10 px-4 rounded-md border text-sm inline-flex items-center gap-2 hover:bg-muted/40">
                Import Excel
              </Link>
              <button onClick={() => setShowForm(!showForm)}
                className="h-10 px-4 rounded-md bg-navy text-navy-foreground inline-flex items-center gap-2 shadow-elegant active:scale-95 transition-transform">
                {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showForm ? "Cancel" : "New Opportunity"}
              </button>
            </>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-lg border border-royal/20 bg-royal/5 px-4 py-3 text-sm text-royal">
          <strong className="font-semibold">Oversight view.</strong> Administrators monitor team pipeline activity. Opportunities are created by assigned team members.
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border bg-card p-6 shadow-elegant">
              <h3 className="font-serif text-lg text-navy mb-4">New Opportunity</h3>
              <div className="grid md:grid-cols-3 gap-3">
                <input placeholder="Opportunity title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="md:col-span-2 h-10 px-3 border rounded-md bg-background text-sm outline-none focus:ring-2 focus:ring-navy/20" />
                <input placeholder="Service category" value={form.service_category} onChange={e => setForm({ ...form, service_category: e.target.value })}
                  className="h-10 px-3 border rounded-md bg-background text-sm" />
                <select value={form.business_area_id} onChange={e => setForm({ ...form, business_area_id: e.target.value, institution_id: "" })}
                  className="h-10 px-3 border rounded-md bg-background text-sm">
                  <option value="">Business area *</option>
                  {areas?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <select value={form.institution_id} onChange={e => setForm({ ...form, institution_id: e.target.value })}
                  className="h-10 px-3 border rounded-md bg-background text-sm">
                  <option value="">Institution *</option>
                  {institutions?.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}
                  className="h-10 px-3 border rounded-md bg-background text-sm">
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                <input type="number" placeholder="Estimated value" value={form.estimated_value} onChange={e => setForm({ ...form, estimated_value: Number(e.target.value) })}
                  className="h-10 px-3 border rounded-md bg-background text-sm" />
                <input type="number" min={0} max={100} placeholder="Probability %" value={form.probability} onChange={e => setForm({ ...form, probability: Number(e.target.value) })}
                  className="h-10 px-3 border rounded-md bg-background text-sm" />
                <input type="date" value={form.expected_close_date} onChange={e => setForm({ ...form, expected_close_date: e.target.value })}
                  className="h-10 px-3 border rounded-md bg-background text-sm" />
                <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3} className="md:col-span-3 px-3 py-2 border rounded-md bg-background text-sm" />
                <div className="md:col-span-3 flex justify-end">
                  <button disabled={create.isPending} onClick={() => create.mutate()}
                    className="h-10 px-6 rounded-md bg-navy text-navy-foreground shadow-elegant disabled:opacity-50">
                    {create.isPending ? "Creating..." : "Create Opportunity"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 h-10 rounded-md border bg-card flex-1 min-w-[240px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search opportunities..." className="flex-1 bg-transparent outline-none text-sm" />
        </div>
        <select value={stage} onChange={e => setStage(e.target.value)} className="h-10 px-3 rounded-md border bg-card text-sm">
          <option value="all">All stages</option>
          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="h-10 px-3 rounded-md border bg-card text-sm">
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      {isLoading && <div className="text-center py-12 text-muted-foreground text-sm">Loading opportunities…</div>}

      {!isLoading && (opps?.length ?? 0) === 0 && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="font-serif text-lg text-navy mb-1">No opportunities yet</p>
          <p className="text-sm text-muted-foreground">Create your first opportunity to begin tracking your pipeline.</p>
        </div>
      )}

      {/* Kanban view */}
      {!isLoading && (opps?.length ?? 0) > 0 && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGES.map(s => (
              <div key={s.key} className="w-72 shrink-0">
                <div className="flex items-center justify-between mb-3 px-2">
                  <h4 className="font-serif text-sm font-semibold text-navy">{s.label}</h4>
                  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{grouped[s.key]?.length ?? 0}</span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {grouped[s.key]?.map((o, i) => {
                    const health = healthOf(o);
                    return (
                      <motion.div key={o.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 * i }}>
                        <Link to="/opportunities/$id" params={{ id: o.id }}
                          className="block p-3 rounded-lg border bg-card hover:shadow-elegant hover:border-navy/40 transition-all">
                          <p className="font-medium text-sm text-navy line-clamp-2">{o.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 truncate">{(o.institution as any)?.name}</p>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs font-semibold text-royal">{fmtCurrency(o.estimated_value)}</span>
                            <div className="flex items-center gap-1">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider ${STATUS_TONE[o.status as keyof typeof STATUS_TONE]}`}>
                                {STATUS_LABEL[o.status as keyof typeof STATUS_LABEL]}
                              </span>
                              {health !== "neutral" && health !== "healthy" && (
                                <span className={`w-2 h-2 rounded-full ${health === "stalled" ? "bg-red-500" : "bg-amber-500"}`} />
                              )}
                            </div>
                          </div>
                          <div className="mt-2 h-1 bg-muted rounded overflow-hidden">
                            <div className="h-full bg-gradient-navy" style={{ width: `${o.probability}%` }} />
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
