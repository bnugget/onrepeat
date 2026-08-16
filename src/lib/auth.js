import { supabase } from "./supabaseClient.js";

const EMAIL_DOMAIN = "users.local";

/** Usernames become "username@users.local" for auth purposes only —
 *  never shown in the UI, no real inbox involved. Normalized to
 *  lowercase so "Bryan" and "bryan" can't register as two accounts. */
function usernameToEmail(username) {
  const normalized = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return `${normalized}@${EMAIL_DOMAIN}`;
}

export function isValidUsername(username) {
  const normalized = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return normalized.length >= 3 && normalized.length <= 30;
}

export async function signUp(username, password) {
  if (!isValidUsername(username)) {
    throw new Error("Username should be 3-30 characters (letters, numbers, _ or - only).");
  }
  const email = usernameToEmail(username);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username: username.trim() } }
  });
  if (error) {
    if (error.message?.toLowerCase().includes("already registered")) {
      throw new Error("That username is taken — try signing in instead, or pick another.");
    }
    throw error;
  }
  return data;
}

export async function signIn(username, password) {
  const email = usernameToEmail(username);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error("Wrong username or password.");
  }
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function getDisplayName(user) {
  return user?.user_metadata?.username || user?.email?.split("@")[0] || "you";
}

export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  return () => data.subscription.unsubscribe();
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}
