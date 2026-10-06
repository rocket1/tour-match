import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { RankedTour } from "./types";

const SAVED_KEY = "tourmatch.saved.v1";
const RECENT_KEY = "tourmatch.recent.v1";

interface Store {
  saved: RankedTour[];
  isSaved: (id: string) => boolean;
  toggleSaved: (tour: RankedTour) => void;
  recent: string[];
  addRecent: (prompt: string) => void;
  clearRecent: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<RankedTour[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, r] = await Promise.all([AsyncStorage.getItem(SAVED_KEY), AsyncStorage.getItem(RECENT_KEY)]);
        if (s) setSaved(JSON.parse(s));
        if (r) setRecent(JSON.parse(r));
      } catch {
        // Corrupt or unavailable storage: start empty.
      }
    })();
  }, []);

  const persist = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});

  const toggleSaved = useCallback((tour: RankedTour) => {
    setSaved((prev) => {
      const next = prev.some((t) => t.id === tour.id) ? prev.filter((t) => t.id !== tour.id) : [tour, ...prev];
      persist(SAVED_KEY, next);
      return next;
    });
  }, []);

  const addRecent = useCallback((prompt: string) => {
    setRecent((prev) => {
      const next = [prompt, ...prev.filter((p) => p !== prompt)].slice(0, 8);
      persist(RECENT_KEY, next);
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    persist(RECENT_KEY, []);
  }, []);

  const value = useMemo<Store>(
    () => ({
      saved,
      isSaved: (id) => saved.some((t) => t.id === id),
      toggleSaved,
      recent,
      addRecent,
      clearRecent,
    }),
    [saved, recent, toggleSaved, addRecent, clearRecent],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
