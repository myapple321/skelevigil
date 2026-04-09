import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  DEFAULT_VAULT_PROGRESS,
  FREE_MISSION_CREDIT_ALLOWANCE,
  getVaultProgress,
  setVaultProgress,
  type VaultProgress,
} from '@/src/preferences/vaultProgress';

type VaultProgressContextValue = {
  progress: VaultProgress;
  hydrated: boolean;
  recordGlimpseSuccess: () => void;
  recordGlimpseFailure: () => void;
  debugBuyThreeVaultCredits: () => void;
};

const VaultProgressContext = createContext<VaultProgressContextValue | null>(null);

export function VaultProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<VaultProgress>(DEFAULT_VAULT_PROGRESS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void getVaultProgress().then((loaded) => {
      setProgress(loaded);
      setHydrated(true);
    });
  }, []);

  const updateProgress = useCallback((updater: (prev: VaultProgress) => VaultProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      void setVaultProgress(next);
      return next;
    });
  }, []);

  const recordGlimpseSuccess = useCallback(() => {
    updateProgress((prev) => {
      const successfulMissions = prev.successfulMissions + 1;
      return {
        ...prev,
        successfulMissions,
        creditsTowardFreeMission: Math.max(0, FREE_MISSION_CREDIT_ALLOWANCE - successfulMissions),
      };
    });
  }, [updateProgress]);

  const recordGlimpseFailure = useCallback(() => {
    updateProgress((prev) => ({
      ...prev,
      attemptsLeft: {
        ...prev.attemptsLeft,
        glimpse: Math.max(0, prev.attemptsLeft.glimpse - 1),
      },
    }));
  }, [updateProgress]);

  const debugBuyThreeVaultCredits = useCallback(() => {
    updateProgress((prev) => ({
      ...prev,
      attemptsLeft: {
        ...prev.attemptsLeft,
        glimpse: prev.attemptsLeft.glimpse + 3,
      },
    }));
  }, [updateProgress]);

  const value = useMemo(
    () => ({
      progress,
      hydrated,
      recordGlimpseSuccess,
      recordGlimpseFailure,
      debugBuyThreeVaultCredits,
    }),
    [progress, hydrated, recordGlimpseSuccess, recordGlimpseFailure, debugBuyThreeVaultCredits],
  );

  return <VaultProgressContext.Provider value={value}>{children}</VaultProgressContext.Provider>;
}

export function useVaultProgress(): VaultProgressContextValue {
  const ctx = useContext(VaultProgressContext);
  if (!ctx) {
    throw new Error('useVaultProgress must be used within VaultProgressProvider');
  }
  return ctx;
}
