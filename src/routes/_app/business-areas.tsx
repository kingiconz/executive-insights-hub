import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Building2, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/business-areas")({ component: BusinessAreasPage });

function BusinessAreasPage() {
  const { isAdmin, user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["business-areas-overview", isAdmin, user?.id],
    queryFn: async () => {
      let areas;
      if (isAdmin) {
        const { data } = await supabase.from("business_areas").select("*").order("name");
        areas = data;
      } else {
        const { data: ubas } = await supabase
          .from("user_business_areas")
          .select("business_area:business_areas(*)")
          .eq("user_id", user?.id);
        areas = (ubas?.map(u => u.business_area) as any[])?.filter(Boolean) ?? [];
      }

      if (!areas) return [];
      const enriched = await Promise.all(areas.map(async (a) => {
        const [inst, reports] = await Promise.all([
          supabase.from("institutions").select("id", { count: "exact", head: true }).eq("business_area_id", a.id),
          supabase.from("weekly_reports").select("id, status").eq("business_area_id", a.id),
        ]);
        const total = reports.data?.length ?? 0;
        const submitted = (reports.data ?? []).filter(r => r.status === "submitted" || r.status === "reviewed").length;
        return {
          ...a,
          institutions: inst.count ?? 0,
          totalReports: total,
          submitted,
          completion: total ? Math.round((submitted / total) * 100) : 0,
        };
      }));
      return enriched;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-navy">Business Areas</h2>
          <p className="text-sm text-muted-foreground">Sectors assigned to you for weekly intelligence reporting.</p>
        </div>
      </div>

      {isLoading && <SkeletonGrid />}

      {!isLoading && data?.length === 0 && (
        <EmptyState message="No business areas have been created yet. An administrator can add sectors in the Business Area Management page." />
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {data?.map((a, i) => (
          <motion.div key={a.id}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.45 }}
            whileHover={{ y: -3 }}
            className="group relative overflow-hidden rounded-xl border bg-gradient-card p-6 shadow-elegant hover:shadow-elevated transition-shadow"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-navy" />
            <div className="flex items-start justify-between">
              <div className="h-11 w-11 rounded-lg bg-royal/10 text-royal flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <Link to="/institutions" className="text-xs text-muted-foreground hover:text-royal flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <h3 className="mt-4 font-serif text-xl font-semibold text-navy">{a.name}</h3>
            {a.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{a.description}</p>}

            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <Stat label="Inst." value={a.institutions} />
              <Stat label="Submitted" value={a.submitted} />
              <Stat label="Total" value={a.totalReports} />
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Completion</span>
                <span className="text-sm font-medium text-navy">{a.completion}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-navy"
                  initial={{ width: 0 }} animate={{ width: `${a.completion}%` }}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-background/60 border py-2">
      <p className="font-serif text-lg font-semibold text-navy">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-56 rounded-xl border bg-card animate-pulse" />
      ))}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-card/60 p-12 text-center">
      <p className="font-serif text-lg text-navy">Nothing here yet</p>
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{message}</p>
    </div>
  );
}
