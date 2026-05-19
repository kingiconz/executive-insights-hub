import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AdminBlocked } from "./business-areas";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_app/admin/users")({ component: AdminUsers });

function AdminUsers() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");
      const { data: roles } = await supabase.from("user_roles").select("*");
      const { data: assignments } = await supabase.from("user_business_areas").select("user_id, business_area:business_areas(name)");
      return (profiles ?? []).map(p => ({
        ...p,
        roles: (roles ?? []).filter(r => r.user_id === p.id).map(r => r.role),
        areas: (assignments ?? []).filter(a => a.user_id === p.id).map((a: any) => a.business_area?.name).filter(Boolean),
      }));
    },
    enabled: isAdmin,
  });

  const { data: areas } = useQuery({
    queryKey: ["business-areas-list-admin-users"],
    queryFn: async () => (await supabase.from("business_areas").select("id, name").order("name")).data ?? [],
    enabled: isAdmin,
  });

  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [areaId, setAreaId] = useState("");

  const assign = useMutation({
    mutationFn: async () => {
      if (!assignFor || !areaId) throw new Error("Select an area");
      const { error } = await supabase.from("user_business_areas").insert({ user_id: assignFor, business_area_id: areaId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Assigned"); setAssignFor(null); setAreaId(""); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return null;
  if (!isAdmin) return <AdminBlocked />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl font-semibold text-navy">User Management</h2>
        <p className="text-sm text-muted-foreground">Manage roles and business area assignments. New accounts are created via the sign-up page.</p>
      </div>

      <div className="rounded-xl border bg-card shadow-elegant overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="px-6 py-3 text-left font-medium">User</th>
              <th className="px-6 py-3 text-left font-medium">Roles</th>
              <th className="px-6 py-3 text-left font-medium">Assigned business areas</th>
              <th className="px-6 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u, i) => (
              <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-t hover:bg-muted/30 align-top">
                <td className="px-6 py-4">
                  <p className="font-medium text-navy">{u.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{u.department ?? ""}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1.5 flex-wrap">
                    {u.roles.map(r => (
                      <span key={r} className={`px-2 py-0.5 rounded-full text-xs ${r === "admin" ? "bg-royal/10 text-royal" : "bg-muted text-muted-foreground"}`}>{r}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {u.areas.length ? u.areas.map(a => <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-steel/15 text-steel">{a}</span>) : <span className="text-xs text-muted-foreground">— none —</span>}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-2">
                    <button onClick={() => toggleAdmin.mutate({ userId: u.id, makeAdmin: !u.roles.includes("admin") })}
                      className="text-xs h-8 px-3 rounded-md border hover:bg-muted">
                      {u.roles.includes("admin") ? "Revoke admin" : "Grant admin"}
                    </button>
                    {assignFor === u.id ? (
                      <div className="flex gap-1">
                        <select value={areaId} onChange={e => setAreaId(e.target.value)} className="h-8 px-2 border rounded-md text-xs bg-background">
                          <option value="">Select...</option>
                          {areas?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <button onClick={() => assign.mutate()} className="text-xs h-8 px-2 rounded-md bg-navy text-navy-foreground">Add</button>
                        <button onClick={() => setAssignFor(null)} className="text-xs h-8 px-2">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setAssignFor(u.id)} className="text-xs h-8 px-3 rounded-md border hover:bg-muted">Assign area</button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
