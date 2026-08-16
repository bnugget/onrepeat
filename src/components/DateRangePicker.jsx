import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["S","M","T","W","T","F","S"];
const POPUP_WIDTH = 300;
const POPUP_HEIGHT_ESTIMATE = 430;

function toDayInt(y, m, d) {
  return y * 10000 + (m + 1) * 100 + d;
}
function fromDayInt(dayInt) {
  return {
    y: Math.floor(dayInt / 10000),
    m: Math.floor((dayInt % 10000) / 100) - 1,
    d: dayInt % 100
  };
}
function formatShort(dayInt) {
  const { y, m, d } = fromDayInt(dayInt);
  return `${MONTH_NAMES[m].slice(0, 3)} ${d}, ${y}`;
}
function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}
function firstWeekday(y, m) {
  return new Date(Date.UTC(y, m, 1)).getUTCDay();
}

/**
 * A dropdown built entirely from plain divs/buttons — no native
 * <select>. A native select's dropdown list is rendered by the OS,
 * outside the page's DOM, which caused a real bug here: opening it
 * could fire events that looked like a click "outside" the picker
 * and closed the whole thing mid-selection. This has no OS-level
 * chrome at all, so that entire category of bug can't happen.
 */
function MiniSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div className="mini-select" ref={ref}>
      <button
        type="button"
        className="mini-select-trigger"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
      >
        {current ? current.label : value} <span className="mini-select-caret">▾</span>
      </button>
      {open && (
        <div className="mini-select-list">
          {options.map((opt) => (
            <button
              type="button"
              key={opt.value}
              className={`mini-select-option${opt.value === value ? " active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DateRangePicker({ bounds, fromInt, toInt, onChange }) {
  const [open, setOpen] = useState(false);
  const [pendingFrom, setPendingFrom] = useState(fromInt);
  const [pendingTo, setPendingTo] = useState(toInt);
  const [selectingStart, setSelectingStart] = useState(true);
  const [hasPickedNew, setHasPickedNew] = useState(false);
  const [hoverDay, setHoverDay] = useState(null);
  const [popupPos, setPopupPos] = useState(null);

  const toStart = fromDayInt(toInt);
  const [viewYear, setViewYear] = useState(toStart.y);
  const [viewMonth, setViewMonth] = useState(toStart.m);

  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  // The popup is portaled to document.body (see render below) so it
  // can never be clipped by a scrollable ancestor like the sidebar —
  // a plain position:absolute popup gets cut off by any parent with
  // overflow:auto, which is exactly what happened inside Era tags.
  // Because of the portal, clicks inside the popup no longer live
  // under wrapRef in the DOM tree, so the outside-click check must
  // also check popupRef, or every click inside the calendar would
  // incorrectly look like a click "outside" and close it.
  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && wrapRef.current.contains(e.target)) return;
      if (popupRef.current && popupRef.current.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + POPUP_WIDTH > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - POPUP_WIDTH - 10);
    }
    if (top + POPUP_HEIGHT_ESTIMATE > window.innerHeight - 10) {
      top = Math.max(10, rect.top - POPUP_HEIGHT_ESTIMATE - 6);
    }
    setPopupPos({ top, left });
  }, [open]);

  const minB = fromDayInt(bounds.min);
  const maxB = fromDayInt(bounds.max);

  const yearOptions = useMemo(() => {
    const arr = [];
    for (let y = minB.y; y <= maxB.y; y++) arr.push({ value: y, label: String(y) });
    return arr;
  }, [minB.y, maxB.y]);

  const monthOptions = useMemo(
    () => MONTH_NAMES.map((m, i) => ({ value: i, label: m })),
    []
  );

  const cells = useMemo(() => {
    const lead = firstWeekday(viewYear, viewMonth);
    const total = daysInMonth(viewYear, viewMonth);
    const arr = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let d = 1; d <= total; d++) arr.push(d);
    return arr;
  }, [viewYear, viewMonth]);

  function changeMonth(delta) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewYear(y);
    setViewMonth(m);
  }

  function handleDayClick(day) {
    const dayInt = toDayInt(viewYear, viewMonth, day);
    if (dayInt < bounds.min || dayInt > bounds.max) return;
    if (selectingStart) {
      setPendingFrom(dayInt);
      setPendingTo(dayInt);
      setSelectingStart(false);
      setHasPickedNew(false);
    } else {
      if (dayInt < pendingFrom) {
        setPendingTo(pendingFrom);
        setPendingFrom(dayInt);
      } else {
        setPendingTo(dayInt);
      }
      setSelectingStart(true);
      setHasPickedNew(true);
    }
  }

  // Pending range is reset ONLY when explicitly opening via the
  // trigger button — never as a side effect of `open` toggling some
  // other way. That's deliberate: it means even if something else
  // ever caused the popover to blip closed and back open, an
  // in-progress selection still wouldn't be silently wiped out.
  function openPicker() {
    setPendingFrom(fromInt);
    setPendingTo(toInt);
    setSelectingStart(true);
    setHasPickedNew(false);
    setOpen(true);
  }

  function apply() {
    onChange(Math.min(pendingFrom, pendingTo), Math.max(pendingFrom, pendingTo));
    setOpen(false);
  }
  function applyPreset(preset) {
    const now = new Date();
    const thisYear = now.getUTCFullYear();
    let f, t;
    if (preset === "thisYear") { f = thisYear * 10000 + 101; t = thisYear * 10000 + 1231; }
    else if (preset === "lastYear") { f = (thisYear - 1) * 10000 + 101; t = (thisYear - 1) * 10000 + 1231; }
    else if (preset === "last5Years") { f = (thisYear - 4) * 10000 + 101; t = thisYear * 10000 + 1231; }
    else { f = bounds.min; t = bounds.max; }
    onChange(Math.max(f, bounds.min), Math.min(t, bounds.max));
    setOpen(false);
  }

  const rangeLow = Math.min(pendingFrom, pendingTo);
  const rangeHigh = selectingStart ? Math.max(pendingFrom, pendingTo) : (hoverDay ?? pendingTo);

  return (
    <div className="date-picker" ref={wrapRef}>
      <label>Date range</label>
      <button ref={triggerRef} className="date-picker-trigger" onClick={() => (open ? setOpen(false) : openPicker())}>
        <span>{formatShort(fromInt)} → {formatShort(toInt)}</span>
        <span className="date-picker-icon">📅</span>
      </button>

      {open && popupPos && createPortal(
        <div className="date-picker-pop date-picker-pop-portal" ref={popupRef} style={{ top: popupPos.top, left: popupPos.left }}>
          <div className="date-picker-presets">
            <button className="btn" onClick={() => applyPreset("thisYear")}>This Year</button>
            <button className="btn" onClick={() => applyPreset("lastYear")}>Last Year</button>
            <button className="btn" onClick={() => applyPreset("last5Years")}>Last 5 Years</button>
            <button className="btn" onClick={() => applyPreset("allTime")}>All Time</button>
          </div>

          <div className="date-picker-nav">
            <button className="btn" onClick={() => changeMonth(-1)}>‹</button>
            <MiniSelect value={viewMonth} options={monthOptions} onChange={setViewMonth} />
            <MiniSelect value={viewYear} options={yearOptions} onChange={setViewYear} />
            <button className="btn" onClick={() => changeMonth(1)}>›</button>
          </div>

          <div className="date-picker-hint">
            {selectingStart
              ? hasPickedNew
                ? "Range selected — click Apply below, or pick a new start date to change it"
                : "Pick a start date"
              : "Now pick an end date"}
          </div>

          <div className="date-picker-daylabels">
            {DAY_LABELS.map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="date-picker-grid">
            {cells.map((day, i) => {
              if (day === null) return <span key={i} />;
              const dayInt = toDayInt(viewYear, viewMonth, day);
              const disabled = dayInt < bounds.min || dayInt > bounds.max;
              const inRange = dayInt >= rangeLow && dayInt <= rangeHigh;
              const isEndpoint = dayInt === pendingFrom || dayInt === pendingTo;
              return (
                <button
                  key={i}
                  disabled={disabled}
                  className={`date-picker-day${isEndpoint ? " endpoint" : ""}${inRange && !isEndpoint ? " inrange" : ""}`}
                  onMouseEnter={() => setHoverDay(dayInt)}
                  onClick={() => handleDayClick(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="date-picker-actions">
            <button className="btn primary" onClick={apply} style={{ width: "100%" }}>Apply</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
