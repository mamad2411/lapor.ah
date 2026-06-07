const STORAGE_KEY = "diskusi_voter_key";

export function getVoterKey(): string {
  if (typeof window === "undefined") return "";
  let key = localStorage.getItem(STORAGE_KEY);
  if (!key) {
    key = `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(STORAGE_KEY, key);
  }
  return key;
}
