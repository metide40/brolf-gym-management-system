import { useState } from "react";
import { maintenanceSchema, firstError } from "../lib/schemas";
import type { EquipmentItem, EquipmentStatus, MaintenanceInput } from "../types";
import { Modal, btnGhost, btnPrimary, input } from "./Navbar";

type Props = {
  item: EquipmentItem;
  onClose: () => void;
  onSave: (value: MaintenanceInput) => Promise<boolean>;
};

const STATUSES: EquipmentStatus[] = ["Operational", "Needs Service", "Out of Order"];

// Records a maintenance note and the unit's status afterwards. Mount only while open.
export function MaintenanceModal({ item, onClose, onSave }: Props) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<EquipmentStatus>(item.status);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const value: MaintenanceInput = { date, note, status };
    const problem = firstError(maintenanceSchema.safeParse(value));
    if (problem) return setError(problem);
    setError("");
    setSaving(true);
    try {
      if (await onSave(value)) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Log maintenance: ${item.name}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-muted-foreground">Date of work
          <input type="date" className={`${input} mt-1`} value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">Status after this work
          <select className={`${input} mt-1`} value={status} onChange={(e) => setStatus(e.target.value as EquipmentStatus)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">What was done or found
          <textarea rows={3} className={`${input} mt-1 resize-none`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Replaced belt, tested for 30 minutes" />
        </label>
      </div>
      {error ? <p role="alert" className="mt-3 rounded-lg bg-amber-500/12 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">{error}</p> : null}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className={btnGhost}>Close</button>
        <button onClick={submit} disabled={saving} className={btnPrimary}>{saving ? "Saving..." : "Save entry"}</button>
      </div>
    </Modal>
  );
}
