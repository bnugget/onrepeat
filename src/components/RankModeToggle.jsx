import React from "react";

export default function RankModeToggle({ mode, onChange, hasMinutes }) {
  if (!hasMinutes) return null;
  return (
    <div className="tabs">
      <button className={mode === "count" ? "tab active" : "tab"} onClick={() => onChange("count")}>
        Play count
      </button>
      <button className={mode === "minutes" ? "tab active" : "tab"} onClick={() => onChange("minutes")}>
        Minutes listened
      </button>
    </div>
  );
}
