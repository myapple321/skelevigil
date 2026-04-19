import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getPrivacyMaskingEnabled,
  setPrivacyMaskingEnabled as persistPrivacyMasking,
} from '@/src/preferences/privacyMaskingPreference';

type PrivacyMaskingContextValue = {
  privacyMaskingEnabled: boolean;
  setPrivacyMaskingEnabled: (enabled: boolean) => Promise<void>;
  hydrated: boolean;
};

const PrivacyMaskingContext = createContext<PrivacyMaskingContextValue | null>(null);

export function PrivacyMaskingProvider({ children }: { children: ReactNode }) {
  const [privacyMaskingEnabled, setPrivacyMaskingEnabledState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void getPrivacyMaskingEnabled().then((v) => {
      setPrivacyMaskingEnabledState(v);
      setHydrated(true);
    });
  }, []);

  const setPrivacyMaskingEnabled = useCallback(async (enabled: boolean) => {
    setPrivacyMaskingEnabledState(enabled);
    await persistPrivacyMasking(enabled);
  }, []);

  const value = useMemo(
    () => ({ privacyMaskingEnabled, setPrivacyMaskingEnabled, hydrated }),
    [privacyMaskingEnabled, setPrivacyMaskingEnabled, hydrated],
  );

  return (
    <PrivacyMaskingContext.Provider value={value}>{children}</PrivacyMaskingContext.Provider>
  );
}

export function usePrivacyMasking(): PrivacyMaskingContextValue {
  const ctx = useContext(PrivacyMaskingContext);
  if (!ctx) {
    throw new Error('usePrivacyMasking must be used within PrivacyMaskingProvider');
  }
  return ctx;
}
