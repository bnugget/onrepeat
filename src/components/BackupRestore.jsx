import React, { useRef, useState } from "react";
import { exportAllData, importAllData, backupItemCount } from "../lib/backup.js";

export default function BackupRestore() {
  const fileRef = useRef(null);
  const [status, setStatus] = useState(null); // { type: "ok"|"error", text }
  const count = backupItemCount();

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const restored = importAllData(reader.result);
        setStatus({ type: "ok", text: `Restored ${restored} item type${restored === 1 ? "" : "s"} — reloading…` });
        setTimeout(() => window.location.reload(), 900);
      } catch (err) {
        setStatus({ type: "error", text: err.message || "Couldn't read that file." });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="backup-restore">
      <div className="backup-restore-head">
        <span className="eyebrow" style={{ margin: 0 }}>Backup</span>
        <span className="chart-hint">{count} configured</span>
      </div>
      <p className="backup-restore-note">
        Your tags, eras, and filters live in this browser only. Download a backup now and then,
        or before switching browsers/machines.
      </p>
      <div className="backup-restore-actions">
        <button className="btn primary" onClick={exportAllData}>Download backup</button>
        <button className="btn" onClick={() => fileRef.current?.click()}>Restore from file</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
      </div>
      {status && (
        <p className={status.type === "error" ? "backup-status-error" : "backup-status-ok"}>{status.text}</p>
      )}
    </div>
  );
}
