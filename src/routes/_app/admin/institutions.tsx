import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AdminBlocked } from "./business-areas";

export const Route = createFileRoute("/_app/admin/institutions")({ component: AdminInstitutions });

function AdminInstitutions() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", business_area_id: "", location: "", contact_person: "", contact_phone: "", contact_email: "",
  });

  const { data: areas } = useQuery({
    queryKey: ["business-areas-list-admin"],
    queryFn: async () => (await supabase.from("business_areas").select("id, name").order("name")).data ?? [],
  });

  const { data } = useQuery({
    queryKey: ["admin-institutions"],
    queryFn: async () => (await supabase.from("institutions").select("*, business_area:business_areas(name)").order("name")).data ?? [],
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
      qc.invalidateQueries({ queryKey: ["admin-institutions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("institutions").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["admin-institutions"] }); },
  });

  if (loading) return null;
  if (!isAdmin) return <AdminBlocked />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl font-semibold text-navy">Institution Management</h2>
        <p className="text-sm text-muted-foreground">Add and maintain institutions under each business area.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card p-6 shadow-elegant grid md:grid-cols-3 gap-3">
        <Input placeholder="Institution name *" value={form.name} onChange={v => setForm({ ...form, name: v })} />
        <select className="h-10 px-3 border rounded-md bg-background text-sm" value={form.business_area_id} onChange={e => setForm({ ...form, business_area_id: e.target.value })}>
          <option value="">Select business area *</option>
          {areas?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <Input placeholder="Location" value={form.location} onChange={v => setForm({ ...form, location: v })} />
        <Input placeholder="Contact person" value={form.contact_person} onChange={v => setForm({ ...form, contact_person: v })} />
        <Input placeholder="Contact phone" value={form.contact_phone} onChange={v => setForm({ ...form, contact_phone: v })} />
        <Input placeholder="Contact email" value={form.contact_email} onChange={v => setForm({ ...form, contact_email: v })} />
        <div className="md:col-span-3 flex justify-end">
          <button disabled={create.isPending} onClick={() => create.mutate()}
            className="h-10 px-5 rounded-md bg-navy text-navy-foreground inline-flex items-center gap-2 shadow-elegant disabled:opacity-50">
            <Plus className="h-4 w-4" /> Add institution
          </button>
        </div>
      </motion.div>

      <div className="rounded-xl border bg-card shadow-elegant overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="px-6 py-3 text-left font-medium">Name</th>
              <th className="px-6 py-3 text-left font-medium">Business Area</th>
              <th className="px-6 py-3 text-left font-medium">Location</th>
              <th className="px-6 py-3 text-left font-medium">Contact</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data?.map((inst: any, i) => (
              <motion.tr key={inst.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-t hover:bg-muted/30">
                <td className="px-6 py-3.5 font-medium text-navy">{inst.name}</td>
                <td className="px-6 py-3.5">{inst.business_area?.name}</td>
                <td className="px-6 py-3.5 text-muted-foreground">{inst.location ?? "—"}</td>
                <td className="px-6 py-3.5 text-muted-foreground text-xs">
                  <div>{inst.contact_person ?? ""}</div>
                  <div>{inst.contact_email ?? ""}</div>
                </td>
                <td className="px-6 py-3.5 text-right">
                  <button onClick={() => remove.mutate(inst.id)} className="text-destructive hover:bg-destructive/10 p-2 rounded-md"><Trash2 className="h-4 w-4" /></button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Input({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return <input placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
    className="h-10 px-3 border rounded-md bg-background text-sm" />;
}
