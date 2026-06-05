import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { Briefcase, Target, FileCheck2, Trophy, TrendingUp, AlertCircle, DollarSign, Activity } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { STAGES, fmtCurrency, healthOf, HEALTH_TONE, stageLabel } from "@/lib/pipeline";

export const Route = createFileRoute("/_app/pipeline")({ component: PipelinePage });

function PipelinePage() {
  const [areaFilter, setAreaFilter] = useState("all");

  const { data: areas } = useQuery({
    queryKey: ["ba-all"],
    queryFn: async () => (await supabase.from("business_areas").select("id, name").order("name")).data ?? [],
  });

  const { data: opps } = useQuery({
    queryKey: ["pipeline-opps", areaFilter],
    queryFn: async () => {
      let q = supabase.from("opportunities").select("*, institution:institutions(id,name), business_area:business_areas(id,name)");
      if (areaFilter !== "all") q = q.eq("business_area_id", areaFilter);
      return (await q).data ?? [];
    },
  });

  const { data: instCount } = useQuery({
    queryKey: ["inst-count"],
    queryFn: async () => {
      const { count } = await supabase.from("institutions").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: proposals } = useQuery({
    queryKey: ["all-proposals"],
    queryFn: async () => (await supabase.from("opportunity_proposals").select("*")).data ?? [],
  });

  const stats = useMemo(() => {
    const list = opps ?? [];
    const engagedInstitutions = new Set(list.map(o => o.institution_id)).size;
    const active = list.filter(o => o.status === "active" || o.status === "open");
    const won = list.filter(o => o.status === "won");
    const lost = list.filter(o => o.status === "lost");
    const totalValue = list.reduce((s, o) => s + Number(o.estimated_value ?? 0), 0);
    const weightedValue = list.reduce((s, o) => s + Number(o.estimated_value ?? 0) * (o.probability ?? 0) / 100, 0);
    const wonValue = won.reduce((s, o) => s + Number(o.estimated_value ?? 0), 0);
    const closed = won.length + lost.length;
    const conversion = closed ? (won.length / closed) * 100 : 0;
    const detailedReq = (proposals ?? []).filter(p => p.kind === "detailed_requested").length;
    const sent = (proposals ?? []).filter(p => p.kind !== "rejected" && p.kind !== "accepted").length;
    return {
      engagedInstitutions, active: active.length, won: won.length, lost: lost.length,
      totalValue, weightedValue, wonValue, conversion, detailedReq, sent,
    };
  }, [opps, proposals]);

  const funnel = useMemo(() => {
    const list = opps ?? [];
    return STAGES.map(s => ({
      stage: s.label,
      count: list.filter(o => o.stage === s.key).length,
    }));
  }, [opps]);

  const sectorPerf = useMemo(() => {
    const map = new Map<string, { name: string; active: number; won: number; value: number }>();
    (opps ?? []).forEach(o => {
      const name = (o.business_area as any)?.name ?? "—";
      const rec = map.get(name) ?? { name, active: 0, won: 0, value: 0 };
      if (o.status === "active" || o.status === "open") rec.active++;
      if (o.status === "won") rec.won++;
      rec.value += Number(o.estimated_value ?? 0);
      map.set(name, rec);
    });
    return Array.from(map.values());
  }, [opps]);

  const trend = useMemo(() => {
    const months: Record<string, { month: string; created: number; won: number }> = {};
    (opps ?? []).forEach(o => {
      const d = new Date(o.created_at);
      const k = d.toLocaleString("en", { month: "short", year: "2-digit" });
      months[k] ??= { month: k, created: 0, won: 0 };
      months[k].created++;
      if (o.status === "won") months[k].won++;
    });
    return Object.values(months).slice(-6);
  }, [opps]);

  const atRisk = useMemo(() => (opps ?? [])
    .map(o => ({ ...o, health: healthOf(o as any) }))
    .filter(o => o.health === "at_risk" || o.health === "stalled")
    .slice(0, 6), [opps]);

  const COLORS = ["var(--navy)", "var(--royal)", "var(--steel)", "var(--skyline)", "#94a3b8", "#cbd5e1", "#e2e8f0"];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Business Development</p>
          <h2 className="font-serif text-3xl font-semibold text-navy">Pipeline Analytics</h2>
          <p className="text-sm text-muted-foreground">End-to-end visibility of every institution engagement.</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)}
            className="h-10 px-3 rounded-md border bg-card text-sm">
            <option value="all">All business areas</option>
            {areas?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <Link to="/opportunities" className="h-10 px-4 rounded-md bg-navy text-navy-foreground inline-flex items-center gap-2 shadow-elegant">
            <Briefcase className="h-4 w-4" /> Manage Opportunities
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Institutions" value={instCount ?? 0} hint={`${stats.engagedInstitutions} engaged`} icon={<Briefcase className="h-5 w-5" />} accent="navy" delay={0.02} />
        <KpiCard label="Active Opportunities" value={stats.active} hint={`${stats.sent} proposals`} icon={<Target className="h-5 w-5" />} accent="royal" delay={0.06} />
        <KpiCard label="Proposals Requested" value={stats.detailedReq} hint="Detailed requests" icon={<FileCheck2 className="h-5 w-5" />} accent="steel" delay={0.1} />
        <KpiCard label="Opportunities Won" value={stats.won} hint={`${stats.lost} lost`} icon={<Trophy className="h-5 w-5" />} accent="navy" delay={0.14} />
        <KpiCard label="Pipeline Value" value={fmtCurrency(stats.totalValue)} hint={`Weighted ${fmtCurrency(stats.weightedValue)}`} icon={<DollarSign className="h-5 w-5" />} accent="royal" delay={0.18} />
        <KpiCard label="Won Revenue" value={fmtCurrency(stats.wonValue)} hint="Closed-won deals" icon={<TrendingUp className="h-5 w-5" />} accent="steel" delay={0.22} />
        <KpiCard label="Conversion Rate" value={`${stats.conversion.toFixed(0)}%`} hint="Won ÷ closed" icon={<Activity className="h-5 w-5" />} accent="navy" delay={0.26} />
        <KpiCard label="At-Risk Deals" value={atRisk.length} hint="Need attention" icon={<AlertCircle className="h-5 w-5" />} accent="royal" delay={0.3} />
      </div>

      {/* Funnel + Sector */}
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-xl border bg-card shadow-elegant p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg text-navy">Pipeline Funnel</h3>
              <p className="text-xs text-muted-foreground">Opportunities by stage</p>
            </div>
          </div>
          <div className="space-y-2">
            {funnel.map((f, i) => {
              const max = Math.max(1, ...funnel.map(x => x.count));
              const width = (f.count / max) * 100;
              const prev = i > 0 ? funnel[i - 1].count : f.count;
              const conv = i > 0 && prev > 0 ? Math.round((f.count / prev) * 100) : 100;
              return (
                <motion.div key={f.stage} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }} className="flex items-center gap-4">
                  <div className="w-44 text-sm text-navy font-medium shrink-0">{f.stage}</div>
                  <div className="flex-1 h-9 bg-muted/40 rounded relative overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(width, 4)}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full bg-gradient-navy flex items-center px-3 text-navy-foreground text-sm font-semibold"
                    >
                      {f.count}
                    </motion.div>
                  </div>
                  <div className="w-16 text-right text-xs text-muted-foreground">{i === 0 ? "—" : `${conv}%`}</div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-xl border bg-card shadow-elegant p-6">
          <h3 className="font-serif text-lg text-navy mb-4">Status Mix</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={[
                { name: "Active", value: stats.active },
                { name: "Won", value: stats.won },
                { name: "Lost", value: stats.lost },
              ]} dataKey="value" innerRadius={50} outerRadius={85} paddingAngle={3}>
                {[0,1,2].map(i => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Sector + Trend */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-xl border bg-card shadow-elegant p-6">
          <h3 className="font-serif text-lg text-navy mb-4">Sector Performance</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sectorPerf}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="active" fill="var(--royal)" name="Active" radius={[4,4,0,0]} />
              <Bar dataKey="won" fill="var(--navy)" name="Won" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-xl border bg-card shadow-elegant p-6">
          <h3 className="font-serif text-lg text-navy mb-4">Conversion Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="created" stroke="var(--steel)" strokeWidth={2} name="Created" />
              <Line type="monotone" dataKey="won" stroke="var(--navy)" strokeWidth={2} name="Won" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Health monitor */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="rounded-xl border bg-card shadow-elegant p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-navy">Pipeline Health Monitor</h3>
          <span className="text-xs text-muted-foreground">{atRisk.length} opportunities need attention</span>
        </div>
        {atRisk.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">All opportunities are progressing healthily.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {atRisk.map(o => (
              <Link key={o.id} to="/opportunities/$id" params={{ id: o.id }}
                className="flex items-start justify-between gap-3 p-4 rounded-lg border hover:border-navy/40 hover:shadow-elegant transition-all">
                <div className="min-w-0">
                  <p className="font-medium text-navy truncate">{o.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {(o.institution as any)?.name} • {stageLabel(o.stage)}
                  </p>
                </div>
                <span className={`shrink-0 px-2 py-1 rounded text-[10px] uppercase tracking-wider ${HEALTH_TONE[o.health]}`}>
                  {o.health.replace("_", " ")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
