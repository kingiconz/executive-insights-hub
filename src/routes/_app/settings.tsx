import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, User, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user, profile, isAdmin, refresh } = useAuth();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    full_name: "", department: "", phone: "", avatar_url: "",
  });

  useEffect(() => {
    if (profile) setForm({
      full_name: profile.full_name ?? "",
      department: profile.department ?? "",
      phone: profile.phone ?? "",
      avatar_url: profile.avatar_url ?? "",
    });
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(form).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated"); refresh(); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [pw, setPw] = useState({ new: "", confirm: "" });
  const changePw = useMutation({
    mutationFn: async () => {
      if (pw.new.length < 8) throw new Error("Password must be at least 8 characters");
      if (pw.new !== pw.confirm) throw new Error("Passwords don't match");
      const { error } = await supabase.auth.updateUser({ password: pw.new });
      if (error) throw error;
    },
    onSuccess: () => { setPw({ new: "", confirm: "" }); toast.success("Password updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-serif text-3xl font-semibold text-navy">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your profile and account preferences.</p>
      </div>

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-card p-6 shadow-elegant space-y-5">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-navy" />
          <h3 className="font-serif text-lg font-semibold text-navy">Profile</h3>
          <span className="ml-auto text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-muted">
            {isAdmin ? "Administrator" : "Team Member"}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-navy flex items-center justify-center text-white font-serif text-2xl shadow-elegant overflow-hidden">
            {form.avatar_url ? <img src={form.avatar_url} className="h-full w-full object-cover" alt="" /> : (form.full_name || user?.email || "U").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="font-serif text-lg text-navy">{form.full_name || "—"}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Full name">
            <input className="form-input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label="Department">
            <input className="form-input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Avatar URL">
            <input className="form-input" value={form.avatar_url} onChange={e => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." />
          </Field>
        </div>

        <div className="flex justify-end">
          <button onClick={() => save.mutate()} disabled={save.isPending}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-navy text-navy-foreground shadow-elegant disabled:opacity-50">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </button>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-xl border bg-card p-6 shadow-elegant space-y-5">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-navy" />
          <h3 className="font-serif text-lg font-semibold text-navy">Security</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="New password">
            <input type="password" className="form-input" value={pw.new} onChange={e => setPw({ ...pw, new: e.target.value })} />
          </Field>
          <Field label="Confirm password">
            <input type="password" className="form-input" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end">
          <button onClick={() => changePw.mutate()} disabled={changePw.isPending || !pw.new}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-md border bg-card hover:bg-muted disabled:opacity-50">
            {changePw.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Update password
          </button>
        </div>
      </motion.section>

      <style>{`.form-input{width:100%;border:1px solid var(--border);border-radius:0.5rem;background:var(--background);padding:0.6rem 0.85rem;font-family:var(--font-serif);font-size:0.95rem;outline:none}.form-input:focus{border-color:var(--royal);box-shadow:0 0 0 3px color-mix(in oklab,var(--royal) 18%, transparent)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
