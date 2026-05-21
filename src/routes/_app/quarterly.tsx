import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Building2, ChevronDown, ChevronUp, BarChart3, TrendingUp, Users, CalendarDays, Loader2 } from "lucide-react";
import { getQuarter, getYear, format, startOfQuarter, endOfQuarter, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { getWorkWeekOfMonth } from "@/lib/date-utils";
import { KpiCard } from "@/components/dashboard/KpiCard";

export const Route = createFileRoute("/_app/quarterly")({ component: QuarterlyPage });

function QuarterlyPage() {
  const { user, isAdmin } = useAuth();
  const [selectedYear, setSelectedYear] = useState(() => getYear(new Date()));
  const [selectedQuarter, setSelectedQuarter] = useState(() => getQuarter(new Date()));
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});

  const toggleWeek = (monthName: string, weekName: string) => {
    const key = `${monthName}-${weekName}`;
    setExpandedWeeks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const years = [2026, 2027, 2028];
  const quarters = [
    { id: 1, label: "Q1", range: "Jan – Mar" },
    { id: 2, label: "Q2", range: "Apr – Jun" },
    { id: 3, label: "Q3", range: "Jul – Sep" },
    { id: 4, label: "Q4", range: "Oct – Dec" },
  ];

  const quarterMonths = [
    ["January", "February", "March"],
    ["April", "May", "June"],
    ["July", "August", "September"],
    ["October", "November", "December"],
  ][selectedQuarter - 1];

  const { data: reports, isLoading } = useQuery({
    queryKey: ["quarterly-reports", selectedYear, selectedQuarter, isAdmin, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const start = startOfQuarter(new Date(selectedYear, (selectedQuarter - 1) * 3, 1));
      const end = endOfQuarter(start);

      let query = supabase
        .from("weekly_reports")
        .select(`
          *,
          institution:institutions(
            name,
            business_area:business_areas(id, name, color)
          )
        `)
        .gte("reporting_week", format(start, "yyyy-MM-dd"))
        .lte("reporting_week", format(end, "yyyy-MM-dd"))
        .neq("status", "draft");

      if (!isAdmin) {
        query = query.eq("submitted_by", user!.id);
      }

      const { data: reportsData, error: reportsError } = await query;
      if (reportsError) throw reportsError;

      const { data: profiles } = await supabase.from("profiles").select("id, full_name");
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) ?? []);
      
      return (reportsData ?? []).map((r: any) => ({
        ...r,
        submitter: {
          full_name: profileMap.get(r.submitted_by) || "Unknown"
        }
      }));
    },
  });

  const stats = useMemo(() => {
    if (!reports) return { total: 0, areas: 0, institutions: 0 };
    const areas = new Set(reports.map((r: any) => r.institution?.business_area?.id)).size;
    const institutions = new Set(reports.map((r: any) => r.institution_id)).size;
    return { total: reports.length, areas, institutions };
  }, [reports]);

  const structuredData = useMemo(() => {
    if (!reports) return [];
    
    return quarterMonths.map((monthName, index) => {
      const monthDate = new Date(selectedYear, (selectedQuarter - 1) * 3 + index, 1);
      const interval = { start: startOfMonth(monthDate), end: endOfMonth(monthDate) };
      
      const monthReports = reports.filter((r: any) => isWithinInterval(new Date(r.reporting_week), interval));
      
      const weeks: Record<string, any[]> = {};
      monthReports.forEach((r: any) => {
        const weekLabel = getWorkWeekOfMonth(new Date(r.reporting_week));
        if (!weeks[weekLabel]) weeks[weekLabel] = [];
        weeks[weekLabel].push(r);
      });
      
      return {
        name: monthName,
        reportCount: monthReports.length,
        weeks: Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0])),
      };
    });
  }, [reports, selectedYear, selectedQuarter, quarterMonths]);

  // Expand the first month that has reports by default
  useEffect(() => {
    if (structuredData.length > 0 && !expandedMonth) {
      const firstWithData = structuredData.find(m => m.reportCount > 0);
      if (firstWithData) {
        setExpandedMonth(firstWithData.name);
      }
    }
  }, [structuredData, expandedMonth]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-end justify-between flex-wrap gap-6">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-navy">Quarterly Intelligence</h2>
          <p className="text-sm text-muted-foreground">Comprehensive synthesis of sector intelligence across {selectedYear}.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] px-3 py-1 rounded-full border bg-card">
            {isAdmin ? "Organisation view" : "Personal view"}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap items-start gap-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Select Year</p>
            <div className="flex flex-wrap gap-2">
              {years.map(y => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${selectedYear === y ? "bg-navy text-white shadow-elegant" : "bg-card border hover:bg-muted"}`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-w-[300px]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Select Quarter</p>
            <div className="flex flex-wrap gap-2">
              {quarters.map(q => (
                <button
                  key={q.id}
                  onClick={() => setSelectedQuarter(q.id)}
                  className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${selectedQuarter === q.id ? "bg-royal text-white shadow-elegant" : "bg-card border hover:bg-muted"}`}
                >
                  <span className="flex flex-col items-start">
                    <span className="leading-none">{q.label}</span>
                    <span className={`text-[10px] mt-1 opacity-60 ${selectedQuarter === q.id ? "text-white" : "text-muted-foreground"}`}>{q.range}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <KpiCard delay={0.1} label="Total Intelligence" value={stats.total} icon={<BarChart3 className="h-5 w-5" />} accent="navy" />
          <KpiCard delay={0.15} label="Active Sectors" value={stats.areas} icon={<TrendingUp className="h-5 w-5" />} accent="royal" />
          <KpiCard delay={0.2} label="Institutions Tracked" value={stats.institutions} icon={<Building2 className="h-5 w-5" />} accent="steel" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="h-8 w-8 text-navy animate-spin" />
          <p className="text-sm text-muted-foreground">Aggregating quarterly insights...</p>
        </div>
      ) : stats.total === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/50 p-20 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Layers className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="font-serif text-xl font-semibold text-navy">No intelligence captured</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
            There are no submitted reports found for Q{selectedQuarter} {selectedYear}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {structuredData.map((month, i) => (
            <motion.div
              key={month.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="rounded-2xl border bg-card overflow-hidden shadow-elegant"
            >
              <button
                onClick={() => setExpandedMonth(expandedMonth === month.name ? null : month.name)}
                className="w-full flex items-center justify-between px-6 py-5 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-xl bg-gradient-navy text-white flex flex-col items-center justify-center shadow-elegant p-1">
                    <span className="text-[9px] font-bold uppercase leading-none mb-1 opacity-70 text-center">{month.name}</span>
                    <span className="text-lg font-serif font-bold leading-none">{month.reportCount}</span>
                  </div>
                  <div className="text-left">
                    <h4 className="font-serif text-xl font-bold text-navy">{month.name}</h4>
                    <p className="text-xs text-muted-foreground font-medium">{month.reportCount} Intelligence Submissions</p>
                  </div>
                </div>
                <div className={`p-2 rounded-full transition-colors ${expandedMonth === month.name ? "bg-navy text-white" : "bg-muted text-muted-foreground"}`}>
                  {expandedMonth === month.name ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </button>

              <AnimatePresence>
                {expandedMonth === month.name && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-muted/10 border-t"
                  >
                    <div className="p-6 space-y-8">
                      {month.weeks.length > 0 ? (
                        month.weeks.map(([weekName, reports]) => {
                          const isExpanded = expandedWeeks[`${month.name}-${weekName}`] !== false; // Default to expanded
                          return (
                            <div key={weekName} className="space-y-4">
                              <button 
                                onClick={() => toggleWeek(month.name, weekName)}
                                className="w-full flex items-center gap-4 group/week"
                              >
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal whitespace-nowrap group-hover/week:text-navy transition-colors">{weekName}</span>
                                <div className="h-px flex-1 bg-navy/10 group-hover/week:bg-navy/20 transition-colors" />
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-bold bg-royal/10 text-royal px-2.5 py-0.5 rounded-full">{reports.length} Reports</span>
                                  <div className={`p-1 rounded-md transition-colors ${isExpanded ? "bg-navy/5 text-navy" : "bg-muted text-muted-foreground"}`}>
                                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  </div>
                                </div>
                              </button>
                              
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-1">
                                      {reports.map((r: any) => (
                                        <div key={r.id} className="p-4 rounded-xl border bg-card shadow-sm hover:shadow-elegant transition-all border-l-4 flex flex-col justify-between" style={{ borderLeftColor: r.institution?.business_area?.color }}>
                                          <div>
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                              <h5 className="text-xs font-bold text-navy leading-tight line-clamp-2">{r.institution?.name}</h5>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground line-clamp-3 mb-4 leading-relaxed italic">
                                              "{r.business_prospect || r.industry_insight || "No brief content available."}"
                                            </p>
                                          </div>
                                          <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-2 border-t border-dashed">
                                            <span className="flex items-center gap-1 font-medium"><Users className="h-2.5 w-2.5 text-royal" /> {r.submitter?.full_name?.split(' ')[0]}</span>
                                            <span className="flex items-center gap-1 font-medium"><CalendarDays className="h-2.5 w-2.5 text-royal" /> {format(new Date(r.reporting_week), "MMM d")}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-full py-12 text-center">
                          <p className="text-sm text-muted-foreground italic">No reports captured for this period.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
