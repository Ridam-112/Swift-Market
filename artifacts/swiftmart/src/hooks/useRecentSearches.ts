import { useState, useCallback, useEffect } from "react";

const MAX_RECENT = 8;

function storageKey(userId?: string | number) {
  return userId ? `sm_recent_searches_${userId}` : "sm_recent_searches_guest";
}

function read(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, items: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {}
}

export function useRecentSearches(userId?: string | number) {
  const key = storageKey(userId);
  const [searches, setSearches] = useState<string[]>(() => read(key));

  // Re-sync if userId changes (e.g., after login)
  useEffect(() => {
    setSearches(read(storageKey(userId)));
  }, [userId]);

  const addSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed || trimmed.length < 2) return;
      setSearches((prev) => {
        const deduped = [trimmed, ...prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(
          0,
          MAX_RECENT
        );
        write(storageKey(userId), deduped);
        return deduped;
      });
    },
    [userId]
  );

  const removeSearch = useCallback(
    (term: string) => {
      setSearches((prev) => {
        const next = prev.filter((s) => s !== term);
        write(storageKey(userId), next);
        return next;
      });
    },
    [userId]
  );

  const clearAll = useCallback(() => {
    write(storageKey(userId), []);
    setSearches([]);
  }, [userId]);

  return { searches, addSearch, removeSearch, clearAll };
}
