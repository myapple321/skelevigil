import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getSfxEnabled, setSfxEnabled as persistSfxEnabled } from '@/src/preferences/sfxPreference';

type SfxPreferenceContextValue = {
  sfxEnabled: boolean;
  setSfxEnabled: (enabled: boolean) => Promise<void>;
  hydrated: boolean;
};

const SfxPreferenceContext = createContext<SfxPreferenceContextValue | null>(null);

export function SfxPreferenceProvider({ children }: { children: ReactNode }) {
  const [sfxEnabled, setSfxEnabledState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void getSfxEnabled().then((v) => {
      setSfxEnabledState(v);
      setHydrated(true);
    });
  }, []);

  const setSfxEnabled = useCallback(async (enabled: boolean) => {
    setSfxEnabledState(enabled);
    await persistSfxEnabled(enabled);
  }, []);

  const value = useMemo(
    () => ({ sfxEnabled, setSfxEnabled, hydrated }),
    [sfxEnabled, setSfxEnabled, hydrated],
  );

  return <SfxPreferenceContext.Provider value={value}>{children}</SfxPreferenceContext.Provider>;
}

export function useSfxPreference(): SfxPreferenceContextValue {
  const ctx = useContext(SfxPreferenceContext);
  if (!ctx) {
    throw new Error('useSfxPreference must be used within SfxPreferenceProvider');
  }
  return ctx;
}
