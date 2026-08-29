import React from "react";

/**
 * Two-level page navigation: a top row of group pills (Summary /
 * Deep Dive / Discover), and a second row showing whichever group's
 * sub-tabs are currently relevant. Clicking a group pill jumps to
 * that group's first sub-tab if the active one isn't already in it.
 *
 * `groups`: [{ key, label, subTabs: [{ key, label }] }]
 * `active`: the currently active sub-tab key
 * `onChange`: (subTabKey) => void
 */
export default function TwoLevelNav({ groups, active, onChange }) {
  const activeGroup = groups.find((g) => g.subTabs.some((t) => t.key === active)) || groups[0];

  return (
    <nav className="page-nav-2level">
      <div className="page-nav-groups">
        {groups.map((g) => (
          <button
            key={g.key}
            className={g.key === activeGroup.key ? "page-group active" : "page-group"}
            onClick={() => { if (g.key !== activeGroup.key) onChange(g.subTabs[0].key); }}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="page-nav-subtabs">
        {activeGroup.subTabs.map((t) => (
          <button
            key={t.key}
            className={t.key === active ? "page-tab active" : "page-tab"}
            onClick={() => onChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
