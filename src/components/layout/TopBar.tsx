import { useRouterState } from "@tanstack/react-router";
import { Search, Bell } from "lucide-react";
import { motion } from "framer-motion";

const labels: Record<string, string> = {
  "/dashboard": "Executive Dashboard",
  "/business-areas": "My Business Areas",
  "/institutions": "Institutions",
  "/reports": "Weekly Reports",
  "/analytics": "Analytics",
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
  const title = Object.entries(labels).find(([k]) => pathname.startsWith(k))?.[1] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        <motion.div key={title}
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Beacon Intelligence</p>
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
          <button className="relative h-9 w-9 rounded-md border bg-background flex items-center justify-center hover:bg-accent transition-colors">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-royal" />
          </button>
        </div>
      </div>
    </header>
  );
}
