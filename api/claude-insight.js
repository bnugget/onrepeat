// Vercel serverless function (Node.js runtime). Deployed automatically
// at /api/claude-insight since Vercel treats any file in /api as a route.
//
// This exists so the app's users don't need their own Anthropic API
// key — the real key lives ONLY here, as a server-side environment
// variable (set in Vercel's dashboard WITHOUT the VITE_ prefix, so it
// is never bundled into client-side JS). The browser never sees it.
//
// Gated behind Supabase auth so this can't be hit anonymously by
// anyone who finds the URL — not a strong guarantee given signup has
// no email confirmation, but a meaningful speed bump over a
// completely open endpoint.
import { createClient } from "@supabase/supabase-js";

const MODEL = "claude-haiku-4-5-20251001";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ error: "Server is missing Supabase configuration." });
    return;
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    res.status(401).json({ error: "Invalid or expired session." });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is not configured with an Anthropic API key." });
    return;
  }

  const { prompt, maxTokens } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Missing prompt." });
    return;
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens || 1500,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.json().catch(() => ({}));
      res.status(anthropicRes.status).json({ error: errBody?.error?.message || `Claude API error (${anthropicRes.status})` });
      return;
    }

    const data = await anthropicRes.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || "Request to Claude failed." });
  }
}
