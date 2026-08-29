import React, { useMemo, useState } from "react";

/**
 * Replaces a flat wall of chips (one per tagged artist) with
 * collapsed-by-default groups keyed by tag value. Built for the
 * genre auto-fetch case specifically — 12,000 individual bubbles is
 * both unusable to scroll and genuinely slow to render; a dozen or so
 * collapsed genre groups, each with its own search once it's opened
 * and itself large, scales to that fine.
 */
export default function GroupedTagList({ tags, colorFn, onRemove, itemLabel = "artist" }) {
  const [openGroup, setOpenGroup] = useState(null);
  const [groupSearch, setGroupSearch] = useState("");

  const groups = useMemo(() => {
    const map = new Map();
    for (const [name, tag] of Object.entries(tags)) {
      if (!map.has(tag)) map.set(tag, []);
      map.get(tag).push(name);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.localeCompare(b));
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [tags]);

  const totalCount = Object.keys(tags).length;
  if (totalCount === 0) return null;

  return (
    <div className="grouped-tag-list">
      <div className="tagged-list-label">
        {totalCount.toLocaleString()} {itemLabel}{totalCount === 1 ? "" : "s"} tagged, grouped below
      </div>
      {groups.map(([tag, names]) => {
        const isOpen = openGroup === tag;
        const color = colorFn(tag);
        const filtered =
          isOpen && groupSearch.trim()
            ? names.filter((n) => n.toLowerCase().includes(groupSearch.trim().toLowerCase()))
            : names;
        return (
          <div className="tag-group" key={tag}>
            <button
              className="tag-group-header"
              onClick={() => {
                setOpenGroup(isOpen ? null : tag);
                setGroupSearch("");
              }}
            >
              <span className="tag-group-name">
                <span className="sw" style={{ background: color }} />
                {tag}
              </span>
              <span className="tag-group-meta">
                {names.length.toLocaleString()}
                <span className={`accordion-chevron${isOpen ? " open" : ""}`}>⌄</span>
              </span>
            </button>
            {isOpen && (
              <div className="tag-group-body">
                {names.length > 20 && (
                  <input
                    className="tag-group-search"
                    type="text"
                    placeholder={`Search within ${tag}…`}
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    autoFocus
                  />
                )}
                <div className="tag-group-items">
                  {filtered.slice(0, 500).map((name) => (
                    <div className="tag-group-item" key={name}>
                      <span>{name}</span>
                      <button className="mood-x" aria-label={`Remove ${name}`} onClick={() => onRemove(name)}>×</button>
                    </div>
                  ))}
                  {filtered.length > 500 && (
                    <div className="tag-group-more">
                      …and {(filtered.length - 500).toLocaleString()} more — narrow your search to see them
                    </div>
                  )}
                  {filtered.length === 0 && (
                    <div className="tag-group-more">No matches in this group.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
