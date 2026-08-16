import { supabase } from "./supabaseClient.js";

const BUCKET = "profile-data";

/** All profiles visible to any signed-in user (RLS: select is open,
 *  write is owner-only) — this is what powers both the profile
 *  switcher and the Compare Profiles picker. */
export async function listProfiles() {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getProfileData(storagePath) {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error) throw error;
  const text = await data.text();
  return JSON.parse(text);
}

function dateRangeOf(profileData) {
  let min = Infinity;
  let max = -Infinity;
  for (const d of profileData.eventDate) {
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { min, max };
}

export async function createProfile(userId, name, profileData) {
  const profileId = crypto.randomUUID();
  const storagePath = `${userId}/${profileId}.json`;
  const blob = new Blob([JSON.stringify(profileData)], { type: "application/json" });

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, blob, { upsert: true });
  if (uploadError) throw uploadError;

  const { min, max } = dateRangeOf(profileData);
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: profileId,
      owner_id: userId,
      name: name.trim(),
      storage_path: storagePath,
      event_count: profileData.eventDate.length,
      artist_count: profileData.artistNames.length,
      date_range_start: min,
      date_range_end: max
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Re-upload a newer export to an EXISTING profile — same identity,
 *  refreshed data, for "come back later with more history" use. */
export async function refreshProfileData(profile, profileData) {
  const blob = new Blob([JSON.stringify(profileData)], { type: "application/json" });
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(profile.storage_path, blob, { upsert: true });
  if (uploadError) throw uploadError;

  const { min, max } = dateRangeOf(profileData);
  const { error } = await supabase
    .from("profiles")
    .update({
      event_count: profileData.eventDate.length,
      artist_count: profileData.artistNames.length,
      date_range_start: min,
      date_range_end: max
    })
    .eq("id", profile.id);
  if (error) throw error;
}

export async function deleteProfile(profile) {
  await supabase.storage.from(BUCKET).remove([profile.storage_path]);
  const { error } = await supabase.from("profiles").delete().eq("id", profile.id);
  if (error) throw error;
}
