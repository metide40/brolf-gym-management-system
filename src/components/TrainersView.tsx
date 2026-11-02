import { useState } from "react";
import { Pencil, Plus, Trash2, UserCog } from "lucide-react";
import { firstError, trainerSchema } from "../lib/schemas";
import type { Database, Trainer, TrainerInput } from "../types";
import { EmptyState, Modal, SectionTitle, btn, btnGhost, btnPrimary, input, panel } from "./Navbar";

type Props = {
  db: Database;
  onSave: (trainer: TrainerInput) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

const blank = { name: "", specialty: "", availability: "" };

export function TrainersView({ db, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState<Trainer | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const openCreate = () => { setEditing(null); setForm(blank); setError(""); setOpen(true); };
  const openEdit = (t: Trainer) => { setEditing(t); setForm({ name: t.name, specialty: t.specialty, availability: t.availability }); setError(""); setOpen(true); };

  const submit = async () => {
    const problem = firstError(trainerSchema.safeParse(form));
    if (problem) return setError(problem);
    setError("");
    setSaving(true);
    try {
      const ok = await onSave({ id: editing?.id, ...form });
      if (ok) setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Trainers"
        sub={`${db.trainers.length} on the team`}
        right={<button onClick={openCreate} className={btnPrimary}><Plus size={15} /> Add trainer</button>}
      />

      {db.trainers.length === 0 ? (
        <EmptyState title="No trainers yet" sub="Add your first trainer to start assigning members and classes." icon={UserCog} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {db.trainers.map((t) => {
            const members = db.members.filter((m) => m.trainerId === t.id).length;
            const classes = db.classes.filter((c) => c.trainerId === t.id).length;
            return (
              <div key={t.id} className={`${panel} p-4`}>
                <p className="font-display text-xl font-semibold">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.specialty}</p>
                <p className="mt-2 text-xs text-muted-foreground">{t.availability || "Availability not set"}</p>
                <p className="mt-3 text-xs text-muted-foreground">{members} members, {classes} classes</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => openEdit(t)} className={`${btnGhost} text-xs`}><Pencil size={13} /> Edit</button>
                  {confirmId === t.id ? (
                    <>
                      <button onClick={async () => { await onDelete(t.id); setConfirmId(null); }} className={`${btn} border border-rose-400 text-xs text-rose-500`}>Yes, delete</button>
                      <button onClick={() => setConfirmId(null)} className={`${btnGhost} text-xs`}>Keep</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmId(t.id)} className={`${btn} border border-border text-xs text-muted-foreground hover:border-rose-400 hover:text-rose-500`}><Trash2 size={13} /> Delete</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit trainer" : "Add trainer"}>
        <div className="grid gap-3">
          <label className="text-xs font-semibold text-muted-foreground">Full name
            <input className={`${input} mt-1`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">Specialty
            <input className={`${input} mt-1`} value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Strength and conditioning" />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">Availability
            <input className={`${input} mt-1`} value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} placeholder="Mon-Fri, 06:00-14:00" />
          </label>
        </div>
        {error ? <p role="alert" className="mt-3 rounded-lg bg-amber-500/12 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setOpen(false)} className={btnGhost}>Close</button>
          <button onClick={submit} disabled={saving} className={btnPrimary}>{saving ? "Saving..." : editing ? "Save changes" : "Add trainer"}</button>
        </div>
      </Modal>
    </div>
  );
}
