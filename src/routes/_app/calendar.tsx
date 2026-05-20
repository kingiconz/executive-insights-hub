import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, isSameMonth,
  startOfWeek, endOfWeek, addMonths, subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/calendar")({ component: CalendarPage });

function CalendarPage() {
  const { user, isAdmin } = useAuth();
  const [cursor, setCursor] = useState(new Date());

  const { data: events, isLoading } = useQuery({
    queryKey: ["calendar", user?.id, isAdmin],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from("weekly_reports")
        .select("id, reporting_week, follow_up_date, status, priority, institution:institutions(name)");
      if (!isAdmin && user) q = q.eq("submitted_by", user.id);
      const { data } = await q;
      return data ?? [];
    },
  });

  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsByDay = (d: Date) => {
    const e: { kind: string; label: string; tone: string }[] = [];
    (events ?? []).forEach((r: any) => {
      if (r.reporting_week && isSameDay(new Date(r.reporting_week), d)) {
        e.push({ kind: "week", label: `${r.institution?.name} (week)`, tone: r.status === "submitted" ? "royal" : "muted" });
      }
      if (r.follow_up_date && isSameDay(new Date(r.follow_up_date), d)) {
        e.push({ kind: "follow", label: `${r.institution?.name} follow-up`, tone: r.priority === "critical" ? "danger" : "warning" });
      }
    });
    return e;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl font-semibold text-navy">Reporting Calendar</h2>
        <p className="text-sm text-muted-foreground">Weekly reporting cadence and follow-up commitments.</p>
      </div>

      <div className="rounded-xl border bg-card shadow-elegant overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-serif text-xl font-semibold text-navy">{format(cursor, "MMMM yyyy")}</h3>
          <div className="flex items-center gap-1">
            <button onClick={() => setCursor(subMonths(cursor, 1))} className="h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setCursor(new Date())} className="h-9 px-3 rounded-md hover:bg-muted text-xs uppercase tracking-[0.14em]">Today</button>
            <button onClick={() => setCursor(addMonths(cursor, 1))} className="h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>

        {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-navy" /></div> : (
          <div className="grid grid-cols-7 border-t">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
              <div key={d} className="px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground bg-muted/30 border-b">{d}</div>
            ))}
            {days.map((d, i) => {
              const inMonth = isSameMonth(d, cursor);
              const today = isSameDay(d, new Date());
              const dayEvents = eventsByDay(d);
              return (
                <motion.div key={i}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.005 }}
                  className={`min-h-[100px] border-b border-r p-2 ${inMonth ? "bg-card" : "bg-muted/20"}`}>
                  <div className={`text-xs font-medium mb-1 ${today ? "text-royal" : inMonth ? "text-navy" : "text-muted-foreground"}`}>
                    {today && <span className="inline-block h-5 w-5 rounded-full bg-royal text-white text-center leading-5 mr-1">{format(d, "d")}</span>}
                    {!today && format(d, "d")}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((e, j) => {
                      const tone: Record<string, string> = {
                        royal: "bg-royal/15 text-royal",
                        muted: "bg-muted text-muted-foreground",
                        warning: "bg-warning/15 text-warning",
                        danger: "bg-destructive/15 text-destructive",
                      };
                      return <div key={j} className={`text-[10px] px-1.5 py-0.5 rounded truncate ${tone[e.tone]}`}>{e.label}</div>;
                    })}
                    {dayEvents.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</div>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-4 text-xs">
        <Legend color="bg-royal" label="Submitted week" />
        <Legend color="bg-muted-foreground" label="Reporting week" />
        <Legend color="bg-warning" label="Follow-up" />
        <Legend color="bg-destructive" label="Critical follow-up" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span>;
}
