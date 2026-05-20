import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { Bell, MessageSquare, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { formatDistanceToNow, startOfWeek, format } from "date-fns";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const { user, isAdmin } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", user?.id, isAdmin],
    enabled: !!user,
    queryFn: async () => {
      const events: Array<{ id: string; type: string; title: string; body: string; at: string; icon: any; tone: string }> = [];

      // New comments on my reports (team member)
      if (!isAdmin) {
        const { data: comments } = await supabase
          .from("report_comments")
          .select("id, body, created_at, report:weekly_reports!inner(id, institution:institutions(name), submitted_by, last_seen_comment_at), author:profiles!report_comments_author_id_fkey(full_name)")
          .order("created_at", { ascending: false })
          .limit(20);
        (comments ?? []).forEach((c: any) => {
          if (c.report?.submitted_by !== user!.id) return;
          const unread = !c.report.last_seen_comment_at || new Date(c.created_at) > new Date(c.report.last_seen_comment_at);
          events.push({
            id: `c-${c.id}`,
            type: "comment",
            title: `${c.author?.full_name ?? "Admin"} commented on your report`,
            body: `${c.report.institution?.name}: "${c.body.slice(0, 80)}${c.body.length > 80 ? "…" : ""}"`,
            at: c.created_at,
            icon: MessageSquare,
            tone: unread ? "royal" : "muted",
          });
        });

        // Pending drafts reminder
        const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
        const { data: drafts } = await supabase
          .from("weekly_reports").select("id, institution:institutions(name)")
          .eq("submitted_by", user!.id).eq("status", "draft");
        (drafts ?? []).forEach((d: any) => events.push({
          id: `d-${d.id}`,
          type: "draft",
          title: "Draft awaiting submission",
          body: `${d.institution?.name ?? "Report"} has not been submitted yet.`,
          at: new Date().toISOString(),
          icon: AlertCircle,
          tone: "warning",
        }));

        // Has user submitted this week?
        const { data: thisWeek } = await supabase
          .from("weekly_reports").select("id")
          .eq("submitted_by", user!.id).eq("reporting_week", weekStart).neq("status", "draft").limit(1);
        if ((thisWeek ?? []).length === 0) {
          events.push({
            id: "weekly-reminder",
            type: "reminder",
            title: "Weekly report due",
            body: `You haven't submitted a report for the week of ${format(new Date(weekStart), "MMM d")} yet.`,
            at: new Date().toISOString(),
            icon: Bell,
            tone: "warning",
          });
        }
      } else {
        // Admin: latest submissions
        const { data: subs } = await supabase
          .from("weekly_reports")
          .select("id, status, submitted_at, created_at, institution:institutions(name), submitter:profiles!weekly_reports_submitted_by_fkey(full_name)")
          .order("created_at", { ascending: false })
          .limit(20);
        (subs ?? []).forEach((s: any) => events.push({
          id: `r-${s.id}`,
          type: "submission",
          title: s.status === "submitted" ? "New report submitted" : `Report ${s.status}`,
          body: `${s.submitter?.full_name ?? "Someone"} — ${s.institution?.name ?? "report"}`,
          at: s.submitted_at ?? s.created_at,
          icon: s.status === "submitted" ? FileText : CheckCircle2,
          tone: s.status === "submitted" ? "royal" : "success",
        }));
      }

      return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-navy" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl font-semibold text-navy">Notifications</h2>
        <p className="text-sm text-muted-foreground">{isAdmin ? "Latest submissions and team activity." : "Reminders, comments and updates on your reports."}</p>
      </div>

      <div className="rounded-xl border bg-card shadow-elegant overflow-hidden">
        {(data ?? []).length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-serif text-navy">You're all caught up.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {data!.map((e, i) => {
              const Icon = e.icon;
              const toneClass: Record<string, string> = {
                royal: "bg-royal/10 text-royal", warning: "bg-warning/10 text-warning",
                success: "bg-success/10 text-success", muted: "bg-muted text-muted-foreground",
              };
              return (
                <motion.li key={e.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="px-5 py-4 flex items-start gap-4 hover:bg-muted/30 transition-colors">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${toneClass[e.tone]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy">{e.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{e.body}</p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-1.5">
                      {formatDistanceToNow(new Date(e.at), { addSuffix: true })}
                    </p>
                  </div>
                  <Link to="/reports" className="text-xs text-royal hover:underline shrink-0">View</Link>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
