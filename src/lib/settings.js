// Both external calls (Last.fm, Claude) use a bring-your-own-key
// pattern — keys live in localStorage on this machine only and are
// never sent anywhere except the respective API.

const LASTFM_KEY = "scrobble-lastfm-api-key";
const ANTHROPIC_KEY = "scrobble-anthropic-api-key";

export function getLastfmKey() {
  try {
    return localStorage.getItem(LASTFM_KEY) || "";
  } catch {
    return "";
  }
}
export function setLastfmKey(key) {
  try {
    localStorage.setItem(LASTFM_KEY, key);
  } catch {
    // not fatal
  }
}

export function getAnthropicKey() {
  try {
    return localStorage.getItem(ANTHROPIC_KEY) || "";
  } catch {
    return "";
  }
}
export function setAnthropicKey(key) {
  try {
    localStorage.setItem(ANTHROPIC_KEY, key);
  } catch {
    // not fatal
  }
}

const CUSTOM_INSTRUCTIONS_KEY = "scrobble-custom-insight-instructions";

export function getCustomInstructions() {
  try {
    return localStorage.getItem(CUSTOM_INSTRUCTIONS_KEY) || "";
  } catch {
    return "";
  }
}
export function setCustomInstructions(text) {
  try {
    localStorage.setItem(CUSTOM_INSTRUCTIONS_KEY, text);
  } catch {
    // not fatal
  }
}
