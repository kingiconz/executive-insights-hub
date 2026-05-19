import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface KpiCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: "navy" | "royal" | "steel";
  delay?: number;
}

export function KpiCard({ label, value, hint, icon, accent = "navy", delay = 0, className, ...rest }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-gradient-card p-5 shadow-elegant transition-shadow hover:shadow-elevated",
        className,
      )}
      {...rest}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-navy opacity-80" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-navy">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {icon && (
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            accent === "navy" && "bg-navy/10 text-navy",
            accent === "royal" && "bg-royal/10 text-royal",
            accent === "steel" && "bg-steel/15 text-steel",
          )}>{icon}</div>
        )}
      </div>
    </motion.div>
  );
}

export function AnimatedCounter({ value, duration = 900 }: { value: number; duration?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: duration / 1000 }}
    >
      {value.toLocaleString()}
    </motion.span>
  );
}
