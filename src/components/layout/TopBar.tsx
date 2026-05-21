import { useRouterState, Link } from "@tanstack/react-router";
import { Search, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { format, startOfWeek } from "date-fns";

const labels: Record<string, string> = {
  "/dashboard": "Executive Dashboard",
  "/business-areas": "My Business Areas",
  "/institutions": "Institutions",
  "/reports": "Weekly Reports",
  "/analytics": "Analytics",
  "/quarterly": "Quarterly Intelligence",
  "/notifications": "Notifications",
  "/calendar": "Reporting Calendar",
  "/exports": "Export Center",
  "/settings": "Settings",
  "/admin/users": "User Management",
  "/admin/business-areas": "Business Area Management",
  "/admin/institutions": "Institution Management",
};

export function TopBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isAdmin } = useAuth();
  const title = Object.entries(labels).find(([k]) => pathname.startsWith(k))?.[1] ?? "Dashboard";

  const { data: hasUnread } = useQuery({
    queryKey: ["unread-notifications", user?.id, isAdmin],
    enabled: !!user,
    queryFn: async () => {
      if (!isAdmin) {
        // Check for unread comments
        const { data: comments } = await supabase
          .from("report_comments")
          .select("created_at, report:weekly_reports!inner(submitted_by, last_seen_comment_at)")
          .limit(20);
        
        const hasUnreadComment = (comments ?? []).some((c: any) => 
          c.report?.submitted_by === user!.id && 
          (!c.report.last_seen_comment_at || new Date(c.created_at) > new Date(c.report.last_seen_comment_at))
        );
        if (hasUnreadComment) return true;

        // Check for missing weekly report
        const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
        const { data: thisWeek } = await supabase
          .from("weekly_reports").select("id")
          .eq("submitted_by", user!.id).eq("reporting_week", weekStart).neq("status", "draft").limit(1);
        
        if ((thisWeek ?? []).length === 0) return true;

        // Check for drafts
        const { count } = await supabase
          .from("weekly_reports").select("id", { count: 'exact', head: true })
          .eq("submitted_by", user!.id).eq("status", "draft");
        if ((count ?? 0) > 0) return true;

      } else {
        // Admin: Check for new submissions in last 24h
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("weekly_reports")
          .select("id", { count: 'exact', head: true })
          .eq("status", "reviewed")
          .gte("submitted_at", yesterday);
        if ((count ?? 0) > 0) return true;
      }
      return false;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  return (
    <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        <motion.div key={title}
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">e-CB Intelligence</p>
          <h1 className="font-serif text-xl font-semibold text-navy">{title}</h1>
        </motion.div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-md border bg-background w-72">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search institutions, reports..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
          </div>
          <Link 
            to="/notifications"
            className="relative h-9 w-9 rounded-md border bg-background flex items-center justify-center hover:bg-accent transition-colors"
          >
            <Bell className="h-4 w-4" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-royal animate-pulse" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
