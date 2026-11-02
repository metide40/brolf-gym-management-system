import { useState } from "react";
import { validateClassIn } from "../api/mockApi";
import { DAYS } from "../lib/schemas";
import type { ClassInput, Database, FitnessClass } from "../types";
import { Modal, btnGhost, btnPrimary, input } from "./Navbar";

type Props = {
  db: Database;
  initial: FitnessClass | null;
  onClose: () => void;
  onSave: (value: ClassInput) => Promise<boolean>;
};

// Create or edit a class. Mount it only while open so the form starts fresh each time.
export function ClassFormModal({ db, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    category: initial?.category ?? "",
    trainerId: initial?.trainerId ?? db.trainers[0]?.id ?? "",
    day: initial?.day ?? "Mon",
    time: initial?.time ?? "18:00",
    duration: String(initial?.duration ?? 45),
    capacity: String(initial?.capacity ?? 12),
    room: initial?.room ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const booked = initial ? db.bookings.filter((b) => b.classId === initial.id).length : 0;

  const submit = async () => {
    const value: ClassInput = { id: initial?.id, ...form, duration: Number(form.duration), capacity: Number(form.capacity) };
    const problem = validateClassIn(db, value);
    if (problem) return setError(problem);
    setError("");
    setSaving(true);
    try {
      const ok = await onSave(value);
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });

  return (
    <Modal open onClose={onClose} title={initial ? "Edit class" : "New class"}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">Class name
          <input className={`${input} mt-1`} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Evening HIIT" />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">Category
          <input className={`${input} mt-1`} value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="HIIT" />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">Trainer
          <select className={`${input} mt-1`} value={form.trainerId} onChange={(e) => set("trainerId", e.target.value)}>
            {db.trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">Day
          <select className={`${input} mt-1`} value={form.day} onChange={(e) => set("day", e.target.value)}>
            {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">Start time
          <input type="time" className={`${input} mt-1`} value={form.time} onChange={(e) => set("time", e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">Duration (minutes)
          <input type="number" min={15} max={180} className={`${input} mt-1`} value={form.duration} onChange={(e) => set("duration", e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">Capacity (seats)
          <input type="number" min={1} max={db.settings.maxCapacity} className={`${input} mt-1`} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">Room
          <input className={`${input} mt-1`} value={form.room} onChange={(e) => set("room", e.target.value)} placeholder="Studio A" />
        </label>
      </div>
      {booked > 0 ? <p className="mt-3 text-xs text-muted-foreground">{booked} members are booked, so the day, time and duration are locked. Cancel the class to move it.</p> : null}
      {error ? <p role="alert" className="mt-3 rounded-lg bg-amber-500/12 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">{error}</p> : null}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className={btnGhost}>Close</button>
        <button onClick={submit} disabled={saving} className={btnPrimary}>{saving ? "Saving..." : initial ? "Save changes" : "Create class"}</button>
      </div>
    </Modal>
  );
}
