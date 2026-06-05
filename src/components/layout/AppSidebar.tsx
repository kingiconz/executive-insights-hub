import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Briefcase, Building2, FileText, BarChart3,
  Bell, Calendar, Download, Settings, Users, Layers, LogOut, Target, GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const baseItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/business-areas", label: "My Business Areas", icon: Briefcase },
  { to: "/institutions", label: "Institutions", icon: Building2 },
  { to: "/reports", label: "Weekly Reports", icon: FileText },
  { to: "/pipeline", label: "Pipeline Analytics", icon: GitBranch },
  { to: "/opportunities", label: "Opportunities", icon: Target },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/quarterly", label: "Quarterly Review", icon: Layers },
  { to: "/exports", label: "Export Center", icon: Download },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const adminItems = [
  { to: "/admin/users", label: "User Management", icon: Users },
  { to: "/admin/business-areas", label: "Business Areas", icon: Layers },
  { to: "/admin/institutions", label: "Institution Management", icon: Building2 },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin, profile, user, signOut } = useAuth();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center shadow-elegant">
            <img src="/logo.ico" alt="Logo" className="h-6 w-6" />
          </div>
          <div>
            <p className="font-serif text-base font-semibold tracking-tight">e-CB</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">Sector Intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <SidebarSection label="Workspace" items={baseItems} pathname={pathname} />
        {isAdmin && (
          <div className="mt-6">
            <SidebarSection label="Administration" items={adminItems} pathname={pathname} />
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center font-serif text-sm">
            {(profile?.full_name ?? user?.email ?? "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm truncate">{profile?.full_name ?? user?.email}</p>
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
              {isAdmin ? "Administrator" : "Team Member"}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-sidebar-accent/40 hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}

function SidebarSection({
  label, items, pathname,
}: {
  label: string;
  items: ReadonlyArray<{ to: string; label: string; icon: typeof LayoutDashboard }>;
  pathname: string;
}) {
  return (
    <div>
      <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/50">{label}</p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <li key={item.to} className="relative">
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-md bg-sidebar-accent"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <Link
                to={item.to}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
