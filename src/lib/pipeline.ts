export const STAGES = [
  { key: "lead_generation", label: "Lead Generation" },
  { key: "qualification", label: "Qualification" },
  { key: "discovery", label: "Discovery & Scoping" },
  { key: "proposal", label: "Proposal & Pricing" },
  { key: "negotiation", label: "Negotiation & Close" },
  { key: "delivery", label: "Delivery" },
  { key: "expand_retain", label: "Expand & Retain" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

export const STATUSES = ["open", "active", "won", "lost", "on_hold", "cancelled"] as const;
export type OppStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<OppStatus, string> = {
  open: "Open", active: "Active", won: "Won", lost: "Lost", on_hold: "On Hold", cancelled: "Cancelled",
};

export const STATUS_TONE: Record<OppStatus, string> = {
  open: "bg-steel/15 text-steel",
  active: "bg-royal/15 text-royal",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
  on_hold: "bg-amber-100 text-amber-700",
  cancelled: "bg-muted text-muted-foreground",
};

export const PROPOSAL_KINDS = [
  { key: "bespoke_sent", label: "Bespoke Proposal Sent" },
  { key: "detailed_requested", label: "Detailed Proposal Requested" },
  { key: "detailed_submitted", label: "Detailed Proposal Submitted" },
  { key: "accepted", label: "Proposal Accepted" },
  { key: "rejected", label: "Proposal Rejected" },
] as const;

export const PROPOSAL_STATUSES = ["draft","sent","under_review","accepted","rejected","withdrawn"] as const;

export const ACTIVITY_KINDS = [
  { key: "call", label: "Call" },
  { key: "meeting", label: "Meeting" },
  { key: "email", label: "Email" },
  { key: "site_visit", label: "Site Visit" },
  { key: "presentation", label: "Presentation" },
  { key: "proposal_discussion", label: "Proposal Discussion" },
  { key: "other", label: "Other" },
] as const;

export function stageLabel(s: string) {
  return STAGES.find(x => x.key === s)?.label ?? s;
}

export function healthOf(opp: { status: string; updated_at: string; next_follow_up_date: string | null }) {
  if (opp.status === "won" || opp.status === "lost" || opp.status === "cancelled") return "neutral" as const;
  const daysIdle = Math.floor((Date.now() - new Date(opp.updated_at).getTime()) / 86400000);
  const overdue = opp.next_follow_up_date && new Date(opp.next_follow_up_date) < new Date();
  if (daysIdle > 21 || overdue) return "stalled" as const;
  if (daysIdle > 10) return "at_risk" as const;
  return "healthy" as const;
}

export const HEALTH_TONE = {
  healthy: "bg-emerald-100 text-emerald-700",
  at_risk: "bg-amber-100 text-amber-700",
  stalled: "bg-red-100 text-red-700",
  neutral: "bg-muted text-muted-foreground",
};

export function fmtCurrency(n: number | null | undefined) {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}
