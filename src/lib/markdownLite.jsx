import React from "react";

/** Split a line on **bold** spans and return an array of strings/<b> nodes. */
function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <b key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</b>;
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>;
  });
}

/**
 * Minimal markdown -> JSX: supports paragraphs, "- " / "* " bullet
 * lists, "1. " numbered lists, and **bold** inline spans. Enough for
 * a short AI-generated insight without pulling in a markdown
 * dependency.
 */
export function renderMarkdownLite(text) {
  if (!text) return null;
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  const blocks = [];
  let currentList = null;
  let currentListType = null;

  for (const line of lines) {
    const bulletMatch = /^[-*]\s+(.*)/.exec(line);
    const numberedMatch = /^\d+[.)]\s+(.*)/.exec(line);
    const match = bulletMatch || numberedMatch;
    const type = bulletMatch ? "ul" : numberedMatch ? "ol" : null;

    if (match) {
      if (!currentList || currentListType !== type) {
        currentList = [];
        currentListType = type;
        blocks.push({ type, items: currentList });
      }
      currentList.push(match[1]);
    } else {
      currentList = null;
      currentListType = null;
      blocks.push({ type: "p", text: line.replace(/^#+\s*/, "") }); // strip stray markdown headers
    }
  }

  return blocks.map((block, i) => {
    if (block.type === "ul" || block.type === "ol") {
      const Tag = block.type;
      return (
        <Tag className="insight-list" key={i}>
          {block.items.map((item, j) => (
            <li key={j}>{renderInline(item, `${i}-${j}`)}</li>
          ))}
        </Tag>
      );
    }
    return <p key={i}>{renderInline(block.text, `${i}`)}</p>;
  });
}
