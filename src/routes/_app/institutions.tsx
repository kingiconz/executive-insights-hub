import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Search, Mail, Phone, MapPin, Plus, X } from "lucide-react";
import { SkeletonGrid, EmptyState } from "./business-areas";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/institutions")({ component: InstitutionsPage });

function InstitutionsPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    name: "", business_area_id: "", location: "", contact_person: "", contact_phone: "", contact_email: "",
  });

  const { data: areas } = useQuery({
    queryKey: ["business-areas-list", isAdmin, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      if (isAdmin) {
        const { data } = await supabase.from("business_areas").select("id, name").order("name");
        return data ?? [];
      }
      const { data: ubas } = await supabase.from("user_business_areas").select("business_area:business_areas(id, name)").eq("user_id", user.id);
      if (!ubas) return [];
      return ubas
        .map((u: any) => u.business_area)
        .filter((ba): ba is { id: string; name: string } => ba !== null && !Array.isArray(ba));
    },
    enabled: !!user,
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

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.business_area_id) throw new Error("Name and business area required");
      const { error } = await supabase.from("institutions").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Institution added");
      setForm({ name: "", business_area_id: "", location: "", contact_person: "", contact_phone: "", contact_email: "" });
      setShowAddForm(false);
      qc.invalidateQueries({ queryKey: ["institutions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-navy">Institutions</h2>
          <p className="text-sm text-muted-foreground">Organisations covered under your assigned business areas.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="h-10 px-4 rounded-md bg-navy text-navy-foreground inline-flex items-center gap-2 shadow-elegant transition-transform active:scale-95"
        >
          {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAddForm ? "Cancel" : "Add Institution"}
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border bg-card p-6 shadow-elegant mb-6">
              <h3 className="font-serif text-lg text-navy mb-4">New Institution</h3>
              <div className="grid md:grid-cols-3 gap-3">
                <input
                  placeholder="Institution name *"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="h-10 px-3 border rounded-md bg-background text-sm focus:ring-2 focus:ring-navy/20 outline-none"
                />
                <select
                  className="h-10 px-3 border rounded-md bg-background text-sm focus:ring-2 focus:ring-navy/20 outline-none"
                  value={form.business_area_id}
                  onChange={e => setForm({ ...form, business_area_id: e.target.value })}
                >
                  <option value="">Select business area *</option>
                  {areas?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <input
                  placeholder="Location"
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  className="h-10 px-3 border rounded-md bg-background text-sm focus:ring-2 focus:ring-navy/20 outline-none"
                />
                <input
                  placeholder="Contact person"
                  value={form.contact_person}
                  onChange={e => setForm({ ...form, contact_person: e.target.value })}
                  className="h-10 px-3 border rounded-md bg-background text-sm focus:ring-2 focus:ring-navy/20 outline-none"
                />
                <input
                  placeholder="Contact phone"
                  value={form.contact_phone}
                  onChange={e => setForm({ ...form, contact_phone: e.target.value })}
                  className="h-10 px-3 border rounded-md bg-background text-sm focus:ring-2 focus:ring-navy/20 outline-none"
                />
                <input
                  placeholder="Contact email"
                  value={form.contact_email}
                  onChange={e => setForm({ ...form, contact_email: e.target.value })}
                  className="h-10 px-3 border rounded-md bg-background text-sm focus:ring-2 focus:ring-navy/20 outline-none"
                />
                <div className="md:col-span-3 flex justify-end mt-2">
                  <button
                    disabled={create.isPending}
                    onClick={() => create.mutate()}
                    className="h-10 px-6 rounded-md bg-navy text-navy-foreground inline-flex items-center gap-2 shadow-elegant disabled:opacity-50 transition-all"
                  >
                    {create.isPending ? "Adding..." : "Add Institution"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
