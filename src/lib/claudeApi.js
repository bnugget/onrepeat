// Two paths to Claude:
// 1. BYOK — if the person has set their own key (rare now, kept as a
//    fallback for local dev and anyone who prefers it), call
//    Anthropic directly from the browser using the direct-browser-
//    access header. https://docs.claude.com/en/api/overview
// 2. Shared proxy (default) — no personal key needed. Calls our own
//    /api/claude-insight serverless function, which holds the real
//    key server-side and forwards the request. This only works once
//    deployed to Vercel (or run via `vercel dev` locally) — plain
//    `npm run dev` doesn't serve /api routes.
import { supabase } from "./supabaseClient.js";

const MODEL = "claude-haiku-4-5-20251001"; // fast + cheap, plenty for a short summary

function extractText(data) {
  const textBlock = data.content?.find((b) => b.type === "text");
  const text = textBlock?.text?.trim() || "";
  if (data.stop_reason === "max_tokens") {
    return text + "\n\n(Response cut off — this ran long. Try narrowing the date range or asking for fewer eras at once.)";
  }
  return text;
}

async function callClaude(prompt, apiKey) {
  if (apiKey) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `Claude API error (${res.status})`);
    }
    return extractText(await res.json());
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    throw new Error("You need to be signed in to generate an insight.");
  }
  const res = await fetch("/api/claude-insight", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error || `Insight request failed (${res.status})`);
  }
  return extractText(await res.json());
}

export async function generateInsight(context, apiKey, customInstructions) {
  const customBlock = customInstructions && customInstructions.trim()
    ? `\n\nThe person has given specific instructions for this analysis — follow them closely, even if it means departing from the default format below: "${customInstructions.trim()}"`
    : "";

  const prompt = `You are a sharp, concise data analyst annotating someone's personal Last.fm listening history. Given this JSON summary of their data, default to this format: one short lead sentence, then 2-4 bullet points (each starting with "- ") covering the most specific, concrete patterns you can find — reference actual numbers and artist names. Use **bold** sparingly on the single most important number or name per bullet.

The person may instead ask for something structural, like "top 25 artists from my Ash era" or "rank every era by total plays" — when they do, drop the default format entirely and answer with the actual requested list or table (numbered list, e.g. "1. Drake — 271 plays"), pulling from context.topArtists (up to 30 entries per range) or context.eras[].topArtists. If they ask for more items than context has, use everything available and say so in one line rather than inventing entries.

If context.eras is present with 2+ entries, each era has its own independently-computed totals, top artists, and mood/genre breakdowns — be ready to directly compare eras by name (e.g. contrast what dominated one era vs another) rather than just listing each in isolation. If context.excludedArtists is present, those artists have already been removed from every number here — don't mention them unless the person's custom instructions ask about them specifically.${customBlock}

Output only the requested content — lead sentence and bullets, or the list/table if asked for one — no headers, no preamble, no closing summary.

Data:
${JSON.stringify(context, null, 2)}`;

  return callClaude(prompt, apiKey);
}

export async function generateComparisonReport(context, apiKey, customInstructions) {
  const customBlock = customInstructions && customInstructions.trim()
    ? `\n\nThe person has given specific instructions for this report — follow them closely: "${customInstructions.trim()}"`
    : "";

  const prompt = `You are a music data analyst and pop-culture writer producing a short "compatibility report" comparing two people's listening histories — genuinely insightful, not generic horoscope-style filler. Given this JSON data (similarity score, shared-artist contributors, most-polarizing artists, artists unique to each person, and genre breakdowns), write EXACTLY four sections, each starting with its own line "## Title" (use these exact four titles, in this order):

## Summary
2-3 sentences on the big picture: how similar or different their taste is overall, and the single most interesting or surprising thing in the data.

## Artist Overlap & Differences
A short paragraph plus 2-3 bullet points (each starting with "- "). Name specific shared artists that matter most (from topContributors), and specific artists that are most polarizing or unique to one person (from mostDifferent, onlyA, onlyB) — with real numbers.

## Genre Overlap & Differences
A short paragraph plus 1-2 bullets on how their genre profiles compare — name specific genres and percentages, where they overlap and where they diverge.

## Taste Match Verdict
A fun, witty, specific verdict on whether these two are a "music taste match" — give it a short punchy label (like a headline, e.g. "Certified Bangers Duo" or "Respectfully Different Wavelengths") in **bold**, then 1-2 sentences of justification grounded in the actual data, not vague flattery.

Reference real artist names, genre names, and numbers throughout — every section should feel earned from the data, not generic. Total length across all four sections: roughly 300-400 words. Use **bold** sparingly for the single most important name or number per section.${customBlock}

Data:
${JSON.stringify(context, null, 2)}`;

  return callClaude(prompt, apiKey);
}

export function parseReportSections(text) {
  const lines = text.split("\n");
  const sections = [];
  let current = null;
  for (const line of lines) {
    const match = line.match(/^##\s+(.+)/);
    if (match) {
      current = { title: match[1].trim(), body: [] };
      sections.push(current);
    } else if (current) {
      current.body.push(line);
    }
  }
  return sections.map((s) => ({ title: s.title, body: s.body.join("\n").trim() }));
}

export async function generateComparisonInsight(comparison, apiKey, customInstructions) {
  const customBlock = customInstructions && customInstructions.trim()
    ? `\n\nThe person has given specific instructions for this comparison — follow them closely: "${customInstructions.trim()}"`
    : "";

  const prompt = `You are a sharp, fun data analyst comparing two people's music listening histories for a friend group's own amusement. Given this JSON summary of both people's top artists, shared artists, and each one's unique picks — computed over ${comparison.dateRangeLabel}, counting only artists either person has played at least ${comparison.minPlaysThreshold} times — write: one short lead sentence characterizing how similar or different their taste is, then 2-4 bullet points with specific, concrete observations — name actual shared artists, name what's distinctly one person's thing and not the other's, and reference real numbers. Mention the date range naturally if it's not "all time" rather than assuming this covers their whole history. Use **bold** sparingly on the most interesting name or number per bullet. Keep the tone light and a little playful — this is for fun, not a formal report.${customBlock}

Output only the lead sentence and bullets, no headers, no preamble, no closing summary.

Data:
${JSON.stringify(comparison, null, 2)}`;

  return callClaude(prompt, apiKey);
}
