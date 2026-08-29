import React, { useState } from "react";

export default function AccordionSection({ title, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="accordion-section">
      <button className="accordion-header" onClick={() => setOpen((o) => !o)}>
        <span>{title}</span>
        <span className="accordion-meta">
          {badge ? <span className="accordion-badge">{badge}</span> : null}
          <span className={`accordion-chevron${open ? " open" : ""}`}>⌄</span>
        </span>
      </button>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  );
}
