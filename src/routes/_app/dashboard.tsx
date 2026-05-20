import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Briefcase, Building2, FileCheck2, Clock, ShieldCheck, Users, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { startOfWeek, format, subWeeks } from "date-fns";

export const Route = createFileRoute("/_app/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const { isAdmin, user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard", isAdmin, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

      if (isAdmin) {
        const [ba, inst, reportsThisWeek, allReports, drafts, users] = await Promise.all([
          supabase.from("business_areas").select("id", { count: "exact", head: true }),
          supabase.from("institutions").select("id", { count: "exact", head: true }),
          supabase.from("weekly_reports").select("id", { count: "exact", head: true })
            .eq("status", "submitted").gte("reporting_week", weekStart),
          supabase.from("weekly_reports").select("id, status, reporting_week"),
          supabase.from("weekly_reports").select("id", { count: "exact", head: true }).eq("status", "draft"),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
        ]);
        const all = allReports.data ?? [];
        const submitted = all.filter(r => r.status === "submitted").length;
        const compliance = all.length ? Math.round((submitted / all.length) * 100) : 0;
        const trend = Array.from({ length: 8 }).map((_, i) => {
          const start = format(startOfWeek(subWeeks(new Date(), 7 - i), { weekStartsOn: 1 }), "yyyy-MM-dd");
          const count = all.filter(r => r.reporting_week === start && r.status === "submitted").length;
          return { week: format(new Date(start), "MMM d"), submissions: count };
        });
        return {
          totalAreas: ba.count ?? 0,
          totalInstitutions: inst.count ?? 0,
          reportsThisWeek: reportsThisWeek.count ?? 0,
          pending: drafts.count ?? 0,
          compliance,
          activeUsers: users.count ?? 0,
          trend,
        };
      }

      // Team member — personal scope
      const [uba, instAssigned, myReports, unreadComments] = await Promise.all([
        supabase.from("user_business_areas").select("business_area_id", { count: "exact" }).eq("user_id", user!.id),
        supabase.from("institutions").select("id", { count: "exact", head: true }),
        supabase.from("weekly_reports").select("id, status, reporting_week, last_comment_at, last_seen_comment_at")
          .eq("submitted_by", user!.id),
        supabase.from("weekly_reports").select("id", { count: "exact", head: true })
          .eq("submitted_by", user!.id)
          .not("last_comment_at", "is", null),
      ]);
      const mine = myReports.data ?? [];
      const submitted = mine.filter(r => r.status === "submitted" || r.status === "reviewed").length;
      const compliance = mine.length ? Math.round((submitted / mine.length) * 100) : 0;
      const reportsThisWeek = mine.filter(r => r.reporting_week >= weekStart && r.status !== "draft").length;
      const pending = mine.filter(r => r.status === "draft").length;
      const trend = Array.from({ length: 8 }).map((_, i) => {
        const start = format(startOfWeek(subWeeks(new Date(), 7 - i), { weekStartsOn: 1 }), "yyyy-MM-dd");
        const count = mine.filter(r => r.reporting_week === start && r.status !== "draft").length;
        return { week: format(new Date(start), "MMM d"), submissions: count };
      });
      const unread = mine.filter(r => r.last_comment_at && (!r.last_seen_comment_at || new Date(r.last_comment_at) > new Date(r.last_seen_comment_at))).length;
      return {
        totalAreas: uba.count ?? 0,
        totalInstitutions: instAssigned.count ?? 0,
        reportsThisWeek,
        pending,
        compliance,
        myReports: mine.length,
        unreadComments: unread,
        trend,
      };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-reports", isAdmin, user?.id],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("weekly_reports")
        .select("id, status, reporting_week, created_at, institution:institutions(name, business_area:business_areas(name)), submitter:profiles!weekly_reports_submitted_by_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(8);
      if (!isAdmin && user) q = q.eq("submitted_by", user.id);
      const { data } = await q;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-navy">Welcome back</h2>
          <p className="text-muted-foreground text-sm">
            {isAdmin
              ? "Organisation-wide snapshot of weekly intelligence."
              : "Your personal reporting performance and activity."}
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] px-3 py-1 rounded-full border bg-card">
          {isAdmin ? "Administrator view" : "Personal view"}
        </span>
      </div>

      {isAdmin ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard delay={0} label="Business Areas" value={stats?.totalAreas ?? "—"} icon={<Briefcase className="h-5 w-5" />} accent="navy" />
          <KpiCard delay={0.05} label="Institutions" value={stats?.totalInstitutions ?? "—"} icon={<Building2 className="h-5 w-5" />} accent="royal" />
          <KpiCard delay={0.1} label="Reports This Week" value={stats?.reportsThisWeek ?? "—"} icon={<FileCheck2 className="h-5 w-5" />} accent="steel" />
          <KpiCard delay={0.15} label="Pending / Drafts" value={stats?.pending ?? "—"} icon={<Clock className="h-5 w-5" />} accent="navy" />
          <KpiCard delay={0.2} label="Compliance" value={`${stats?.compliance ?? 0}%`} icon={<ShieldCheck className="h-5 w-5" />} accent="royal" />
          <KpiCard delay={0.25} label="Active Users" value={stats?.activeUsers ?? "—"} icon={<Users className="h-5 w-5" />} accent="steel" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard delay={0} label="My Business Areas" value={stats?.totalAreas ?? "—"} icon={<Briefcase className="h-5 w-5" />} accent="navy" />
          <KpiCard delay={0.05} label="My Reports" value={(stats as any)?.myReports ?? "—"} icon={<FileCheck2 className="h-5 w-5" />} accent="royal" />
          <KpiCard delay={0.1} label="Reports This Week" value={stats?.reportsThisWeek ?? "—"} icon={<FileCheck2 className="h-5 w-5" />} accent="steel" />
          <KpiCard delay={0.15} label="My Drafts" value={stats?.pending ?? "—"} icon={<Clock className="h-5 w-5" />} accent="navy" />
          <KpiCard delay={0.2} label="My Compliance" value={`${stats?.compliance ?? 0}%`} icon={<ShieldCheck className="h-5 w-5" />} accent="royal" />
          <KpiCard delay={0.25} label="New Comments" value={(stats as any)?.unreadComments ?? 0} icon={<MessageSquare className="h-5 w-5" />} accent="steel" />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-elegant"
        >
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Trend</p>
              <h3 className="font-serif text-lg font-semibold text-navy">
                {isAdmin ? "Weekly submissions" : "My weekly submissions"}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">Last 8 weeks</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.trend ?? []}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--royal)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--royal)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.012 250)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "oklch(0.48 0.025 255)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.48 0.025 255)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontFamily: "var(--font-serif)" }} />
                <Area type="monotone" dataKey="submissions" stroke="var(--royal)" strokeWidth={2} fill="url(#grad)" animationDuration={900} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="rounded-xl border bg-card p-6 shadow-elegant"
        >
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Snapshot</p>
          <h3 className="font-serif text-lg font-semibold text-navy">
            {isAdmin ? "Compliance health" : "My compliance"}
          </h3>
          <div className="mt-6 flex items-center justify-center">
            <div className="relative h-44 w-44">
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                <circle cx="50" cy="50" r="42" stroke="oklch(0.93 0.012 250)" strokeWidth="9" fill="none" />
                <motion.circle cx="50" cy="50" r="42" stroke="var(--royal)" strokeWidth="9" fill="none"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 264" }}
                  animate={{ strokeDasharray: `${(stats?.compliance ?? 0) * 2.64} 264` }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="font-serif text-4xl font-semibold text-navy">{stats?.compliance ?? 0}%</p>
                <p className="text-xs text-muted-foreground">on schedule</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="rounded-xl border bg-card shadow-elegant overflow-hidden"
      >
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Activity</p>
            <h3 className="font-serif text-lg font-semibold text-navy">
              {isAdmin ? "Recent submissions" : "My recent submissions"}
            </h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-[0.12em]">
              <tr>
                <Th>Institution</Th><Th>Business Area</Th>{isAdmin && <Th>Submitted By</Th>}<Th>Week</Th><Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {(recent ?? []).map((r: any, i: number) => (
                <motion.tr key={r.id}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="border-t hover:bg-muted/30 transition-colors"
                >
                  <Td className="font-medium text-navy">{r.institution?.name ?? "—"}</Td>
                  <Td>{r.institution?.business_area?.name ?? "—"}</Td>
                  {isAdmin && <Td>{r.submitter?.full_name ?? "—"}</Td>}
                  <Td>{r.reporting_week ? format(new Date(r.reporting_week), "MMM d, yyyy") : "—"}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                </motion.tr>
              ))}
              {(!recent || recent.length === 0) && !isLoading && (
                <tr><td colSpan={isAdmin ? 5 : 4} className="py-10 text-center text-muted-foreground text-sm">No reports yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-6 py-3 text-left font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-3.5 ${className}`}>{children}</td>;
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-royal/10 text-royal",
    reviewed: "bg-success/10 text-success",
    pending: "bg-warning/10 text-warning",
    overdue: "bg-destructive/10 text-destructive",
  };
  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] ?? styles.draft}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </motion.span>
  );
}
