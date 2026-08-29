import React, { useEffect, useRef, useState } from "react";

export default function TopBar({
  profiles,
  activeProfileId,
  onSelectProfile,
  currentUserId,
  displayName,
  mode,
  onModeChange,
  onUploadNew,
  onRefresh,
  onDelete,
  onSignOut
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = profiles.find((p) => p.id === activeProfileId);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="topbar-brand">Listening Timeline</span>
        <div className="tabs">
          <button className={mode === "dashboard" ? "tab active" : "tab"} onClick={() => onModeChange("dashboard")}>
            My Dashboard
          </button>
          <button className={mode === "group" ? "tab active" : "tab"} onClick={() => onModeChange("group")}>
            Compare Profiles
          </button>
          <button className={mode === "help" ? "tab active" : "tab"} onClick={() => onModeChange("help")}>
            How to Use
          </button>
        </div>
      </div>
      <div className="topbar-right">
        <div className="profile-switcher" ref={ref}>
          <span className="profile-switcher-label">Profile</span>
          <button className="profile-switcher-trigger" onClick={() => setOpen((o) => !o)}>
            {active ? active.name : "Choose a profile"} <span className="mini-select-caret">▾</span>
          </button>
          {open && (
            <div className="profile-switcher-list">
              {profiles.length === 0 && <p className="mood-empty" style={{ padding: "6px 8px" }}>No profiles yet.</p>}
              {profiles.map((p) => (
                <div key={p.id} className="profile-switcher-row">
                  <button
                    className={`profile-switcher-name${p.id === activeProfileId ? " active" : ""}`}
                    onClick={() => { onSelectProfile(p.id); setOpen(false); }}
                  >
                    <span>{p.name}</span>
                    <span className="chart-hint">{p.event_count.toLocaleString()}</span>
                  </button>
                  {p.owner_id === currentUserId && (
                    <>
                      <button className="era-zoom" title="Upload fresher data" aria-label={`Upload fresher data for ${p.name}`} onClick={() => { onRefresh(p); setOpen(false); }}>↻</button>
                      <button className="mood-x" title="Delete" aria-label={`Delete profile ${p.name}`} onClick={() => onDelete(p)}>×</button>
                    </>
                  )}
                </div>
              ))}
              <button className="btn primary" style={{ width: "100%", marginTop: 8 }} onClick={() => { onUploadNew(); setOpen(false); }}>
                + New profile
              </button>
            </div>
          )}
        </div>
        <span className="chart-hint">signed in as {displayName}</span>
        <button className="btn" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}
