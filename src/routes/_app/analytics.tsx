import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { startOfWeek, format, subWeeks } from "date-fns";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/analytics")({ component: AnalyticsPage });

const COLORS = ["var(--navy)", "var(--royal)", "var(--steel)", "var(--skyline)", "oklch(0.65 0.12 200)", "oklch(0.55 0.14 280)"];

function AnalyticsPage() {
  const { isAdmin, user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", isAdmin, user?.id],
    queryFn: async () => {
      let q = supabase
        .from("weekly_reports")
        .select("id, status, priority, reporting_week, business_area_id, submitted_by, business_area:business_areas(name), submitter:profiles!weekly_reports_submitted_by_fkey(full_name)");
      if (!isAdmin && user) q = q.eq("submitted_by", user.id);
      const { data: rows } = await q;
      const all = rows ?? [];

      // by business area
      const byArea: Record<string, { name: string; count: number }> = {};
      all.forEach((r: any) => {
        const k = r.business_area?.name ?? "Unassigned";
        byArea[k] = byArea[k] ?? { name: k, count: 0 };
        byArea[k].count++;
      });

      // by priority
      const byPriority = ["low", "medium", "high", "critical"].map(p => ({
        name: p, value: all.filter(r => r.priority === p).length,
      }));

      // by status
      const byStatus = ["draft", "submitted", "reviewed"].map(s => ({
        name: s, value: all.filter(r => r.status === s).length,
      }));

      // weekly trend (last 12)
      const trend = Array.from({ length: 12 }).map((_, i) => {
        const start = format(startOfWeek(subWeeks(new Date(), 11 - i), { weekStartsOn: 1 }), "yyyy-MM-dd");
        return { week: format(new Date(start), "MMM d"), submissions: all.filter(r => r.reporting_week === start).length };
      });

      // top submitters (admin only)
      const bySubmitter: Record<string, { name: string; count: number }> = {};
      all.forEach((r: any) => {
        const k = r.submitter?.full_name ?? "—";
        bySubmitter[k] = bySubmitter[k] ?? { name: k, count: 0 };
        bySubmitter[k].count++;
      });
      const topSubmitters = Object.values(bySubmitter).sort((a, b) => b.count - a.count).slice(0, 5);

      return {
        byArea: Object.values(byArea),
        byPriority,
        byStatus,
        trend,
        topSubmitters,
        total: all.length,
      };
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-navy" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl font-semibold text-navy">Analytics</h2>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "Organisation-wide intelligence patterns." : "Your reporting performance over time."}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card title="Submissions trend" subtitle="Last 12 weeks" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data?.trend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.012 250)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "oklch(0.48 0.025 255)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "oklch(0.48 0.025 255)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontFamily: "var(--font-serif)" }} />
              <Bar dataKey="submissions" fill="var(--royal)" radius={[4, 4, 0, 0]} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Priority distribution" subtitle="All reports">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data?.byPriority ?? []} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                {(data?.byPriority ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11, textTransform: "capitalize" }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="By business area" subtitle="Submission volume">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.byArea ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.012 250)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--navy)" radius={[0, 4, 4, 0]} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {isAdmin ? (
          <Card title="Top contributors" subtitle="Most active staff">
            <div className="space-y-3 py-2">
              {data?.topSubmitters.length === 0 && <p className="text-sm text-muted-foreground italic">No submissions yet.</p>}
              {data?.topSubmitters.map((s, i) => (
                <motion.div key={s.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-navy flex items-center justify-center text-white font-serif text-sm">
                    {s.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-navy">{s.name}</p>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(s.count / (data.topSubmitters[0]?.count || 1)) * 100}%` }}
                        transition={{ delay: i * 0.06 + 0.2, duration: 0.6 }}
                        className="h-full bg-gradient-navy" />
                    </div>
                  </div>
                  <span className="font-serif text-lg font-semibold text-navy">{s.count}</span>
                </motion.div>
              ))}
            </div>
          </Card>
        ) : (
          <Card title="Status breakdown" subtitle="Your reports">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data?.byStatus ?? []} dataKey="value" nameKey="name" outerRadius={100}>
                  {(data?.byStatus ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11, textTransform: "capitalize" }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border bg-card p-6 shadow-elegant ${className}`}>
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{subtitle}</p>
        <h3 className="font-serif text-lg font-semibold text-navy">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}
