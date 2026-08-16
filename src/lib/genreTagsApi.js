import { supabase } from "./supabaseClient.js";

/** Supabase caps any single .select() at 1000 rows by default (a
 *  PostgREST setting) — silently, no error, just a truncated result.
 *  Paginates through the full table in batches instead, so this
 *  keeps working correctly no matter how large genre_tags grows. */
export async function fetchAllGenreTags() {
  const pageSize = 1000;
  const obj = {};
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("genre_tags")
      .select("artist_name, genre")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    for (const row of data) obj[row.artist_name] = row.genre;
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return obj;
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

export async function upsertGenreTag(artistName, genre) {
  const userId = await currentUserId();
  const { error } = await supabase.from("genre_tags").upsert({
    artist_name: artistName,
    genre,
    tagged_by: userId,
    updated_at: new Date().toISOString()
  });
  if (error) throw error;
}

/** Bulk upsert — used both for the Last.fm auto-fetch importer and
 *  for pushing up whatever local tags weren't in Supabase yet on
 *  first sync. Chunked since Supabase has a practical payload limit
 *  per request. */
export async function upsertGenreTagsBatch(tagsObj) {
  const userId = await currentUserId();
  const nowIso = new Date().toISOString();
  const rows = Object.entries(tagsObj).map(([artist_name, genre]) => ({
    artist_name,
    genre,
    tagged_by: userId,
    updated_at: nowIso
  }));
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const { error } = await supabase.from("genre_tags").upsert(rows.slice(i, i + chunkSize));
    if (error) throw error;
  }
}

export async function deleteGenreTagRemote(artistName) {
  const { error } = await supabase.from("genre_tags").delete().eq("artist_name", artistName);
  if (error) throw error;
}
