import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useState } from "react";
import { Search, Mail, Phone, MapPin } from "lucide-react";
import { SkeletonGrid, EmptyState } from "./business-areas";

export const Route = createFileRoute("/_app/institutions")({ component: InstitutionsPage });

function InstitutionsPage() {
  const [q, setQ] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>("all");

  const { data: areas } = useQuery({
    queryKey: ["business-areas-list"],
    queryFn: async () => (await supabase.from("business_areas").select("id, name").order("name")).data ?? [],
  });

  const { data, isLoading } = useQuery({
    queryKey: ["institutions", q, areaFilter],
    queryFn: async () => {
      let query = supabase.from("institutions").select("*, business_area:business_areas(name)").order("name");
      if (areaFilter !== "all") query = query.eq("business_area_id", areaFilter);
      if (q) query = query.ilike("name", `%${q}%`);
      const { data } = await query;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl font-semibold text-navy">Institutions</h2>
        <p className="text-sm text-muted-foreground">Organisations covered under your assigned business areas.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 h-10 rounded-md border bg-card flex-1 min-w-[240px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search institutions..." className="flex-1 bg-transparent outline-none text-sm" />
        </div>
        <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)}
          className="h-10 px-3 rounded-md border bg-card text-sm">
          <option value="all">All business areas</option>
          {areas?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {isLoading && <SkeletonGrid />}
      {!isLoading && data?.length === 0 && (
        <EmptyState message="No institutions match your filter. An administrator can add institutions to your assigned business areas." />
      )}

      <div className="rounded-xl border bg-card shadow-elegant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-[0.12em]">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Institution</th>
                <th className="px-6 py-3 text-left font-medium">Business Area</th>
                <th className="px-6 py-3 text-left font-medium">Location</th>
                <th className="px-6 py-3 text-left font-medium">Point of Contact</th>
                <th className="px-6 py-3 text-left font-medium">Contact</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((inst: any, i: number) => (
                <motion.tr key={inst.id}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * i }}
                  className="border-t hover:bg-muted/30 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-navy">{inst.name}</td>
                  <td className="px-6 py-4">{inst.business_area?.name}</td>
                  <td className="px-6 py-4">
                    {inst.location && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {inst.location}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">{inst.contact_person ?? "—"}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      {inst.contact_email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{inst.contact_email}</span>}
                      {inst.contact_phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{inst.contact_phone}</span>}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
