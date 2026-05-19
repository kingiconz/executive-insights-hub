import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/admin/business-areas")({ component: AdminBusinessAreas });

function AdminBusinessAreas() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-business-areas"],
    queryFn: async () => (await supabase.from("business_areas").select("*").order("name")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("business_areas").insert({ name, description: description || null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Business area created"); setName(""); setDescription(""); qc.invalidateQueries({ queryKey: ["admin-business-areas"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("business_areas").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["admin-business-areas"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return null;
  if (!isAdmin) return <AdminBlocked />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl font-semibold text-navy">Business Area Management</h2>
        <p className="text-sm text-muted-foreground">Create and manage the sectors reported on by your teams.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card p-6 shadow-elegant">
        <h3 className="font-serif text-lg text-navy mb-4">Add new sector</h3>
        <div className="grid md:grid-cols-[1fr_2fr_auto] gap-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Health" className="h-10 px-3 border rounded-md bg-background text-sm" />
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" className="h-10 px-3 border rounded-md bg-background text-sm" />
          <button disabled={!name || create.isPending} onClick={() => create.mutate()}
            className="h-10 px-4 rounded-md bg-navy text-navy-foreground inline-flex items-center gap-2 disabled:opacity-50">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </motion.div>

      <div className="rounded-xl border bg-card shadow-elegant overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <tr><th className="px-6 py-3 text-left font-medium">Name</th><th className="px-6 py-3 text-left font-medium">Description</th><th /></tr>
          </thead>
          <tbody>
            {data?.map((a, i) => (
              <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-t hover:bg-muted/30">
                <td className="px-6 py-3.5 font-medium text-navy">{a.name}</td>
                <td className="px-6 py-3.5 text-muted-foreground">{a.description ?? "—"}</td>
                <td className="px-6 py-3.5 text-right">
                  <button onClick={() => remove.mutate(a.id)} className="text-destructive hover:bg-destructive/10 p-2 rounded-md"><Trash2 className="h-4 w-4" /></button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminBlocked() {
  return (
    <div className="rounded-xl border bg-card p-12 text-center">
      <h2 className="font-serif text-xl text-navy">Administrator access required</h2>
      <p className="mt-2 text-sm text-muted-foreground">This area is restricted to administrators only.</p>
    </div>
  );
}
