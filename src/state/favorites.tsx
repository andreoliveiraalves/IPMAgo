import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { readJson, storageKeys, writeJson } from '@/storage/storage';

type FavoritesValue = {
  /** Favorite `globalIdLocal` values, in the order they were added. */
  ids: number[];
  /** False until the persisted list has been read. */
  ready: boolean;
  isFavorite: (globalIdLocal: number) => boolean;
  add: (globalIdLocal: number) => void;
  remove: (globalIdLocal: number) => void;
  toggle: (globalIdLocal: number) => void;
  /**
   * Moves a favorite to the front of the list. The first favorite is what the
   * home-screen widget follows, so this is the user-facing way to choose it.
   */
  moveToTop: (globalIdLocal: number) => void;
};

const FavoritesContext = createContext<FavoritesValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    readJson<number[]>(storageKeys.favorites).then((stored) => {
      if (!active) {
        return;
      }

      if (Array.isArray(stored)) {
        setIds(stored.filter((id) => Number.isFinite(id)));
      }
      setReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    void writeJson(storageKeys.favorites, ids);
  }, [ids, ready]);

  const add = useCallback((globalIdLocal: number) => {
    setIds((current) => (current.includes(globalIdLocal) ? current : [...current, globalIdLocal]));
  }, []);

  const remove = useCallback((globalIdLocal: number) => {
    setIds((current) => current.filter((id) => id !== globalIdLocal));
  }, []);

  const moveToTop = useCallback((globalIdLocal: number) => {
    setIds((current) =>
      current[0] === globalIdLocal
        ? current
        : [globalIdLocal, ...current.filter((id) => id !== globalIdLocal)]
    );
  }, []);

  const toggle = useCallback((globalIdLocal: number) => {
    setIds((current) =>
      current.includes(globalIdLocal)
        ? current.filter((id) => id !== globalIdLocal)
        : [...current, globalIdLocal]
    );
  }, []);

  const value = useMemo<FavoritesValue>(
    () => ({
      ids,
      ready,
      isFavorite: (globalIdLocal) => ids.includes(globalIdLocal),
      add,
      remove,
      toggle,
      moveToTop,
    }),
    [ids, ready, add, remove, toggle, moveToTop]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesValue {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error('useFavorites must be used inside <FavoritesProvider>');
  }

  return context;
}
