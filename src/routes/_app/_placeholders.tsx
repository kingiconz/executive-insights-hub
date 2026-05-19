import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";

function makePlaceholder(title: string, body: string) {
  return function Page() {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <h2 className="font-serif text-3xl font-semibold text-navy">{title}</h2>
        <div className="rounded-xl border border-dashed bg-card/60 p-12 text-center">
          <p className="font-serif text-lg text-navy">Module coming next</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{body}</p>
        </div>
      </motion.div>
    );
  };
}

export const Analytics = makePlaceholder("Analytics", "Sector activity, productivity, top opportunities and engagement charts will live here.");
export const Notifications = makePlaceholder("Notifications", "Real-time submission reminders, overdue alerts and weekly prompts.");
export const Calendar = makePlaceholder("Reporting Calendar", "Weekly deadlines, follow-up reminders and scheduled activities.");
export const Exports = makePlaceholder("Export Center", "Generate PDF / Excel / CSV exports filtered by user, sector, week or institution.");
export const Settings = makePlaceholder("Settings", "Profile, notification preferences and workspace settings.");
