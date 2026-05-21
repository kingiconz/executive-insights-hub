import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, ChevronRight, Building2, Calendar, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { getQuarter, getYear, format, startOfQuarter, endOfQuarter } from "date-fns";
import { getQuarterLabel } from "@/lib/date-utils";

export const Route = createFileRoute("/_app/quarterly")({ component: QuarterlyPage });

function QuarterlyPage() {
  const { user, isAdmin } = useAuth();
  const [selectedQuarter, setSelectedQuarter] = useState(() => getQuarterLabel(new Date()));
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["quarterly-reports", selectedQuarter, isAdmin, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [qStr, yearStr] = selectedQuarter.split(" ");
      const quarter = parseInt(qStr.replace("Q", ""));
      const year = parseInt(yearStr);
      
      const start = startOfQuarter(new Date(year, (quarter - 1) * 3, 1));
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
        .eq("status", "reviewed");

      if (!isAdmin) {
        query = query.eq("submitted_by", user!.id);
      }

      const { data } = await query;
      return data ?? [];
    },
  });

  const monthlyData = useMemo(() => {
    if (!reports) return [];
    
    const months: Record<string, any> = {};
    
    reports.forEach((r: any) => {
      const date = new Date(r.reporting_week);
      const monthLabel = format(date, "MMMM yyyy");
      
      if (!months[monthLabel]) {
        months[monthLabel] = {
          label: monthLabel,
          timestamp: date.getTime(),
          areas: {}
        };
      }
      
      const area = r.institution?.business_area;
      if (!area) return;
      
      if (!months[monthLabel].areas[area.id]) {
        months[monthLabel].areas[area.id] = {
          id: area.id,
          name: area.name,
          color: area.color,
          reportCount: 0,
          institutions: {},
          prospects: [],
          insights: [],
        };
      }
      
      const targetArea = months[monthLabel].areas[area.id];
      targetArea.reportCount++;
      
      const instName = r.institution.name;
      if (!targetArea.institutions[instName]) {
        targetArea.institutions[instName] = 0;
      }
      targetArea.institutions[instName]++;
      
      const weekLabel = getWorkWeekOfMonth(new Date(r.reporting_week));
      
      if (r.business_prospect) {
        targetArea.prospects.push({ week: weekLabel, text: r.business_prospect });
      }
      if (r.industry_insight) {
        targetArea.insights.push({ week: weekLabel, text: r.industry_insight });
      }
    });
    
    return Object.values(months).sort((a: any, b: any) => a.timestamp - b.timestamp);
  }, [reports]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-navy">Quarterly Intelligence Review</h2>
          <p className="text-sm text-muted-foreground">Monthly synthesis of submitted weekly intelligence reports.</p>
        </div>
        <div className="flex items-center gap-2 bg-card border rounded-lg p-1 shadow-sm">
          {[-1, 0].map((offset) => {
            const date = new Date();
            date.setMonth(date.getMonth() + offset * 3);
            const label = getQuarterLabel(date);
            return (
              <button
                key={label}
                onClick={() => setSelectedQuarter(label)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${selectedQuarter === label ? "bg-navy text-white shadow-elegant" : "hover:bg-muted text-muted-foreground"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Layers className="h-10 w-10 text-navy/20 animate-pulse" />
          <p className="text-sm text-muted-foreground animate-pulse">Synthesizing intelligence data...</p>
        </div>
      ) : monthlyData.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/50 p-20 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Layers className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="font-serif text-xl font-semibold text-navy">No data for this period</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
            Monthly summaries are generated from submitted weekly intelligence. No submissions found for {selectedQuarter}.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {monthlyData.map((month: any) => (
            <div key={month.label} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                <h3 className="font-serif text-xl font-bold text-navy uppercase tracking-widest px-4 py-2 rounded-full border bg-muted/30">
                  {month.label}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {Object.values(month.areas).map((area: any) => (
                  <motion.div
                    key={`${month.label}-${area.id}`}
                    layout
                    className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-elegant hover:shadow-elevated transition-all"
                  >
                    <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: area.color }} />
                    
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Business Area</p>
                        <h4 className="font-serif text-lg font-bold text-navy">{area.name}</h4>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-navy/5 flex items-center justify-center text-navy font-serif font-bold">
                        {area.reportCount}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Building2 className="h-3 w-3" /> Key Institutions
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(area.institutions).map(([name, count]: [string, any]) => (
                            <span key={name} className="px-2 py-1 rounded-md bg-muted/50 text-[10px] font-medium text-navy border border-navy/5">
                              {name} ({count})
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => setExpandedArea(expandedArea === `${month.label}-${area.id}` ? null : `${month.label}-${area.id}`)}
                        className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-navy/10 bg-navy/5 text-navy text-xs font-semibold hover:bg-navy hover:text-white transition-all group-hover:border-navy/20"
                      >
                        {expandedArea === `${month.label}-${area.id}` ? (
                          <><ChevronUp className="h-3.5 w-3.5" /> Collapse Insights</>
                        ) : (
                          <><ChevronDown className="h-3.5 w-3.5" /> View Monthly Synthesis</>
                        )}
                      </button>
                    </div>

                    <AnimatePresence>
                      {expandedArea === `${month.label}-${area.id}` && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-6 mt-6 border-t space-y-6">
                            <div className="space-y-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-royal">Monthly Prospects</p>
                              <div className="space-y-3">
                                {area.prospects.map((p: any, i: number) => (
                                  <div key={i} className="group/item">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-royal/10 text-royal uppercase tracking-tighter">
                                        {p.week}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed pl-3 border-l-2 border-royal/20 italic">
                                      "{p.text}"
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-royal">Market Signals</p>
                              <div className="space-y-3">
                                {area.insights.map((ins: any, i: number) => (
                                  <div key={i} className="group/item">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-royal/10 text-royal uppercase tracking-tighter">
                                        {ins.week}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed pl-3 border-l-2 border-royal/20 italic">
                                      "{ins.text}"
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
